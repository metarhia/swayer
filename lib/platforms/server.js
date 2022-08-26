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

  constructor(webApi) {
    this.#compiler = new SchemaCompiler(webApi);
  }

  async build(config) {
    const content = await this.render(config);
    const htmlPath = resolve(config.path).replace('.js', '.html');
    await writeFile(htmlPath, content);
  }

  async render(config) {
    const args = config.args ? JSON.parse(config.args) : {};
    const path = ServerPlatform.#resolveSystemPath(config.path);
    const srcPath = ServerPlatform.#resolveSourcePath(config.path);
    const rootSchema = { path, args };
    const { schema, binding } = await this.#compile(rootSchema, srcPath);
    // TODO: '/index.js' replace with <CDN> url (also change in bin/swr.js)
    const swayerSrc = config.swayerUrl || '/index.js';
    const swayerScript = this.#createScript(swayerSrc, true);
    const element = binding.element;
    if (schema.tag === 'html') element.firstElementChild.append(swayerScript);
    let content = binding.html;
    if (content.startsWith('<html')) content = '<!doctype html>' + content;
    else content += swayerScript.outerHTML;
    if (config.pretty) content = prettifyHTML(content);
    const warn = '<!-- Swayer HTML compilation: do not edit! -->\n';
    return warn + content;
  }

  /*
  * TODO: if rootSchema is an array,
  * iterate it, put items in a fragment to get innerHTML as the content,
  * otherwise only the first item will be rendered
  */

  async #compile(rootSchema, schemaSrcPath) {
    const compilation = await this.#compiler.start(rootSchema);
    compilation.root.binding.setData({
      swayer: pkg.version,
      src: schemaSrcPath,
      ssr: SSRHash.hashSchema(compilation.root.schema),
    });
    const contextGen = this.#compiler.proceed(compilation);
    for await (const context of contextGen) {
      if (typeof context.schema === 'string') continue;
      context.binding.setData({ ssr: SSRHash.hashSchema(context.schema) });
    }
    return compilation.root;
  }

  #createScript(src, isModule) {
    const doc = this.#compiler.webApi.document;
    const script = doc.createElement('script');
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
