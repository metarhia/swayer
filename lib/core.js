import ChannelManager from './channels.js';
import { Component, ReactivityManager } from './component.js';
import EventManager from './events.js';
import Reflector from './reflection.js';
import Renderer from './renderer.js';
import Reporter from './reporter.js';
import Styler from './styler.js';
import { createMacroTaskRunner, drainGenerator, hasOwn, is } from './utils.js';

class BaseContext {
  parent;
  schema;
  originalSchema;
  module;
  styler;
  renderer;
  binding;

  constructor(schema, originalSchema, parent, module) {
    this.parent = parent;
    this.schema = schema;
    this.originalSchema = originalSchema;
    this.module = module;
    this.styler = this.parent?.styler;
  }

  init(compiler) {
    this.renderer = new compiler.RendererType(this);
    this.binding = this.renderer.binding;
    return this;
  }

  createStyler(ruleHandler, classes) {
    this.styler = new Styler(ruleHandler, classes);
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
    Reflector.reflectAll(this);
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
}

class ContextFactory {
  #compiler;

  constructor(compiler) {
    this.#compiler = compiler;
  }

  #validateInput(input) {
    const error = (option) => (
      Reporter.error('BadSchemaInput', { option, input })
    );
    if (is.obj(input) && !is.arr(input)) {
      const { tag, path } = input;
      if (!is.str(path) && !is.str(tag)) throw error('poor');
    }
    return input;
  }

  #validateSchema(schema, moduleUrl) {
    const error = (option) => (
      Reporter.error('BadSchema', { option, schema, moduleUrl })
    );
    const { text, children, model } = schema;
    const hasText = hasOwn(schema, 'text');
    const hasChildren = hasOwn(schema, 'children');
    if (hasText && hasChildren) throw error('conflict');
    const isText = is.basic(text) || is.fn(text);
    if (hasText && !isText) throw error('invalidText');
    const isChildren = is.arr(children) || is.fn(children);
    if (hasChildren && !isChildren) throw error('invalidChildren');
    const hasModel = hasOwn(schema, 'model');
    if (hasModel && !is.obj(model)) throw error('model');
    if (hasModel && !is.obj(model?.state)) throw error('state');
    return schema;
  }

  async createContext(inputSchema, parent, recurrent = []) {
    if (!inputSchema) return false;
    const originalSchema = this.#validateInput(inputSchema);
    let schema = originalSchema;
    let module = parent?.module;
    if (is.basic(schema)) {
      const text = schema.toString();
      return new BaseContext(text, originalSchema, parent, module);
    }
    if (schema.path) {
      const loader = this.#compiler.loader;
      module = await loader.loadSchemaModule(schema);
      schema = module.schema;
    }
    if (typeof schema === 'function') {
      const reactiveInput = parent.reactivityManager.registerChildren(schema);
      return this.createContext(reactiveInput, parent, recurrent);
    }
    if (is.arr(schema)) {
      const recur = (nested) => this.createContext(nested, parent, recurrent);
      const recurred = await Promise.all(schema.map(recur));
      const contexts = recurred.filter(
        (schema) => schema && !is.arr(schema),
      );
      recurrent.push(...contexts);
      return recurrent;
    }
    schema = this.#validateSchema(schema, module.url);
    return new Context(schema, originalSchema, parent, module);
  }

  async *generateContexts(root) {
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

// todo refactor to Application

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

  createRoot(input, parent) {
    return this.#contextFactory.createContext(input, parent);
  }

  async start(rootContext) {
    const generator = this.#contextFactory.generateContexts(rootContext);
    const { value: root } = await generator.next();
    root.styler.setStyles(root, root.schema.styles);
    return { root, generator };
  }

  async *proceed(compilation) {
    const runMacroTask = createMacroTaskRunner();
    const initHooks = [];
    try {
      const { root, generator } = compilation;
      const registerInitHook = (component) => {
        const init = component?.hooks.init;
        if (init) initHooks.push(init.bind(component));
      };
      registerInitHook(root.component);
      for await (const context of generator) {
        await runMacroTask();
        context.renderer.render();
        yield context;
        registerInitHook(context.component);
      }
    } finally {
      for (const init of initHooks) {
        await runMacroTask();
        await init();
      }
    }
  }

  async finalize(compilation) {
    const treeGenerator = this.proceed(compilation);
    await drainGenerator(treeGenerator);
  }
}
