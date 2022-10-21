import NodeBinding from '../binding.js';
import {
  APP_ATTR, CLASS_PREFIX,
  CSR_MODE,
  HASH_ATTR, HASH_LENGTH,
  MODE_ATTR,
  SRC_ATTR,
  STYLE_REF_ATTR,
} from '../constants.js';
import SchemaCompiler from '../core.js';
import SchemaHasher from '../hasher.js';
import Loader from '../loader.js';
import Renderer from '../renderer.js';
import Reporter from '../reporter.js';
import { camelToKebabCase, drainGenerator, hasOwn } from '../utils.js';

class Swayer {
  #platform;
  #context;
  #style;

  constructor(platform, context, style) {
    this.#platform = platform;
    this.#context = context;
    this.#style = style;
  }

  get rootNode() {
    return this.#context.binding.getNativeNode();
  }

  get style() {
    return this.#style;
  }

  async update(args = {}) {
    this.#context = await this.#context.renderer.recreateRoot(args);
    return this;
  }

  // async update(args = {}) {
  //   const compiler = this.#platform.compiler;
  //   const input = { path: this.#context.moduleUrl, args };
  //   const rootContext = await compiler.createRoot(input);
  //   const sheet = new CSSStyleSheet();
  //   this.#platform.dom.adoptedStyleSheets[0] = sheet;
  //   const ruleHandler = (rule) => sheet.insertRule(rule, sheet.cssRules.length);
  //   rootContext.createStyler(ruleHandler);
  //   const compilation = await compiler.start(rootContext);
  //   await this.#context.renderer.replace(rootContext);
  //   await compiler.finalize(compilation);
  //   this.#context = rootContext;
  //   return this;
  // }
  //
  // async updateRoot(args) {
  //   const compiler = this.#platform.compiler;
  //   const input = { path: this.#context.moduleUrl, args };
  //   const rootContext = await compiler.createRoot(input);
  //   const style = this.#platform.createStyle();
  //   const ruleHandler = (rule) => (style.textContent += rule);
  //   rootContext.createStyler(ruleHandler);
  //   const compilation = await compiler.start(rootContext);
  //   await this.#context.renderer.replace(rootContext);
  //   const contextGenerator = compiler.proceed(compilation);
  //   for await (const context of contextGenerator) {
  //     if (context.schema.tag === 'body') {
  //       this.#platform.dom.head.append(style);
  //       const sheet = style.sheet;
  //       const handler = (rule) => sheet.insertRule(rule, sheet.cssRules.length);
  //       context.styler.setRuleHandler(handler);
  //       await drainGenerator(contextGenerator);
  //     }
  //   }
  //   this.#context = rootContext;
  //   return this;
  // }

  destroy() {
    this.#style.remove();
    this.#context.destroy();
  }
}

class InstanceManager {
  #platform;
  instances = [];

  constructor(platform) {
    this.#platform = platform;
  }

