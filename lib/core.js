import Binding from './binding.js';
import ChannelManager from './channels.js';
import { Component, ReactivityManager } from './component.js';
import EventManager from './events.js';
import {
  AttrsReflection,
  ChildrenReflection,
  EventsReflection,
  InlineStyleReflection,
  PropsReflection,
  Reflector,
  TextReflection,
} from './reflection.js';
import Renderer from './renderer.js';
import Reporter from './reporter.js';
import Styler from './styler.js';
import { createMacroTaskRunner, isObject } from './utils.js';

class BaseContext {
  parent;
  schema;
  binding;
  renderer;

  constructor(schema, parent) {
    this.parent = parent;
    this.schema = schema;
  }

  init(compiler) {
    this.binding = new Binding(this.schema, compiler.webApi);
    this.renderer = new Renderer(this, compiler);
    return this;
  }

  destroy() {
    this.renderer.remove();
  }
}

class ContextSegments extends Array {
  async init(contextFactory, context) {
    const children = context.schema.children || [];
    if (typeof children === 'function') {
      this[0] = await contextFactory.createContext(children, context);
      return this;
    }
    for (let i = 0; i < children.length; ++i) {
      const input = children[i];
      const result = await contextFactory.createContext(input, context);
      let segment;
      if (Array.isArray(result)) segment = result;
      else if (result) segment = [result];
      else segment = [];
      this[i] = segment;
    }
    return this;
  }

  getAnchorContext(index) {
    const segment = this[index];
    if (!segment) return null;
    const context = segment[segment.length - 1];
    if (context) return context;
    return this.getAnchorContext(--index);
  }
}

class Context extends BaseContext {
  // Future default options
  static config = {};
  config;
  component = new Component(this);
  children = new ContextSegments([]);
  reactivityManager = new ReactivityManager(this);
  eventManager;
  channelManager;

  constructor(schema, parent) {
    super(schema, parent);
    this.config = schema.config || Context.config;
  }

  init(compiler) {
    super.init(compiler);
    this.eventManager = new EventManager(this);
    this.channelManager = new ChannelManager(this.component);
    this.#createReflection();
    this.reactivityManager.registerReactivity();
    return this;
  }

  destroy() {
    super.destroy();
    this.cleanUp();
    this.#callDestroyHook();
  }

  cleanUp() {
    this.reactivityManager.removeReactivity();
    if (this.channelManager) this.channelManager.clearAllChannels();
    for (const segment of this.children) {
      for (const context of segment) {
        if (context.cleanUp) context.cleanUp();
        this.#callDestroyHook(context);
      }
    }
  }

  #callDestroyHook(context = this) {
    const destroy = context.component?.hooks.destroy;
    if (destroy) destroy.call(context.component);
  }

  #createReflection() {
    const { component, binding } = this;
    Reflector.reflect([
      new TextReflection(component, binding),
      new InlineStyleReflection(component.attrs, binding),
      new AttrsReflection(component, binding),
      new PropsReflection(component, binding),
      new EventsReflection(component, binding, this.eventManager),
      new ChildrenReflection(this),
    ]);
  }
}

class ContextFactory {
  static #moduleCache = {};
  #compiler;

  constructor(compiler) {
    this.#compiler = compiler;
  }

  static async #loadSchema(schemaLoader) {
    const { path, base, args } = schemaLoader;
    const cache = this.#moduleCache;
    let url = path.endsWith('.js') ? path : `${path}.js`;
    if (base) url = new URL(url, base);
    const cached = cache[url];
    let module;
    if (cached) module = cached;
    else module = cache[url] = await import(url);
    return module.default(args);
  }

  static #validateInput(input) {
    const error = (option) => (
      Reporter.error('BadSchemaInput', { option, input })
    );
    const has = Object.prototype.hasOwnProperty.bind(input);
    const isObj = isObject(input) && !Array.isArray(input);
    const isPoor = isObj && !has('path') && !has('tag');
    if (isPoor) throw error('poor');
    const isConflict = has('text') && has('children');
    if (isConflict) throw error('conflict');
    return input;
  }

  async createContext(input, parent, recurrent = []) {
    if (!input) return false;
    if (typeof input === 'string') return new BaseContext(input, parent);
    if (input.path) input = await ContextFactory.#loadSchema(input);
    if (typeof input === 'function') {
      let reactiveInput;
      if (input === parent.schema.children) {
        reactiveInput = parent.reactivityManager.registerChildren();
      } else {
        const index = parent.schema.children.indexOf(input);
        reactiveInput = parent.reactivityManager.registerChild(index, input);
      }
      return this.createContext(reactiveInput, parent, recurrent);
    }
    if (Array.isArray(input)) {
      const recur = (nested) => this.createContext(nested, parent, recurrent);
      const recurred = await Promise.all(input.map(recur));
      const contexts = recurred.filter(
        (schema) => schema && !Array.isArray(schema),
      );
      recurrent.push(...contexts);
      return recurrent;
    }
    const schema = ContextFactory.#validateInput(input);
    return new Context(schema, parent);
  }

  async *generateContexts(input, parent) {
    if (!input) return;
    const root = await this.createContext(input, parent);
    const stack = Array.isArray(root) ? root.reverse() : [root];
    while (stack.length > 0) {
      const context = stack.pop().init(this.#compiler);
      await this.#initSegments(context, stack);
      yield context;
    }
  }

  async #initSegments(context, stack) {
    if (!context.schema.children) return;
    const segments = await context.children.init(this, context);
    for (let i = segments.length - 1; i >= 0; --i) {
      const segment = segments[i];
      for (let j = segment.length - 1; j >= 0; --j) {
        const context = segment[j];
        if (context) stack.push(context);
      }
    }
  }
}

export default class SchemaCompiler {
  #contextFactory = new ContextFactory(this);
  styler;
  webApi;

  constructor(webApi) {
    this.styler = new Styler(webApi);
    this.webApi = webApi;
  }

  async start(input, parent) {
    const generator = this.#contextFactory.generateContexts(input, parent);
    const { value: root } = await generator.next();
    return { root, generator };
  }

  async *proceed({ root, generator }) {
    const runMacroTask = createMacroTaskRunner();
    const components = [];
    if (root.component?.hooks.init) components.push(root.component);
    for await (const context of generator) {
      context.renderer.render();
      const component = context.component;
      if (component?.hooks.init) components.push(component);
      yield context;
      await runMacroTask();
    }
    for (const component of components) {
      await runMacroTask();
      await component.hooks.init.call(component);
    }
  }

  async finalize({ root, generator }) {
    const treeGen = this.proceed({ root, generator });
    let done = false;
    while (!done) done = (await treeGen.next()).done || false;
  }
}
