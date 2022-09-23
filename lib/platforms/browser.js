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

  get rootNode() {
    return this.#context.binding.getNativeNode();
  }

  async update(args = {}) {
    const oldContext = this.#context;
    const rootSchema = { path: oldContext.moduleUrl, args };
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
  instances = [];

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
    // TODO: Implement routing from config
    const config = await this.#platform.loadConfig();
    const path = mountElement.src || mountElement.dataset.src;
    const rootSchema = { path, args };
    const context = await this.#platform.compile(rootSchema);
    const instance = new SwayerInstance(this.#platform, context);
    this.instances.push(instance);
    return instance;
  }

  async createInstance(rootSchema) {
    const context = await this.#platform.compile(rootSchema);
    return new SwayerInstance(this.#platform, context);
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
      await Promise.all(elements.map((el) => swayer.mountInstance(el)));
      if (this.#isHydrationEnabled) this.disableHydration();
    };
    const isLoading = this.dom.readyState === 'loading';
    if (isLoading) this.dom.addEventListener('DOMContentLoaded', initAll);
    else void initAll();
  }

  async compile(rootInput) {
    const styleSheet = this.dom.styleSheets[0];
    const rootContext = await this.#compiler.createRoot(rootInput);
    const ruleHandler = (rule) => styleSheet.insertRule(rule);
    rootContext.createStyler(ruleHandler);
    const compilation = await this.#compiler.start(rootContext);
    const root = compilation.root;
    const { mode } = root.binding.getData();
    if (mode === 'csr' && root.schema.tag === 'html') {
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
