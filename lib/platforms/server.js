import { JSDOM } from 'jsdom';
import posix from 'node:path/posix';
import { pathToFileURL } from 'node:url';
import prettifyHTML from 'pretty';
import pkg from '../../package.json' assert { type: 'json' };
import NodeBinding from '../binding.js';
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
import Renderer from '../renderer.js';
import Reporter from '../reporter.js';
import { hasOwn } from '../utils.js';

const resolveSourcePath = (path) => {
  const workDir = posix.resolve();
  const schemaPath = posix.resolve(path);
  const relativePath = posix.relative(workDir, schemaPath);
  if (relativePath.startsWith('@')) return relativePath;
  return posix.join('/', relativePath);
};

class ServerRenderer extends Renderer {
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
}

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

class FragmentRenderer extends Renderer {
  createBinding() {
    const webApi = this.webApi;
    const schema = this.context.schema;
    const fragment = webApi.document.createDocumentFragment();
    return new NodeBinding(webApi, schema, fragment);
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

  /*
  * TODO: if rootInput is an array,
  * iterate it, put items in a fragment to get innerHTML as the content,
  * otherwise only the first item will be rendered
  */

  async renderApp(urlPath, appUrl) {
    const engine = this.#createEngine(appUrl);
    const hasher = new ContextHasher();
    const schemaRef = { path: ENTRY_FILE_NAME };
    engine.setRendererType(FragmentRenderer);
    const rootContext = await engine.createRootContext(schemaRef, urlPath);
    const style = this.#webApi.document.createElement('style');
    const ruleHandler = (rule) => (style.textContent += rule);
    rootContext.createStyler(ruleHandler);
    engine.setRendererType(ServerRenderer);
    const generator = engine.start(rootContext);
    const { value: htmlContext } = await generator.next();
    style.dataset[STYLE_REF_ATTR] = hasher.hashContext(htmlContext);
    htmlContext.binding.setData({
      [APP_ATTR]: pkg.version,
      [SRC_ATTR]: resolveSourcePath(schemaRef.path),
    });
    const isSSR = this.#options.ssr;
    if (isSSR) await this.#renderSSRTpl(generator, hasher);
    else await this.#renderCSRTpl(generator, hasher);
    await htmlContext.renderer.waitRenderQueue();
    let content = this.#createHtmlContent(htmlContext, style);
    if (this.#options.pretty) content = prettifyHTML(content);
    return content;
  }

  #createEngine(appUrl) {
    const dirUrl = pathToFileURL(appUrl).toString();
    const appFileUrl = dirUrl.endsWith('/') ? dirUrl : `${dirUrl}/`;
    return new SwayerEngine(this.#webApi, appFileUrl);
  }

  async #renderSSRTpl(generator, hasher) {
    for await (const context of generator) {
      if (typeof context.schema === 'string') continue;
      hasher.hashContext(context);
    }
  }

  async #renderCSRTpl(generator, hasher) {
    const { value: headContext } = await generator.next();
    const headTag = headContext?.schema.tag;
    if (headTag !== 'head') throw Reporter.error('HeadNotFound', headTag);
    hasher.hashContext(headContext);
    for await (const context of generator) {
      if (typeof context.schema === 'string') continue;
      hasher.hashContext(context);
      if (context.schema.tag === 'body') break;
    }
  }

  #createHtmlContent(htmlContext, style) {
    const mode = this.#options.ssr ? SSR_MODE : CSR_MODE;
    htmlContext.binding.setData({ [MODE_ATTR]: mode });
    const htmlBinding = htmlContext.binding;
    const swayerScript = this.#createSwayerScript();
    const rootNode = htmlBinding.getNativeNode();
    const container = rootNode.firstElementChild || rootNode;
    container.append(style, swayerScript);
    return this.#doctype + htmlBinding.html;
  }

  // TODO: replace with cdn url

  #createSwayerScript() {
    const script = this.#webApi.document.createElement('script');
    script.src = '/node_modules/swayer/index.js';
    script.type = 'module';
    return script;
  }
}
