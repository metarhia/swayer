import SchemaCompiler from '../core.js';
import SSRHash from '../hash.js';
import Loader from '../loader.js';
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
    const path = mountElement.src || mountElement.dataset.src;
    const rootSchema = { path, args };
    this.#context = await this.#platform.compile(rootSchema, mountElement);
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
    const dom = this.#platform.dom;
    const input = mountElementOrId;
    const isString = typeof input === 'string';
    const mountElement = isString ? dom.getElementById(input) : input;
    if (!mountElement) throw Reporter.error('BadMount');
    await this.#checkHydration(mountElement);
    const id = mountElement.id || mountElement.nodeName.toLowerCase();
    if (this.instances[id]) return Reporter.warn('InstanceExists', id);
    // TODO: Implement routing from config
    const config = await this.#platform.loadConfig();
    const path = mountElement.src || mountElement.dataset.src;
    const rootSchema = { path, args };
    const context = await this.#platform.compile(rootSchema, mountElement);
    return (this.instances[id] = new SwayerInstance(this.#platform, context));
  }

  async createInstance(rootSchema) {
    const context = await this.#platform.compile(rootSchema);
    const id = context.schema.attrs?.id || context.schema.tag;
    if (this.instances[id]) return Reporter.warn('InstanceExists', id);
    this.instances[id] = new SwayerInstance(this.#platform, context);
    return context.binding.element;
  }

  async #checkHydration(mountElement) {
    const ssrElements = mountElement.dataset.ssr ? [mountElement] : [];
    ssrElements.push(...mountElement.querySelectorAll('[data-ssr]'));
    if (ssrElements.length === 0) return;
    SSRHash.cacheExistingElements(ssrElements);
    await this.#platform.enableHydration();
  }
}

class BrowserPlatform {
  #loader;
  #location;
  #compiler;
  #isHydrationEnabled = false;
  dom;

  constructor(webApi) {
    this.dom = webApi.document;
    this.#location = webApi.location;
    this.#loader = new Loader();
    this.#compiler = new SchemaCompiler(webApi, this.#loader);
  }

  loadConfig() {
    const appUrl = this.#location.origin;
    return this.#loader.loadConfig(appUrl);
  }

  start() {
    const swayer = globalThis.swr = new Swayer(this);
    const initAll = async () => {
      const mountElements = this.dom.querySelectorAll('[data-swayer]');
      const elements = Array.from(mountElements);
      await Promise.all(elements.map((root) => swayer.mountInstance(root)));
      if (this.#isHydrationEnabled) this.disableHydration();
    };
    const isLoading = this.dom.readyState === 'loading';
    if (isLoading) this.dom.addEventListener('DOMContentLoaded', initAll);
    else void initAll();
  }

  async compile(rootInput, mountElement) {
    const compilation = await this.#compiler.start(rootInput);
    const { root } = compilation;
    if (mountElement) root.renderer.mount(mountElement);
    await this.#compiler.finalize(compilation);
    return root;
  }

  async enableHydration() {
    const module = await import('../hydrator.js');
    const Hydrator = module.default;
    this.#compiler.setRendererType(Hydrator);
    this.#isHydrationEnabled = true;
  }

  disableHydration() {
    this.#isHydrationEnabled = false;
    this.#compiler.setDefaultRenderer();
    SSRHash.flush();
  }
}

new BrowserPlatform(window).start();
