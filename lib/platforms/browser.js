import SchemaCompiler from '../core.js';
import SchemaHasher from '../hasher.js';
import Hydrator from '../hydrator.js';
import Loader from '../loader.js';
import Reporter from '../reporter.js';
import { drainGenerator } from '../utils.js';

class SwayerInstance {
  #platform;
  #context;

  constructor(platform, context) {
    this.#platform = platform;
    this.#context = context;
  }

  async update(args = {}) {
    const oldContext = this.#context;
    const mountElement = oldContext.binding.getNativeNode();
    const path = mountElement.src || mountElement.dataset.src;
    const rootSchema = { path, args };
    this.#context = await this.#platform.compile(rootSchema);
    oldContext.destroy();
    return this;
  }

  destroy() {
    this.#context.destroy();
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
    const context = await this.#platform.compile(rootSchema);
    return (this.instances[id] = new SwayerInstance(this.#platform, context));
  }

  async createInstance(rootSchema) {
    const context = await this.#platform.compile(rootSchema);
    const id = context.schema.attrs?.id || context.schema.tag;
    if (this.instances[id]) return Reporter.warn('InstanceExists', id);
    this.instances[id] = new SwayerInstance(this.#platform, context);
    return context.binding.getNativeNode();
  }

  async #checkHydration(mountElement) {
    const hydrateElements = mountElement.dataset.hydrate ? [mountElement] : [];
    hydrateElements.push(...mountElement.querySelectorAll('[data-hydrate]'));
    if (hydrateElements.length === 0) return;
    SchemaHasher.cacheHydrateElements(hydrateElements);
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

  async compile(rootInput) {
    const compilation = await this.#compiler.start(rootInput);
    const root = compilation.root;
    if (root.schema === 'html') {
      const contextGenerator = this.#compiler.proceed(compilation);
      for await (const context of contextGenerator) {
        const parentTag = context.parent.schema.tag;
        if (parentTag === 'body') {
          this.disableHydration();
          await drainGenerator(contextGenerator);
        }
      }
    } else {
      await this.#compiler.finalize(compilation);
    }
    return root;
  }

  async enableHydration() {
    this.#compiler.setRendererType(Hydrator);
    this.#isHydrationEnabled = true;
  }

  disableHydration() {
    this.#isHydrationEnabled = false;
    this.#compiler.setDefaultRenderer();
    SchemaHasher.flush();
  }
}

new BrowserPlatform(window).start();
