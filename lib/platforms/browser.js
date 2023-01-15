import { DocumentBinding, ElementBinding } from '../binding.js';
import {
  APP_ATTR,
  CLASS_PREFIX,
  HASH_ATTR,
  HASH_LENGTH,
  MODE_ATTR,
  SRC_ATTR,
  SSR_MODE,
  STYLE_REF_ATTR,
} from '../constants.js';
import SwayerEngine from '../core.js';
import SchemaHasher from '../hasher.js';
import {
  ElementRenderer,
  HeadRenderer,
  Renderer,
  TextRenderer,
} from '../renderer.js';
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

class DocumentHydrationRenderer extends Renderer {
  style;

  constructor(style, engine, context) {
    super(engine, context);
    this.style = style;
    this.#initStyle();
  }

  createBinding() {
    const webApi = this.webApi;
    const schema = this.context.schema;
    return new DocumentBinding(webApi, schema);
  }

  render() {}

  replace() {}

  #initStyle() {
    const sheet = this.style.sheet;
    const ruleHandler = (rule) => sheet.insertRule(rule, sheet.cssRules.length);
    const classes = Array
      .from(sheet.cssRules)
      .filter((rule) => rule.selectorText)
      .map((rule) => {
        const selector = rule.selectorText;
        const start = selector.indexOf('.');
        const end = CLASS_PREFIX.length + HASH_LENGTH;
        return selector.slice(start + 1, start + end + 1);
      });
    this.context.createStyler(ruleHandler, classes);
  }
}

const createElementHydrationRenderer = (Base = Renderer) => class extends Base {
  createBinding() {
    const schema = this.context.schema;
    const webApi = this.webApi;
    const element = ElementHasher.getElement(schema);
    return new ElementBinding(webApi, schema, element);
  }

  render() {
    if (this.binding.isHydrated) return;
    super.render();
  }
};

class TextHydrationRenderer extends TextRenderer {
  render() {
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
    super.render();
  }
}

class CSREngine extends SwayerEngine {
  renderContext(context) {
    const renderedContext = super.renderContext(context);
    const isBodyReached = renderedContext.schema.tag === 'body';
    if (isBodyReached) this.resetDefaultRenderers();
    return renderedContext;
  }
}

class BrowserPlatform {
  #isHydrationEnabled = false;
  #webApi;
  #dom;
  #location;
  #engine;

  constructor(webApi) {
    this.#webApi = webApi;
    this.#dom = webApi.document;
    this.#location = webApi.location;
  }

  start() {
    const bootstrap = async () => {
      const appAttr = camelToKebabCase(APP_ATTR);
      const mountElement = this.#dom.querySelector(`[data-${appAttr}]`);
      if (!mountElement) throw Reporter.error('BadMount');
      await this.#enableHydration(mountElement);
      const schemaRef = { path: mountElement.dataset[SRC_ATTR] };
      const sheet = this.#getStyle(mountElement);
      const mode = mountElement.dataset[MODE_ATTR];
      this.#createEngine(mode);
      await this.#renderApp(schemaRef, sheet);
      if (this.#isHydrationEnabled) this.#disableHydration();
    };
    const isLoading = this.#dom.readyState === 'loading';
    if (isLoading) this.#dom.addEventListener('DOMContentLoaded', bootstrap);
    else void bootstrap();
  }

  #createEngine(mode) {
    const { origin, pathname } = this.#location;
    const Engine = mode === SSR_MODE ? SwayerEngine : CSREngine;
    this.#engine = new Engine(this.#webApi, origin, pathname);
    this.#engine.setRendererTypes({
      text: TextHydrationRenderer,
      html: createElementHydrationRenderer(ElementRenderer),
      head: createElementHydrationRenderer(HeadRenderer),
      element: createElementHydrationRenderer(ElementRenderer),
    });
  }

  async #renderApp(schemaRef, style) {
    const RootRenderer = DocumentHydrationRenderer;
    this.#engine.setRendererTypes({
      root: RootRenderer.bind(RootRenderer, style),
    });
    const generator = await this.#engine.run(schemaRef);
    await this.#engine.finalize(generator);
    this.#engine.resetDefaultRenderers();
    this.#disableHydration();
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

  #getStyle(element) {
    const styleId = element.dataset[HASH_ATTR];
    const styleRefAttr = camelToKebabCase(STYLE_REF_ATTR);
    const style = this.#dom.querySelector(`[data-${styleRefAttr}]`);
    if (style?.dataset[STYLE_REF_ATTR] === styleId) return style;
    throw Reporter.error('BadStyle');
  }
}

new BrowserPlatform(window).start();
