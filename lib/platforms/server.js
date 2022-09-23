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

  /*
  * TODO: if rootInput is an array,
  * iterate it, put items in a fragment to get innerHTML as the content,
  * otherwise only the first item will be rendered
  */

  async render(schemaRef) {
    const rootContext = await this.#compiler.createRoot(schemaRef);
    const style = this.#dom.createElement('style');
    const ruleHandler = (rule) => (style.textContent += rule);
    rootContext.createStyler(ruleHandler);
    const compilation = await this.#compiler.start(rootContext);
    const root = compilation.root;
    hashContext(root);
    root.binding.setData({
      swayer: pkg.version,
      src: resolveSourcePath(schemaRef.path),
    });
    const contextGen = this.#compiler.proceed(compilation);
    const isRoot = root.schema.tag === 'html';
    if (this.#options.ssr) await this.#renderServerTemplate(root, contextGen);
    else if (isRoot) await this.#renderClientTemplate(root, contextGen);
    let content = this.#createHtmlContent(root, style);
    if (this.#options.pretty) content = prettifyHTML(content);
    return content;
  }

  async #renderServerTemplate(root, contextGenerator) {
    root.binding.setData({ mode: 'ssr' });
    for await (const context of contextGenerator) {
      if (typeof context.schema === 'string') continue;
      hashContext(context);
    }
  }

  async #renderClientTemplate(root, contextGenerator) {
    root.binding.setData({ mode: 'csr' });
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

  #createHtmlContent(rootContext, style) {
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
