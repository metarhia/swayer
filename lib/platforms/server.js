import { JSDOM } from 'jsdom';
import posix from 'node:path/posix';
import { pathToFileURL } from 'node:url';
import prettifyHTML from 'pretty';
import pkg from '../../package.json' assert { type: 'json' };
import SchemaCompiler from '../core.js';
import SSRHash from '../hash.js';
import Loader from '../loader.js';

const resolveSourcePath = (path) => {
  const workDir = posix.resolve();
  const schemaPath = posix.resolve(path);
  const relativePath = posix.relative(workDir, schemaPath);
  if (relativePath.startsWith('@')) return relativePath;
  return posix.join('/', relativePath);
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

  /** @returns {Promise<string>} */
  async render(schemaRef) {
    const compilation = await this.#startCompilation(schemaRef);
    const contextGen = this.#compiler.proceed(compilation);
    const context = compilation.root;
    if (this.#options.ssr) await this.#renderSSR(context, contextGen);
    else await this.#renderCSR(context, contextGen);
    let content = this.#createHtmlContent(context);
    if (this.#options.pretty) content = prettifyHTML(content);
    return content;
  }

  async #renderSSR(context, contextGen) {
    const { schema, binding } = context;
    binding.setData({ ssr: SSRHash.hashSchema(schema) });
    for await (const context of contextGen) {
      if (typeof context.schema === 'string') continue;
      context.binding.setData({ ssr: SSRHash.hashSchema(context.schema) });
    }
  }

  async #renderCSR(context, contextGen) {
    const isRoot = this.#isRootSchema(context.schema);
    if (!isRoot) return;
    for await (const ctx of contextGen) {
      const parentTag = ctx.parent?.schema.tag;
      if (parentTag === 'body') await contextGen.return(undefined);
    }
  }

  #createHtmlContent(context) {
    const { schema, binding } = context;
    const swayerScript = this.#createSwayerScript();
    const isRoot = this.#isRootSchema(schema);
    if (!isRoot) return binding.html + swayerScript.outerHTML;
    const rootNode = binding.getNativeNode();
    const scriptParent = rootNode.firstElementChild || rootNode;
    scriptParent.append(swayerScript);
    return this.#doctype + binding.html;
  }

  #isRootSchema(schema) {
    return schema.tag === 'html';
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
