import { Platform } from '../core.js';
import Reporter from '../reporter.js';

class SwayerInstance {
  #platform;
  #context;

  constructor(platform, context) {
    this.#platform = platform;
    this.#context = context;
  }

  async update(args = {}) {
    const { component, binding } = this.#context;
    const mountElement = binding.element;
    const rootSchema = this.#platform.createRootSchema(mountElement, args);
    const compiler = await this.#platform.resolveCompiler('create');
    this.#context = await compiler.run(rootSchema, mountElement);
    component.destroy();
    return this;
  }

  destroy() {
    this.#context.component.destroy();
  }
}

class Swayer {
  #platform;
  instances = {};

  constructor(platform) {
    this.#platform = platform;
  }

  async mountInstance(mountElementOrId, args = {}) {
    const doc = this.#platform.webApi.document;
    const input = mountElementOrId;
    const isString = typeof input === 'string';
    const mountElement = isString ? doc.getElementById(input) : input;
    if (!mountElement) throw Reporter.error('BadMount');
    const id = mountElement.id || mountElement.nodeName.toLowerCase();
    if (this.instances[id]) return Reporter.warn('InstanceExists', id);
    const option = mountElement.dataset.swayer;
    const rootSchema = this.#platform.createRootSchema(mountElement, args);
    const compiler = await this.#platform.resolveCompiler(option);
    const context = await compiler.run(rootSchema, mountElement);
    return (this.instances[id] = new SwayerInstance(this.#platform, context));
  }

  async createInstance(rootSchema) {
    const compiler = await this.#platform.resolveCompiler('create');
    const context = await compiler.run(rootSchema);
    const id = context.schema.attrs?.id || context.schema.tag;
    if (this.instances[id]) return Reporter.warn('InstanceExists', id);
    this.instances[id] = new SwayerInstance(this.#platform, context);
    return context.binding.element;
  }
}

class BrowserPlatform extends Platform {
  #document;
  #compilersCache = {};
  #options = {
    create: () => this.compiler,
    hydrate: () => this.#loadHydration(),
  };

  constructor(webApi) {
    super(webApi);
    this.#document = webApi.document;
  }

  start() {
    const swayer = this.webApi.swayer = new Swayer(this);
    const initAll = () => {
      const mountElements = this.#document.querySelectorAll('[data-swayer]');
      mountElements.forEach((root) => swayer.mountInstance(root));
    };
    const isLoading = this.#document.readyState === 'loading';
    if (isLoading) this.#document.addEventListener('DOMContentLoaded', initAll);
    else initAll();
  }

  createRootSchema(mountElement, args) {
    const path = mountElement.src || mountElement.dataset.src;
    return { path, args };
  }

  async resolveCompiler(option) {
    const cachedCompiler = this.#compilersCache[option];
    if (cachedCompiler) return cachedCompiler;
    const getCompiler = this.#options[option];
    const compiler = getCompiler ? await getCompiler() : null;
    if (compiler) return (this.#compilersCache[option] = compiler);
    throw Reporter.error('BadInitOption', option);
  }

  async #loadHydration() {
    const module = await import('../hydration.js');
    const HydrationCompiler = module.default;
    const compiler = new HydrationCompiler(this);
    this.setCompiler(compiler);
    return compiler;
  }
}

new BrowserPlatform(window).start();
