import SchemaCompiler from '../core.js';
import SSRHash from '../hash.js';
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
    const doc = this.#platform.webApi.document;
    const input = mountElementOrId;
    const isString = typeof input === 'string';
    const mountElement = isString ? doc.getElementById(input) : input;
    if (!mountElement) throw Reporter.error('BadMount');
    const ssrElements = mountElement.dataset.ssr ? [mountElement] : [];
    ssrElements.push(...mountElement.querySelectorAll('[data-ssr]'));
    if (ssrElements.length > 0) SSRHash.cacheExistingElements(ssrElements);
    const id = mountElement.id || mountElement.nodeName.toLowerCase();
    if (this.instances[id]) return Reporter.warn('InstanceExists', id);
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
}

class BrowserPlatform {
  webApi;
  #doc;
  #compiler;

  constructor(webApi) {
    this.webApi = webApi;
    this.#doc = webApi.document;
    this.#compiler = new SchemaCompiler(webApi);
  }

  start() {
    const swayer = globalThis.swr = new Swayer(this);
    const initAll = async () => {
      const mountElements = this.#doc.querySelectorAll('[data-swayer]');
      const elements = Array.from(mountElements);
      await Promise.all(elements.map((root) => swayer.mountInstance(root)));
      SSRHash.flush();
    };
    const isLoading = this.#doc.readyState === 'loading';
    if (isLoading) this.#doc.addEventListener('DOMContentLoaded', initAll);
    else void initAll();
  }

  async compile(rootInput, mountElement) {
    const compilation = await this.#compiler.start(rootInput);
    const { root } = compilation;
    if (mountElement) root.renderer.mount(mountElement);
    await this.#compiler.finalize(compilation);
    return root;
  }
}

new BrowserPlatform(window).start();
