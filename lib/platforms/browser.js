import NodeBinding from '../binding.js';
import {
  APP_ATTR,
  CLASS_PREFIX,
  CSR_MODE,
  HASH_ATTR,
  HASH_LENGTH,
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

class ElementHasher {
  static #cache = {};
  static #hashCounters = {};

  static getElement(schema) {
    const hashes = ElementHasher.#hashCounters;
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
    ElementHasher.#hashCounters = {};
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
}

class BrowserPlatform {
  #isHydrationEnabled = false;
  #loader;
  #compiler;
  #location;
  #dom;

  constructor(webApi) {
    this.#loader = new Loader();
    this.#compiler = new SchemaCompiler(webApi, this.#loader);
    this.#location = webApi.location;
    this.#dom = webApi.document;
  }

  start() {
    const bootstrap = async () => {
      const appAttr = camelToKebabCase(APP_ATTR);
      const mountElement = this.#dom.querySelector(`[data-${appAttr}]`);
      if (!mountElement) throw Reporter.error('BadMount');
      await this.#enableHydration(mountElement);
      await this.#loadConfig();
      const input = { path: mountElement.dataset[SRC_ATTR] };
      const sheet = this.#getStyleSheet(mountElement);
      const compilation = await this.#startCompilation(input, sheet);
      await this.#compilePage(compilation);
      if (this.#isHydrationEnabled) this.#disableHydration();
    };
    const isLoading = this.#dom.readyState === 'loading';
    if (isLoading) this.#dom.addEventListener('DOMContentLoaded', bootstrap);
    else void bootstrap();
  }

  #loadConfig() {
    const appUrl = this.#location.origin;
    return this.#loader.loadConfig(appUrl);
  }

  async #startCompilation(rootInput, styleSheet) {
    const rootContext = await this.#compiler.createRoot(rootInput);
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
    return this.#compiler.start(rootContext);
  }

  async #compilePage(compilation) {
    const root = compilation.root;
    const mode = root.binding.data[MODE_ATTR];
    if (mode === CSR_MODE) await this.#compileCSRPage(compilation);
    else await this.#compiler.finalize(compilation);
    return root;
  }

  async #compileCSRPage(compilation) {
    const contextGenerator = this.#compiler.proceed(compilation);
    for await (const context of contextGenerator) {
      if (context.schema.tag === 'body') {
        this.#disableHydration();
        await drainGenerator(contextGenerator);
      }
    }
  }

  #enableHydration(mountElement) {
    const hashedElements = [mountElement];
    const hashAttr = camelToKebabCase(HASH_ATTR);
    const elements = mountElement.querySelectorAll(`[data-${hashAttr}]`);
    hashedElements.push(...elements);
    ElementHasher.cacheHashedElements(hashedElements);
    this.#compiler.setRendererType(ClientRenderer);
    this.#isHydrationEnabled = true;
  }

  #disableHydration() {
    this.#isHydrationEnabled = false;
    this.#compiler.setDefaultRenderer();
    ElementHasher.flush();
  }

  #getStyleSheet(element) {
    const styleId = element.dataset[HASH_ATTR];
    const styleRefAttr = camelToKebabCase(STYLE_REF_ATTR);
    const style = this.#dom.querySelector(`[data-${styleRefAttr}]`);
    if (style?.dataset[STYLE_REF_ATTR] === styleId) return style.sheet;
    throw Reporter.error('BadStyle');
  }
}

new BrowserPlatform(window).start();
