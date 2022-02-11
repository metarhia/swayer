import { JSDOM } from 'jsdom';
import { writeFile } from 'node:fs/promises';
import { platform } from 'node:os';
import { relative, resolve, sep } from 'node:path';
import { join as slash } from 'node:path/posix';
import prettifyHTML from 'pretty';
import { Platform, ComponentCompiler } from '../core.js';

class AOTCompiler extends ComponentCompiler {
  async run(rootSchema, schemaSrcPath) {
    const root = await this.contextFactory.create(rootSchema);
    const rootContext = this.createComponent(root);
    rootContext.binding.setData({
      swayer: 'hydrate',
      src: schemaSrcPath,
    });
    await this.renderComponents(rootContext);
    return rootContext;
  }
}

class ServerPlatform extends Platform {

  constructor(webApi) {
    super(webApi);
    this.setCompiler(new AOTCompiler(this));
  }

  async compile(config) {
    const args = JSON.parse(config.args || '{}');
    const path = ServerPlatform.#resolveSystemPath(config.path);
    const srcPath = ServerPlatform.#resolveSourcePath(config.path);
    const rootSchema = { path, args };
    const compilation = await this.compiler.run(rootSchema, srcPath);
    return compilation.binding.element.outerHTML;
  }

  async build(config) {
    const { path, pretty } = config;
    let content = await this.compile(config);
    const htmlPath = resolve(path).replace('.js', '.html');
    if (content.startsWith('<html')) content = '<!doctype html>' + content;
    if (pretty) content = prettifyHTML(content);
    const warn = '<!-- Swayer AOT compilation: do not edit! -->\n';
    await writeFile(htmlPath, warn + content);
  }

  static #resolveSourcePath(path) {
    const swayerDir = resolve('..', '..');
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
