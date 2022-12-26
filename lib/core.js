import ChannelManager from './channels.js';
import { Component, ReactivityManager } from './component.js';
import EventManager from './events.js';
import Loader from './loader.js';
import Reflector from './reflection.js';
import Renderer from './renderer.js';
import Reporter from './reporter.js';
import Router from './router.js';
import Styler from './styler.js';
import { createMacroTaskRunner, hasOwn, is } from './utils.js';

class BaseContext {
  engine;
  schema;
  originalSchema;
  parent;
  module;
  styler;
  renderer;
  binding;

  constructor(engine) {
    this.engine = engine;
  }

  init(schema, originalSchema, parent, module) {
    this.schema = schema;
    this.originalSchema = originalSchema;
    this.parent = parent;
    this.module = module;
    this.styler = parent?.styler;
    this.renderer = new this.engine.RendererType(this);
    this.binding = this.renderer.binding;
    return this;
  }

  createStyler(ruleHandler, classes) {
    this.styler = new Styler(ruleHandler, classes);
    this.styler.setStyles(this, this.schema.styles);
    return this.styler;
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
  #initialRouterPath;
  router;
  component;
  children;
  reactivityManager;
  eventManager;
  channelManager;

  init(schema, originalSchema, parent, module) {
    super.init(schema, originalSchema, parent, module);
    const loader = this.engine.loader;
    const { namespaces, preload } = this.schema;
    if (is.obj(namespaces)) loader.setNamespaces(namespaces);
    if (is.arr(preload)) this.#preloadModules(preload);
    this.router = parent?.router;
    this.component = new Component(this);
    this.children = new ContextSegments([]);
    this.reactivityManager = new ReactivityManager(this);
    this.eventManager = new EventManager(this);
    this.channelManager = new ChannelManager(this.component, loader);
    Reflector.reflectAll(this);
    this.reactivityManager.registerReactivity();
    return this;
  }

  setInitialPath(path) {
    this.#initialRouterPath = path;
  }

  createRouter(routes, reload) {
    this.router = new Router(this, routes, reload, this.#initialRouterPath);
    return this.router;
  }

  destroy() {
    super.destroy();
    this.cleanUp();
    this.#callDestroyHook();
  }

  cleanUp() {
    this.router.unregisterHistoryChanges();
    this.reactivityManager.removeReactivity();
    if (this.channelManager) this.channelManager.clearAllChannels();
    for (const segment of this.children) {
      for (const context of segment) {
        if (context.cleanUp) context.cleanUp();
        this.#callDestroyHook(context);
      }
    }
  }

  #preloadModules(paths) {
    const loader = this.engine.loader;
    for (const path of paths) void loader.loadModule(path);
  }

  #callDestroyHook(context = this) {
    const destroy = context.component?.hooks.destroy;
    if (destroy) destroy.call(context.component);
  }
}

class ContextFactory {
  #engine;

  constructor(engine) {
    this.#engine = engine;
  }

  #validateInput(input) {
    const error = (option) => (
      Reporter.error('BadSchemaInput', { option, input })
    );
    if (is.obj(input) && !is.arr(input)) {
      const { tag, path, routes } = input;
      const isPoor = !is.str(path) && !is.str(tag) && !is.obj(routes);
      if (isPoor) throw error('poor');
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
      const context = new BaseContext(this.#engine);
      return context.init(text, originalSchema, parent, module);
    }
    if (schema.routes) {
      const segIndex = parent.schema.children.indexOf(schema);
      const reload = (schema) => {
        if (schema) parent.renderer.renderSegment(schema, segIndex);
        else parent.renderer.rerenderSegment(segIndex);
      };
      const router = parent.createRouter(schema.routes, reload);
      if (!router.parent) router.registerHistoryChanges();
      const match = await router.matchSchema();
      if (match) return this.createContext(match, parent, recurrent);
      return false;
    }
    if (schema.path) {
      const loader = this.#engine.loader;
      module = await loader.loadSchemaModule(schema);
      schema = module.schema;
    }
    if (is.fn(schema)) {
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
    const context = new Context(this.#engine);
    return context.init(schema, originalSchema, parent, module);
  }

  async *generateContexts(root) {
    const stack = Array.isArray(root) ? root.reverse() : [root];
    while (stack.length > 0) {
      const context = stack.pop();
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

export default class SwayerEngine {
  #contextFactory = new ContextFactory(this);
  #RendererType;
  webApi;
  loader;

  constructor(webApi, appUrl) {
    this.webApi = webApi;
    this.loader = new Loader(appUrl);
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

  async createRootContext(input, urlPath) {
    const rootCtx = await this.#contextFactory.createContext(input, null);
    rootCtx.setInitialPath(urlPath);
    return rootCtx;
  }

  createChildContext(input, parent) {
    return this.#contextFactory.createContext(input, parent);
  }

  async *start(startContext) {
    const generator = this.#contextFactory.generateContexts(startContext);
    await generator.next();
    const runMacroTask = createMacroTaskRunner();
    const initHooks = [];
    const routers = new Set();
    const collectFinalizers = (context) => {
      if (context.constructor !== Context) return;
      const { component, router } = context;
      const init = component.hooks.init;
      if (init) initHooks.push(init.bind(component));
      routers.add(router);
    };
    try {
      collectFinalizers(startContext);
      for await (const context of generator) {
        await runMacroTask();
        context.renderer.render();
        yield context;
        collectFinalizers(context);
      }
    } finally {
      for (const init of initHooks) {
        await runMacroTask();
        await init();
      }
      for (const router of routers) {
        router.finishRouting();
      }
    }
  }

  async finalize(generator) {
    let done;
    while (!done) done = (await generator.next()).done;
  }
}
