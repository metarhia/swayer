import { JSDOM } from 'jsdom';
import { writeFile } from 'node:fs/promises';
import { platform } from 'node:os';
import { relative, resolve, sep } from 'node:path';
import { join as slash } from 'node:path/posix';
import hash from 'object-hash';
import prettifyHTML from 'pretty';
import { SchemaCompiler } from '../core.js';

// TODO Implement object-hash (metahash)
// Platform dependent schema props
const EXCLUDE_HASH_KEYS = ['base', 'meta', 'channels', 'state'];
const HASH_LENGTH = 8;
const HASH_OPTIONS = {
  respectType: false,
  excludeKeys: (key) => EXCLUDE_HASH_KEYS.includes(key),
};

const createSsrHash = (schema) => {
  const hashString = hash(schema, HASH_OPTIONS);
  return hashString.slice(-HASH_LENGTH);
};

class AOTCompiler extends SchemaCompiler {
  async run(rootSchema, schemaSrcPath) {
    const compilation = await this.start(rootSchema);
    compilation.root.binding.setData({
      swayer: 'hydrate',
      src: schemaSrcPath,
      ssr: createSsrHash(rootSchema),
    });
    const contextGen = this.proceed(compilation);
    for await (const context of contextGen) {
      if (typeof context.schema === 'string') continue;
      context.binding.setData({ ssr: createSsrHash(context.schema) });
    }
    return compilation.root;
  }
}

class ServerPlatform {
  #compiler;

  constructor(webApi) {
    this.#compiler = new AOTCompiler(webApi);
  }

  #createScript(src, isModule) {
    const doc = this.#compiler.webApi.document;
    const script = doc.createElement('script');
    if (isModule) script.type = 'module';
    script.src = src;
    script.defer = true;
    return script;
  }

  async compile(config) {
    const args = JSON.parse(config.args || '{}');
    const path = ServerPlatform.#resolveSystemPath(config.path);
    const srcPath = ServerPlatform.#resolveSourcePath(config.path);
    const rootSchema = { path, args };
    const { schema, binding } = await this.#compiler.run(rootSchema, srcPath);
    // Temp lib
    const hashScript = this.#createScript('/node_modules/object-hash/dist/object_hash.js');
    // TODO refactor, support standalone components
    const swayerScript = this.#createScript('/index.js', true);
    if (schema.tag === 'html') {
      binding.element.lastElementChild.append(hashScript, swayerScript);
    }
    return binding.html;
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
