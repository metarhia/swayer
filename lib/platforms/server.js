import { JSDOM } from 'jsdom';
import posix from 'node:path/posix';
import { pathToFileURL } from 'node:url';
import prettifyHTML from 'pretty';
import pkg from '../../package.json' assert { type: 'json' };
import { FragmentBinding } from '../binding.js';
import {
  APP_ATTR,
  CSR_MODE,
  ENTRY_FILE_NAME,
  HASH_ATTR,
  MODE_ATTR,
  SRC_ATTR,
  SSR_MODE,
  STYLE_REF_ATTR,
} from '../constants.js';
import SwayerEngine from '../core.js';
import SchemaHasher from '../hasher.js';
import { ElementRenderer, HeadRenderer, Renderer } from '../renderer.js';
import Reporter from '../reporter.js';
import { hasOwn, is } from '../utils.js';

const resolveSourcePath = (path) => {
  const workDir = posix.resolve();
  const schemaPath = posix.resolve(path);
  const relativePath = posix.relative(workDir, schemaPath);
  if (relativePath.startsWith('@')) return relativePath;
  return posix.join('/', relativePath);
};

class ContextHasher {
  #hashes = {};

  hashContext(context) {
    const { schema, binding } = context;
    const schemaHash = SchemaHasher.hashSchema(schema);
    return this.#setHash(binding, schemaHash);
  }

  #setHash(binding, schemaHash) {
    const hashes = this.#hashes;
    const index = hasOwn(hashes, schemaHash)
      ? hashes[schemaHash] += 1
      : hashes[schemaHash] = 0;
    const hash = `${schemaHash}_${index}`;
    binding.setData({ [HASH_ATTR]: hash });
    return hash;
  }
}

class ServerEngine extends SwayerEngine {
  hasher;

  async createContext(schema, parent = null) {
    this.hasher = new ContextHasher();
    const context = await super.createContext(schema, parent);
    this.hasher.hashContext(context);
    return context;
  }
}

class SSREngine extends ServerEngine {
  renderContext(context) {
    if (!is.str(context.schema)) this.hasher.hashContext(context);
    return super.renderContext(context);
  }
}

class CSREngine extends ServerEngine {
  renderContext(context) {
    this.hasher.hashContext(context);
    const renderedContext = super.renderContext(context);
    const isBodyReached = renderedContext.schema.tag === 'body';
    if (isBodyReached) return false;
    return renderedContext;
  }
}

const createServerRenderer = (Base) => class extends Base {
  renderQueue;

  constructor(engine, context) {
    super(engine, context);
    this.renderQueue = context.parent?.renderer.renderQueue || [];
  }

  renderChildren(inputArray) {
    const asyncTask = super.renderChildren(inputArray);
    this.renderQueue.push(asyncTask);
    return asyncTask;
  }

  renderSegment(input, segIndex) {
    const asyncTask = super.renderSegment(input, segIndex);
    this.renderQueue.push(asyncTask);
    return asyncTask;
  }

  async waitRenderQueue() {
    await Promise.all(this.renderQueue);
    this.renderQueue.length = 0;
  }
};

class FragmentRenderer extends createServerRenderer(Renderer) {
  style;

  constructor(engine, context) {
    super(engine, context);
    this.#initStyle();
  }

  createBinding() {
    const webApi = this.engine.webApi;
    const schema = this.context.schema;
    return new FragmentBinding(webApi, schema);
  }

  render() {}

  replace() {}

  #initStyle() {
    this.style = this.engine.webApi.document.createElement('style');
    const ruleHandler = (rule) => (this.style.textContent += rule);
    this.context.createStyler(ruleHandler);
  }
}

class HtmlRenderer extends createServerRenderer(ElementRenderer) {
  render() {
    const root = this.context.parent;
    this.binding.setData({
      [APP_ATTR]: pkg.version,
      [SRC_ATTR]: resolveSourcePath(root.originalSchema.path),
      [MODE_ATTR]: this.engine.constructor === SSREngine ? SSR_MODE : CSR_MODE,
    });
    const style = this.context.parent.renderer.style;
    style.dataset[STYLE_REF_ATTR] = this.binding.data[HASH_ATTR];
    super.render();
  }
}

class HeadServerRenderer extends createServerRenderer(HeadRenderer) {
  render() {
    const swayer = this.#createSwayerScript();
    const style = this.context.parent.parent.renderer.style;
    const head = this.binding.getNativeNode();
    head.append(swayer, style);
    super.render();
  }

  replace(context) {
    super.replace(context);
    const head = context.binding.getNativeNode();
    const swayer = this.#createSwayerScript();
    head.append(swayer);
  }

  #createSwayerScript() {
    const script = this.engine.webApi.document.createElement('script');
    // todo: replace with cdn url
    script.src = '/node_modules/swayer/index.js';
    script.type = 'module';
    return script;
  }
}

export default class ServerPlatform {
  #options;
  #webApi;
  #doctype;

  constructor(options = {}) {
    this.#options = options;
    this.#webApi = new JSDOM().window;
    this.#doctype = '<!doctype html>';
  }

  async renderApp(appUrl, routingPath) {
    const engine = this.#createEngine(appUrl, routingPath);
    const schemaRef = { path: ENTRY_FILE_NAME };
    const generator = await engine.run(schemaRef);
    const htmlContext = await this.#createHtml(generator);
    await this.#createHead(generator);
    await engine.finalize(generator);
    await htmlContext.renderer.waitRenderQueue();
    return this.#createHtmlContent(htmlContext);
  }

  #createEngine(appUrl, routingPath) {
    const dirUrl = pathToFileURL(appUrl).toString();
    const appFileUrl = dirUrl.endsWith('/') ? dirUrl : `${dirUrl}/`;
    const Engine = this.#options.ssr ? SSREngine : CSREngine;
    const engine = new Engine(this.#webApi, appFileUrl, routingPath);
    engine.setRendererTypes({
      root: FragmentRenderer,
      html: HtmlRenderer,
      head: HeadServerRenderer,
      element: createServerRenderer(ElementRenderer),
    });
    return engine;
  }

  async #createHtml(generator) {
    const { value: htmlContext } = await generator.next();
    const htmlTag = htmlContext?.schema.tag;
    if (htmlTag !== 'html') throw Reporter.error('HtmlNotFound', htmlTag);
    return htmlContext;
  }

  async #createHead(generator) {
    const { value: headContext } = await generator.next();
    const headTag = headContext?.schema.tag;
    if (headTag !== 'head') throw Reporter.error('HeadNotFound', headTag);
    return headContext;
  }

  #createHtmlContent(htmlContext) {
    let content = this.#doctype + htmlContext.binding.html;
    if (this.#options.pretty) content = prettifyHTML(content);
    return content;
  }
}
