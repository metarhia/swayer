import { JSDOM } from 'jsdom';
import posix from 'node:path/posix';
import { pathToFileURL } from 'node:url';
import prettifyHTML from 'pretty';
import pkg from '../../package.json' assert { type: 'json' };
import SchemaCompiler from '../core.js';
import SchemaHasher from '../hasher.js';
import Loader from '../loader.js';
import Reporter from '../reporter.js';

const resolveSourcePath = (path) => {
  const workDir = posix.resolve();
  const schemaPath = posix.resolve(path);
  const relativePath = posix.relative(workDir, schemaPath);
  if (relativePath.startsWith('@')) return relativePath;
  return posix.join('/', relativePath);
};

const hashContext = (context) => {
  const { schema, binding } = context;
  binding.setData({ hydrate: SchemaHasher.hashSchema(schema) });
};

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
  }

  get loader() {
    return this.#loader;
  }

  loadConfig(path) {
    const dirUrl = pathToFileURL(path).toString();
    const appUrl = dirUrl.endsWith('/') ? dirUrl : `${dirUrl}/`;
    return this.#loader.loadConfig(appUrl);
  }

  async render(schemaRef) {
    const compilation = await this.#startCompilation(schemaRef);
    const contextGen = this.#compiler.proceed(compilation);
    const rootContext = compilation.root;
    const isRoot = rootContext.schema.tag === 'html';
    hashContext(rootContext);
    if (this.#options.ssr) await this.#renderServerTemplate(contextGen);
    else if (isRoot) await this.#renderClientTemplate(contextGen);
    let content = this.#createHtmlContent(rootContext);
    if (this.#options.pretty) content = prettifyHTML(content);
    return content;
  }

  async #renderServerTemplate(contextGenerator) {
    for await (const context of contextGenerator) {
      if (typeof context.schema === 'string') continue;
      hashContext(context);
    }
  }

  async #renderClientTemplate(contextGenerator) {
    const { value: headContext } = await contextGenerator.next();
    const headTag = headContext.schema.tag;
    if (headTag !== 'head') throw Reporter.error('HeadNotFound', headTag);
    hashContext(headContext);
    for await (const context of contextGenerator) {
      if (typeof context.schema === 'string') continue;
      const parentTag = context.parent.schema.tag;
      if (parentTag === 'body') break;
      hashContext(context);
    }
  }

  #createHtmlContent(rootContext) {
    const { schema, binding, styler: { style } } = rootContext;
    const swayerScript = this.#createSwayerScript();
    const isRoot = schema.tag === 'html';
    style.textContent = Array
      .from(style.sheet.cssRules)
      .map((rule) => rule.cssText)
      .join('\n');
    if (!isRoot) return style.outerHTML + binding.html + swayerScript.outerHTML;
    const rootNode = binding.getNativeNode();
    const container = rootNode.firstElementChild || rootNode;
    container.append(style, swayerScript);
    return this.#doctype + binding.html;
  }

  /*
  * TODO: if rootInput is an array,
  * iterate it, put items in a fragment to get innerHTML as the content,
  * otherwise only the first item will be rendered
  */

  async #startCompilation(schemaRef) {
    const compilation = await this.#compiler.start(schemaRef);
    compilation.root.binding.setData({
      swayer: pkg.version,
      src: resolveSourcePath(schemaRef.path),
    });
    return compilation;
  }

  #createSwayerScript() {
    // TODO: replace with cdn url
    const swayerSrc = '/node_modules/swayer/index.js';
    return this.#createScript(swayerSrc);
  }

  #createScript(src, options = {}) {
    const script = this.#dom.createElement('script');
    script.src = src;
    if (options.module ?? true) script.type = 'module';
    if (options.defer ?? true) script.defer = true;
    return script;
  }
}
