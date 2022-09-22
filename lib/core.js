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
import { createMacroTaskRunner, drainGenerator, isObject } from './utils.js';

class BaseContext {
  parent;
  schema;
  moduleUrl;
  styler;
  renderer;
  binding;

  constructor(schema, parent, moduleUrl) {
    this.parent = parent;
    this.schema = schema;
    this.moduleUrl = moduleUrl;
  }

  init(compiler) {
    this.styler = new Styler(compiler.webApi, this);
    this.renderer = new compiler.RendererType(this);
    this.binding = this.renderer.binding;
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
  component = new Component(this);
  children = new ContextSegments([]);
  reactivityManager = new ReactivityManager(this);
  eventManager;
  channelManager;

  init(compiler) {
    const loader = compiler.loader;
    super.init(compiler);
    this.eventManager = new EventManager(this);
    this.channelManager = new ChannelManager(this.component, loader);
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
  #compiler;

  constructor(compiler) {
    this.#compiler = compiler;
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
    let moduleUrl = parent?.moduleUrl;
    if (typeof input === 'string') return new BaseContext(input, parent, moduleUrl);
    const loader = this.#compiler.loader;
    if (input.path) ({ moduleUrl, input } = await loader.loadSchema(input));
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
    return new Context(schema, parent, moduleUrl);
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
  #RendererType;
  webApi;
  loader;

  constructor(webApi, loader) {
    this.webApi = webApi;
    this.loader = loader;
    this.setDefaultRenderer();
  }

  get RendererType() {
    return this.#RendererType;
  }

  setRendererType(RendererType) {
    this.#RendererType = RendererType.bind(null, this);
  }

  setDefaultRenderer() {
    this.setRendererType(Renderer);
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
      await runMacroTask();
      const component = context.component;
      if (component?.hooks.init) components.push(component);
      yield context;
      context.renderer.render();
    }
    for (const component of components) {
      await runMacroTask();
      await component.hooks.init.call(component);
    }
  }

  async finalize(compilation) {
    const treeGenerator = this.proceed(compilation);
    await drainGenerator(treeGenerator);
  }
}
