import ChannelManager from './channels.js';
import { Component, ReactivityManager } from './component.js';
import EventManager from './events.js';
import Loader from './loader.js';
import Reflector from './reflection.js';
import { ElementRenderer, HeadRenderer, TextRenderer } from './renderer.js';
import Reporter from './reporter.js';
import Router from './router.js';
import Styler from './styler.js';
import { createMacroTaskRunner, hasOwn, is } from './utils.js';

class BaseContext {
  schema;
  originalSchema;
  parent;
  module;
  renderer;
  binding;

  constructor(schema, originalSchema, parent, module) {
    this.schema = schema;
    this.originalSchema = originalSchema;
    this.parent = parent;
    this.module = module;
  }

  init(renderer) {
    this.renderer = renderer;
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
    if (is.fn(children)) {
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

  getPrevSiblingContext(index) {
    const segment = this[index];
    if (!segment) return null;
    const context = segment[segment.length - 1];
    if (context) return context;
    return this.getPrevSiblingContext(--index);
  }
}

export class Context extends BaseContext {
  component = new Component(this);
  children = new ContextSegments([]);
  styler;
  router;
  reactivityManager;
  eventManager;
  channelManager;

  constructor(schema, originalSchema, parent, module) {
    super(schema, originalSchema, parent, module);
    this.styler = this.parent?.styler;
    this.router = this.parent?.router;
    this.reactivityManager = new ReactivityManager(this);
  }

  init(renderer, loader) {
    super.init(renderer);
    this.eventManager = new EventManager(this);
    this.channelManager = new ChannelManager(this, loader);
    Reflector.reflectAll(this);
    this.reactivityManager.registerReactivity();
    return this;
  }

  createStyler(ruleHandler, classes) {
    this.styler = new Styler(ruleHandler, classes);
    return this.styler;
  }

  createRouter(engine, routes, reload) {
    this.router = new Router(engine, this, routes, reload);
    return this.router;
  }

  destroy() {
    super.destroy();
    this.cleanUp();
    this.#callDestroyHook();
  }

  cleanUp() {
    this.router?.destroy();
    this.channelManager?.clearAllChannels();
    this.reactivityManager.removeReactivity();
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

export class ContextFactory {
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
    let schema = inputSchema;
    let module = parent?.module;
    if (is.basic(schema)) {
      const text = schema.toString();
      return new BaseContext(text, schema, parent, module);
    }
    const originalSchema = this.#validateInput(inputSchema);
    if (schema.routes) {
      const router = this.#setupRouter(schema, parent);
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
    this.#initNamespaces(schema);
    this.#preloadModules(schema);
    return new Context(schema, originalSchema, parent, module);
  }

  async *generateContexts(root) {
    const stack = Array.isArray(root) ? root.reverse() : [root];
    while (stack.length > 0) {
      const context = stack.pop();
      yield context;
      await this.#initSegments(context, stack);
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

  #setupRouter(schema, parent) {
    const segIndex = parent.schema.children.indexOf(schema);
    const reload = async (newSchema) => {
      const reloadingSchema = newSchema || await parent.router.matchSchema();
      await parent.renderer.renderSegment(reloadingSchema, segIndex, true);
    };
    const router = parent.createRouter(this.#engine, schema.routes, reload);
    if (!router.parent) {
      router.setInitialPath(this.#engine.routingPath);
      Router.registerHistoryChanges(router);
    }
    return router;
  }

  #initNamespaces(schema) {
    const { namespaces } = schema;
    if (!is.obj(namespaces)) return;
    this.#engine.loader.setNamespaces(namespaces);
  }

  #preloadModules(schema) {
    const { preload: paths } = schema;
    if (!is.arr(paths)) return;
    for (const path of paths) void this.#engine.loader.loadModule(path);
  }
}

export default class SwayerEngine {
  #contextFactory = new ContextFactory(this);
  #renderers = {};
  webApi;
  loader;
  routingPath;

  constructor(webApi, entryPath, routingPath) {
    this.webApi = webApi;
    this.loader = new Loader(entryPath);
    this.routingPath = routingPath;
    this.resetDefaultRenderers();
  }

  setRendererTypes(renderersMap) {
    Object.assign(this.#renderers, renderersMap);
  }

  resetDefaultRenderers() {
    this.setRendererTypes({
      head: HeadRenderer,
      text: TextRenderer,
      element: ElementRenderer,
    });
  }

  createRenderer(context) {
    const tag = context.schema.tag;
    let RendererType = this.#renderers.element;
    if (!context.parent) RendererType = this.#renderers.root;
    else if (is.str(context.schema)) RendererType = this.#renderers.text;
    else if (hasOwn(this.#renderers, tag)) RendererType = this.#renderers[tag];
    const renderer = new RendererType(this, context);
    context.init(renderer, this.loader);
  }

  async createContext(schema, parent = null) {
    const context = await this.#contextFactory.createContext(schema, parent);
    this.createRenderer(context);
    return context;
  }

  renderContext(context) {
    context.renderer.render();
    return context;
  }

  async *start(startContext) {
    const generator = this.#contextFactory.generateContexts(startContext);
    await generator.next();
    const runMacroTask = createMacroTaskRunner();
    const initHooks = [];
    const routers = new Set();
    const collectFinalizers = (context) => {
      if (is.str(context.schema)) return;
      const { component, router } = context;
      const init = component.hooks.init;
      if (init) initHooks.push(init.bind(component));
      if (router) routers.add(router);
    };
    collectFinalizers(startContext);
    try {
      for await (const context of generator) {
        collectFinalizers(context);
        await runMacroTask();
        this.createRenderer(context);
        const renderedContext = this.renderContext(context);
        if (renderedContext) yield renderedContext;
        else break;
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

  async run(schema, parentContext = null) {
    const startContext = await this.createContext(schema, parentContext);
    return this.start(startContext);
  }

  async finalize(generator) {
    let done;
    while (!done) done = (await generator.next()).done;
  }
}
