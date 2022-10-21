import { JSDOM } from 'jsdom';
import posix from 'node:path/posix';
import { pathToFileURL } from 'node:url';
import prettifyHTML from 'pretty';
import pkg from '../../package.json' assert { type: 'json' };
import {
  APP_ATTR,
  CSR_MODE, HASH_ATTR, MODE_ATTR,
  SRC_ATTR,
  SSR_MODE,
  STYLE_REF_ATTR,
} from '../constants.js';
import SchemaCompiler from '../core.js';
import SchemaHasher from '../hasher.js';
import Loader from '../loader.js';
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

  constructor(compiler, context) {
    super(compiler, context);
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

export default class ServerPlatform {
  #options;
  #loader;
  #compiler;
  #dom;
  #doctype;

  constructor(options = {}) {
    const webApi = new JSDOM().window;
    this.#options = options;
    this.#loader = new Loader();
    this.#compiler = new SchemaCompiler(webApi, this.#loader);
    this.#dom = webApi.document;
    this.#doctype = '<!doctype html>';
    this.#compiler.setRendererType(ServerRenderer);
  }

  get loader() {
    return this.#loader;
  }

  loadConfig(path) {
    const dirUrl = pathToFileURL(path).toString();
    const appUrl = dirUrl.endsWith('/') ? dirUrl : `${dirUrl}/`;
    return this.#loader.loadConfig(appUrl);
  }

  /*
  * TODO: if rootInput is an array,
  * iterate it, put items in a fragment to get innerHTML as the content,
  * otherwise only the first item will be rendered
  */

  async render(schemaRef) {
    const hasher = new ContextHasher();
    const rootContext = await this.#compiler.createRoot(schemaRef);
    const style = this.#dom.createElement('style');
    const ruleHandler = (rule) => (style.textContent += rule);
    rootContext.createStyler(ruleHandler);
    const compilation = await this.#compiler.start(rootContext);
    const root = compilation.root;
    style.dataset[STYLE_REF_ATTR] = hasher.hashContext(root);
    root.binding.setData({
      [APP_ATTR]: pkg.version,
      [SRC_ATTR]: resolveSourcePath(schemaRef.path),
    });
    const contextGen = this.#compiler.proceed(compilation);
    const isRoot = root.schema.tag === 'html';
    if (this.#options.ssr) await this.#renderSSRTpl(root, contextGen, hasher);
    else if (isRoot) await this.#renderCSRTpl(root, contextGen, hasher);
    await root.renderer.waitRenderQueue();
    let content = this.#createHtmlContent(root, style);
    if (this.#options.pretty) content = prettifyHTML(content);
    return content;
  }

  async #renderSSRTpl(root, contextGenerator, hasher) {
    for await (const context of contextGenerator) {
      if (typeof context.schema === 'string') continue;
      hasher.hashContext(context);
    }
  }

  async #renderCSRTpl(root, contextGenerator, hasher) {
    const { value: headContext } = await contextGenerator.next();
    const headTag = headContext.schema.tag;
    if (headTag !== 'head') throw Reporter.error('HeadNotFound', headTag);
    hasher.hashContext(headContext);
    for await (const context of contextGenerator) {
      if (typeof context.schema === 'string') continue;
      hasher.hashContext(context);
      if (context.schema.tag === 'body') break;
    }
  }

  #createHtmlContent(rootContext, style) {
    const mode = this.#options.ssr ? SSR_MODE : CSR_MODE;
    rootContext.binding.setData({ [MODE_ATTR]: mode });
    const { schema, binding } = rootContext;
    const swayerScript = this.#createSwayerScript();
    const isRoot = schema.tag === 'html';
    if (!isRoot) return style.outerHTML + binding.html + swayerScript.outerHTML;
    const rootNode = binding.getNativeNode();
    const container = rootNode.firstElementChild || rootNode;
    container.append(style, swayerScript);
    return this.#doctype + binding.html;
  }

  // TODO: replace with cdn url

  #createSwayerScript() {
    const script = this.#dom.createElement('script');
    script.src = '/node_modules/swayer/index.js';
    script.type = 'module';
    return script;
  }
}
