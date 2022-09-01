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

class ServerPlatform {
  #loader;
  #compiler;
  #dom;

  constructor(webApi) {
    this.#loader = new Loader();
    this.#compiler = new SchemaCompiler(webApi, this.#loader);
    this.#dom = webApi.document;
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
  render(params) {
    if (params.ssr) return this.renderFull(params);
    return this.renderPart(params);
  }

  async renderPart(params) {
    const { root: { schema, binding } } = await this.#startCompilation(params);
    if (schema.tag === 'html') {
      const title = this.#dom.createElement('title');
      const swayerScript = this.#createSwayerScript();
      binding.element.prepend(swayerScript, title);
    }
    return this.#prepareHTML(params, binding.html);
  }

  async renderFull(params) {
    const compilation = await this.#startCompilation(params);
    const { schema, binding } = compilation.root;
    binding.setData({ ssr: SSRHash.hashSchema(schema) });
    const contextGen = this.#compiler.proceed(compilation);
    for await (const context of contextGen) {
      if (typeof context.schema === 'string') continue;
      context.binding.setData({ ssr: SSRHash.hashSchema(context.schema) });
    }
    if (schema.tag === 'html') {
      const element = binding.element;
      const scriptParent = element.firstElementChild || element;
      const swayerScript = this.#createSwayerScript();
      scriptParent.prepend(swayerScript);
    }
    return this.#prepareHTML(params, binding.html);
  }

  /*
  * TODO: if rootInput is an array,
  * iterate it, put items in a fragment to get innerHTML as the content,
  * otherwise only the first item will be rendered
  */

  async #startCompilation(params) {
    const args = params.args ? JSON.parse(params.args) : {};
    const path = params.path;
    const rootSchema = { path, args };
    const compilation = await this.#compiler.start(rootSchema);
    compilation.root.binding.setData({
      swayer: pkg.version,
      src: resolveSourcePath(path),
    });
    return compilation;
  }

  #prepareHTML(params, htmlContent) {
    let content = htmlContent;
    if (content.startsWith('<html')) content = '<!doctype html>' + content;
    else content += this.#createSwayerScript().outerHTML;
    if (params.pretty) content = prettifyHTML(content);
    return content;
  }

  #createSwayerScript() {
    // TODO: replace with cdn url
    const swayerSrc = '/node_modules/swayer/index.js';
    return this.#createScript(swayerSrc, true);
  }

  #createScript(src, isModule) {
    const script = this.#dom.createElement('script');
    if (isModule) script.type = 'module';
    script.src = src;
    script.defer = true;
    return script;
  }
}

const webApi = new JSDOM('<!doctype html>').window;
export default new ServerPlatform(webApi);
