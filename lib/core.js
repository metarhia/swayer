import {
  ElementBinding,
  ExistingElementBinding,
  TextBinding,
} from './binding.js';
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
import { isObject } from './utils.js';

class BaseContext {
  #webApi;
  parent;
  schema;
  component;
  binding;
  renderer;

  constructor(schema, parent) {
    this.parent = parent;
    this.schema = schema;
    this.component = new Component(this);
  }

  init(compiler, element) {
    this.#webApi = compiler.webApi;
    this.renderer = new Renderer(this, compiler);
    this.binding = this.#createBinding(element);
    return this;
  }

  destroy() {
    this.renderer.remove();
  }

  #createBinding(element) {
    if (element) {
      return new ExistingElementBinding(this.schema, element, this.#webApi);
    }
    if (typeof this.schema === 'string') {
      return new TextBinding(this.schema, this.#webApi);
    }
    return new ElementBinding(this.schema, this.#webApi);
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
  eventManager;
  channelManager;
  reactivityManager = new ReactivityManager(this);
  children = new ContextSegments([]);

  constructor(schema, parent) {
    super(schema, parent);
    this.config = schema.config || Context.config;
  }

  init(compiler, element) {
    super.init(compiler, element);
    this.#createEventManager();
    this.#createChannelManager();
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
    this.channelManager.clearAllChannels(this.component.channels);
    for (const segment of this.children) {
      for (const context of segment) {
        if (context.cleanUp) context.cleanUp();
        this.#callDestroyHook(context);
      }
    }
  }

  #callDestroyHook(context = this) {
    const destroy = context.component.hooks.destroy;
    if (destroy) destroy.call(context.component);
  }

  #createEventManager() {
    this.eventManager = new EventManager(this.binding);
    this.eventManager.setEventsContext(this.component);
    this.eventManager.setEvents(this.component.events);
  }

  #createChannelManager() {
    this.channelManager = new ChannelManager();
    this.channelManager.setChannelsContext(this.component);
    this.channelManager.bindAllChannels(this.component.channels);
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
    if (typeof input === 'string') return new BaseContext(input, parent);
    if (input.path) input = await this.#compiler.loadSchema(input);
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

  async *generate(input, parent) {
    if (!input) return;
    const stack = await this.#createStack(input, parent);
    while (stack.length > 0) {
      const context = stack.pop().init(this.#compiler, null);
      await this.#pushChildren(context, stack);
      yield context;
    }
  }

  async *generateExisting(input, parent) {
    if (!input) return;
    const stack = await this.#createStack(input, parent);
    while (stack.length > 0) {
      const context = stack.pop();
      const element = yield context.schema;
      context.init(this.#compiler, element);
      await this.#pushChildren(context, stack);
      yield context;
    }
  }

  async #createStack(rootInput, parent) {
    const rootContext = await this.createContext(rootInput, parent);
    return Array.isArray(rootContext) ? rootContext : [rootContext];
  }

  async #pushChildren(context, stack) {
    if (context.schema.children) {
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
}

export class SchemaCompiler {
  static #moduleCache = {};
  webApi;
  styler;
  contextFactory;

  constructor(webApi) {
    this.webApi = webApi;
    this.styler = new Styler(webApi);
    this.contextFactory = new ContextFactory(this);
  }

  async start(input, parent) {
    const generator = this.contextFactory.generate(input, parent);
    const { value: root } = await generator.next();
    return { root, generator };
  }

  async *proceed({ root, generator }) {
    const runMacroTask = this.createMacroTasks();
    const components = [];
    if (root.component.hooks.init) components.push(root.component);
    for await (const context of generator) {
      context.renderer.render();
      const component = context.component;
      if (component.hooks.init) components.push(component);
      yield context;
      await runMacroTask();
    }
    await this.initComponents(components);
  }

  async finalize({ root, generator }) {
    const treeGen = this.proceed({ root, generator });
    let done = false;
    while (!done) done = (await treeGen.next()).done || false;
  }

  async initComponents(components) {
    if (components.length === 0) return;
    const runMacroTask = this.createMacroTasks();
    for (const component of components) {
      await runMacroTask();
      await component.hooks.init.call(component);
    }
  }

  async loadSchema(schemaLoader) {
    const { path, base, args } = schemaLoader;
    const cache = SchemaCompiler.#moduleCache;
    let url = path.endsWith('.js') ? path : `${path}.js`;
    if (base) url = new URL(url, base);
    const cached = cache[url];
    let module;
    if (cached) module = cached;
    else module = cache[url] = await import(url);
    return module.default(args);
  }

  createMacroTasks(macroTaskSize = 100) {
    let divider = 0;
    return () => {
      if (++divider % macroTaskSize === 0) {
        return new Promise((resolve) => setTimeout(resolve));
      }
    };
  }
}
