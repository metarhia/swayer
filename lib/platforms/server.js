import { JSDOM } from 'jsdom';
import { writeFile } from 'node:fs/promises';
import { platform } from 'node:os';
import { relative, resolve, sep } from 'node:path';
import { join as slash } from 'node:path/posix';
import prettifyHTML from 'pretty';
import pkg from '../../package.json' assert { type: 'json' };
import SchemaCompiler from '../core.js';
import SSRHash from '../hash.js';

class ServerPlatform {
  #compiler;
  #document;

  constructor(webApi) {
    this.#compiler = new SchemaCompiler(webApi);
    this.#document = webApi.document;
  }

  async build(config) {
    config.args = config.args ? JSON.parse(config.args) : {};
    let content;
    if (config.ssr) content = await this.renderFull(config);
    else content = await this.render(config);
    const htmlPath = resolve(config.path).replace('.js', '.html');
    await writeFile(htmlPath, content);
  }

  async render(config) {
    const { root: { schema, binding } } = await this.#startCompilation(config);
    if (schema.tag === 'html') {
      const title = this.#document.createElement('title');
      const swayerScript = this.#createSwayerScript(config);
      binding.element.prepend(swayerScript, title);
    }
    return this.#prepareHTML(config, binding.html);
  }

  async renderFull(config) {
    const compilation = await this.#startCompilation(config);
    const { schema, binding } = compilation.root;
    compilation.root.binding.setData({
      ssr: SSRHash.hashSchema(schema),
    });
    const contextGen = this.#compiler.proceed(compilation);
    for await (const context of contextGen) {
      if (typeof context.schema === 'string') continue;
      context.binding.setData({ ssr: SSRHash.hashSchema(context.schema) });
    }
    if (schema.tag === 'html') {
      const element = binding.element;
      const scriptParent = element.firstElementChild || element;
      const swayerScript = this.#createSwayerScript(config);
      scriptParent.prepend(swayerScript);
    }
    return this.#prepareHTML(config, binding.html);
  }

  /*
  * TODO: if rootInput is an array,
  * iterate it, put items in a fragment to get innerHTML as the content,
  * otherwise only the first item will be rendered
  */

  async #startCompilation(config) {
    const args = config.args || {};
    const path = ServerPlatform.#resolveSystemPath(config.path);
    const schemaPath = ServerPlatform.#resolveSourcePath(config.path);
    const rootSchema = { path, args };
    const compilation = await this.#compiler.start(rootSchema);
    compilation.root.binding.setData({
      swayer: pkg.version,
      src: schemaPath,
    });
    return compilation;
  }

  #prepareHTML(config, htmlContent) {
    let content = htmlContent;
    if (content.startsWith('<html')) content = '<!doctype html>' + content;
    else content += this.#createSwayerScript(config).outerHTML;
    if (config.pretty) content = prettifyHTML(content);
    return content;
  }

  #createSwayerScript(config) {
    // TODO: '/index.js' replace with <CDN> url (also change in bin/swr.js)
    const swayerSrc = config.swayerUrl || '/index.js';
    return this.#createScript(swayerSrc, true);
  }

  #createScript(src, isModule) {
    const script = this.#document.createElement('script');
    if (isModule) script.type = 'module';
    script.src = src;
    script.defer = true;
    return script;
  }

  static #resolveSourcePath(path) {
    const swayerDir = resolve();
    const schemaPath = resolve(path);
    const relativePath = relative(swayerDir, schemaPath);
    return slash('/', ...relativePath.split(sep));
  }

  static #resolveSystemPath(path) {
    const isWin = platform() === 'win32';
    const prefix = isWin ? 'file://' : '';
    return prefix + resolve(path);
  }
}

const webApi = new JSDOM('<!doctype html>').window;
export default new ServerPlatform(webApi);