  async mountInstance(mountElementOrId, args = {}) {
    const dom = this.#platform.dom;
    const element = mountElementOrId;
    const isString = typeof element === 'string';
    const mountElement = isString ? dom.getElementById(element) : element;
    if (!mountElement) throw Reporter.error('BadMount');
    await this.#platform.enableHydration(mountElement);
    await this.#platform.loadConfig();
    const path = mountElement.src || mountElement.dataset[SRC_ATTR];
    const input = { path, args };
    const style = this.#platform.getStyle(mountElement);
    const compilation = await this.#platform.initCompilation(input, style.sheet);
    const context = await this.#platform.createApp(compilation);
    const instance = new Swayer(this.#platform, context, style);
    this.instances.push(instance);
    return instance;
  }

  async createInstance(input) {
    const style = this.#platform.createStyle();
    const compilation = await this.#platform.initCompilation(input, style);
    const context = await this.#platform.createApp(compilation);
    return new Swayer(this.#platform, context, style);
  }
}

class ElementHasher {
  static #cache = {};
  static #hashes = {};

  static getElement(schema) {
    const hashes = ElementHasher.#hashes;
    const schemaHash = SchemaHasher.hashSchema(schema);
    const index = hasOwn(hashes, schemaHash)
      ? hashes[schemaHash] += 1
      : hashes[schemaHash] = 0;
    const hash = `${schemaHash}_${index}`;
    return ElementHasher.#cache[hash];
  }

  static cacheHashedElements(elements) {
    const cacheHash = (map, elem) => {
      map[elem.dataset[HASH_ATTR]] = elem;
      return map;
    };
    ElementHasher.#cache = elements.reduce(cacheHash, ElementHasher.#cache);
  }

  static flush() {
    ElementHasher.#cache = {};
    ElementHasher.#hashes = {};
  }
}

class ClientRenderer extends Renderer {
  createBinding() {
    const schema = this.context.schema;
    const webApi = this.webApi;
    const element = ElementHasher.getElement(schema);
    return new NodeBinding(schema, webApi, element);
  }

  render() {
    if (this.binding.hydrated) return;
    if (typeof this.context.schema === 'string') {
      const { children, binding: parentBinding } = this.context.parent;
      const contexts = children.flat();
      const index = contexts.indexOf(this.context);
      const { childNodes } = parentBinding.getNativeNode();
      const node = childNodes[index];
      if (node) {
        const text = this.context.binding.getNativeNode();
        const textType = this.webApi.Node.TEXT_NODE;
        const isText = node.nodeType === textType;
        if (isText) node.replaceWith(text);
        else node.before(text);
        return;
      }
    }
    super.render();
  }

  // todo need to getStyle and resolve head case

  async recreate(args = {}) {
    const compiler = this.compiler;
    const input = { path: this.context.moduleUrl, args };
    const rootContext = await compiler.createRoot(input);
    const sheet = new CSSStyleSheet();
    this.webApi.document.adoptedStyleSheets[0] = sheet;
    const ruleHandler = (rule) => sheet.insertRule(rule, sheet.cssRules.length);
    rootContext.createStyler(ruleHandler);
    const compilation = await compiler.start(rootContext);
    await this.context.renderer.replace(rootContext);
    await compiler.finalize(compilation);
    const children = this.context.parent.children;
    const index = children.indexOf(this);
    children[index] = rootContext;
    return rootContext;
  }

  async recreateRoot(args) {
    const compiler = this.compiler;
    const dom = this.compiler.webApi.document;
    const input = { path: this.context.moduleUrl, args };
    const rootContext = await compiler.createRoot(input);
    const style = dom.createElement('style');
    const ruleHandler = (rule) => (style.textContent += rule);
    rootContext.createStyler(ruleHandler);
    const compilation = await compiler.start(rootContext);
    await this.replace(rootContext);
    const contextGenerator = compiler.proceed(compilation);
    for await (const context of contextGenerator) {
      if (context.schema.tag === 'body') {
        dom.head.append(style);
        const sheet = style.sheet;
        const handler = (rule) => sheet.insertRule(rule, sheet.cssRules.length);
        context.styler.setRuleHandler(handler);
        await drainGenerator(contextGenerator);
      }
    }
    return rootContext;
  }
}

class BrowserPlatform {
  #loader;
  #location;
  #isHydrationEnabled = false;
  compiler;
  dom;

  constructor(webApi) {
    this.dom = webApi.document;
    this.#location = webApi.location;
    this.#loader = new Loader();
    this.compiler = new SchemaCompiler(webApi, this.#loader);
  }

  loadConfig() {
    const appUrl = this.#location.origin;
    return this.#loader.loadConfig(appUrl);
  }

  start() {
    const initAll = async () => {
      const appAttr = camelToKebabCase(APP_ATTR);
      const mountElements = this.dom.querySelectorAll(`[data-${appAttr}]`);
      const elements = Array.from(mountElements);
      const isSwayerApp = elements[0] === this.dom.documentElement;
      const swr = new InstanceManager(this);
      if (!isSwayerApp) globalThis.swr = swr;
      await Promise.all(elements.map((el) => swr.mountInstance(el)));
      if (this.#isHydrationEnabled) this.disableHydration();
    };
    const isLoading = this.dom.readyState === 'loading';
    if (isLoading) this.dom.addEventListener('DOMContentLoaded', initAll);
    else void initAll();
  }

  async initCompilation(rootInput, styleSheet) {
    const rootContext = await this.compiler.createRoot(rootInput);
    const ruleHandler = (rule) => (
      styleSheet.insertRule(rule, styleSheet.cssRules.length)
    );
    const classes = Array
      .from(styleSheet.cssRules)
      .filter((rule) => rule.selectorText)
      .map((rule) => {
        const selector = rule.selectorText;
        const start = selector.indexOf('.');
        const end = CLASS_PREFIX.length + HASH_LENGTH;
        return selector.slice(start + 1, start + end + 1);
      });
    rootContext.createStyler(ruleHandler, classes);
    return this.compiler.start(rootContext);
  }

  async createApp(compilation) {
    const root = compilation.root;
    const mode = root.binding.data[MODE_ATTR];
    const isCSRPage = mode === CSR_MODE && root.schema.tag === 'html';
    if (isCSRPage) await this.compileCSRPage(compilation);
    else await this.compiler.finalize(compilation);
    return root;
  }

  async compileCSRPage(compilation) {
    const contextGenerator = this.compiler.proceed(compilation);
    for await (const context of contextGenerator) {
      if (context.schema.tag === 'body') {
        this.disableHydration();
        await drainGenerator(contextGenerator);
      }
    }
  }

  enableHydration(mountElement) {
    const hashedElements = [mountElement];
    const hashAttr = camelToKebabCase(HASH_ATTR);
    const elements = mountElement.querySelectorAll(`[data-${hashAttr}]`);
    hashedElements.push(...elements);
    ElementHasher.cacheHashedElements(hashedElements);
    this.compiler.setRendererType(ClientRenderer);
    this.#isHydrationEnabled = true;
  }

  disableHydration() {
    this.#isHydrationEnabled = false;
    this.compiler.setDefaultRenderer();
    ElementHasher.flush();
  }

  getStyle(element) {
    const styleId = element.dataset[HASH_ATTR];
    const styleRefAttr = camelToKebabCase(STYLE_REF_ATTR);
    const styles = this.dom.querySelectorAll(`[data-${styleRefAttr}]`);
    const style = Array.from(styles).find(
      (style) => style.dataset[STYLE_REF_ATTR] === styleId,
    );
    if (style) return style;
    return this.createStyle();
  }

  createStyle() {
    return this.dom.createElement('style');
  }
}

new BrowserPlatform(window).start();
