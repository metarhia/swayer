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
import SwayerEngine from '../core.js';
import SchemaHasher from '../hasher.js';
import Renderer from '../renderer.js';
import Reporter from '../reporter.js';
import { camelToKebabCase, hasOwn } from '../utils.js';

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

class DocumentRenderer extends Renderer {
  createBinding() {
    const webApi = this.webApi;
    const schema = this.context.schema;
    return new NodeBinding(webApi, schema, webApi.document);
  }

  async rerenderSegment(segIndex) {
    this.clearSegment(segIndex);
    const parent = this.context;
    const schema = parent.schema.children[segIndex];
    const childContext = await this.engine.createChildContext(schema, parent);
    const style = this.webApi.document.createElement('style');
    const textRuleHandler = (rule) => (style.textContent += rule);
    const styler = childContext.createStyler(textRuleHandler);
    const generator = this.engine.start(childContext);
    const { value: headContext } = await generator.next();
    const headTag = headContext?.schema.tag;
    if (headTag !== 'head') throw Reporter.error('HeadNotFound', headTag);
    headContext.binding.getNativeNode().append(style);
    const ruleHandler = (rule) => (
      style.sheet.insertRule(rule, style.sheet.cssRules.length)
    );
    parent.children[segIndex].push(childContext);
    for await (const context of generator) {
      if (context.schema.tag === 'body') {
        childContext.renderer.render();
        styler.setRuleHandler(ruleHandler);
        await this.engine.finalize(generator);
      }
    }
  }
}

class HydrationRenderer extends Renderer {
  createBinding() {
    const schema = this.context.schema;
    const webApi = this.webApi;
    const element = ElementHasher.getElement(schema);
    return new NodeBinding(webApi, schema, element);
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
  #dom;
  #location;
  #engine;

  constructor(webApi) {
    this.#dom = webApi.document;
    this.#location = webApi.location;
    this.#engine = new SwayerEngine(webApi, this.#location.origin);
  }

  start() {
    const bootstrap = async () => {
      const appAttr = camelToKebabCase(APP_ATTR);
      const mountElement = this.#dom.querySelector(`[data-${appAttr}]`);
      if (!mountElement) throw Reporter.error('BadMount');
      await this.#enableHydration(mountElement);
      const schemaRef = { path: mountElement.dataset[SRC_ATTR] };
      const sheet = this.#getStyleSheet(mountElement);
      const rootContext = await this.#createRootContext(schemaRef, sheet);
      await this.#renderApp(rootContext);
      if (this.#isHydrationEnabled) this.#disableHydration();
    };
    const isLoading = this.#dom.readyState === 'loading';
    if (isLoading) this.#dom.addEventListener('DOMContentLoaded', bootstrap);
    else void bootstrap();
  }

  async #createRootContext(schemaRef, styleSheet) {
    this.#engine.setRendererType(DocumentRenderer);
    const urlPath = this.#location.pathname;
    const rootCtx = await this.#engine.createRootContext(schemaRef, urlPath);
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
    rootCtx.createStyler(ruleHandler, classes);
    return rootCtx;
  }

  async #renderApp(rootContext) {
    this.#engine.setRendererType(HydrationRenderer);
    const generator = this.#engine.start(rootContext);
    const { value: htmlContext } = await generator.next();
    const mode = htmlContext.binding.data[MODE_ATTR];
    if (mode === CSR_MODE) await this.#compileCSRPage(generator);
    else await this.#compileSSRPage(generator);
  }

  async #compileCSRPage(generator) {
    for await (const context of generator) {
      if (context.schema.tag === 'body') {
        this.#disableHydration();
        this.#engine.setDefaultRenderer();
        await this.#engine.finalize(generator);
      }
    }
  }

  async #compileSSRPage(generator) {
    await this.#engine.finalize(generator);
    this.#engine.setDefaultRenderer();
  }

  #enableHydration(mountElement) {
    const hashedElements = [mountElement];
    const hashAttr = camelToKebabCase(HASH_ATTR);
    const elements = mountElement.querySelectorAll(`[data-${hashAttr}]`);
    hashedElements.push(...elements);
    ElementHasher.cacheHashedElements(hashedElements);
    this.#isHydrationEnabled = true;
  }

  #disableHydration() {
    this.#isHydrationEnabled = false;
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
