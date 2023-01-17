import { ENTRY_FILE_NAME } from './constants.js';
import Reporter from './reporter.js';
import { hasOwn, is } from './utils.js';

export default class Loader {
  #moduleCache = {};
  #namespaces = {};
  #origin;

  constructor(appUrl) {
    const delimiter = appUrl.endsWith('/') ? '' : '/';
    this.#origin = appUrl + delimiter + ENTRY_FILE_NAME;
  }

  setNamespaces(namespaces) {
    Object.assign(this.#namespaces, namespaces);
  }

  async loadSchemaModule(schemaRef) {
    const { path, input } = schemaRef;
    const { moduleUrl, defaultExport } = await this.loadModule(path);
    const isFactory = is.fn(defaultExport);
    if (!isFactory && hasOwn(schemaRef, 'input')) {
      Reporter.warn('RedundantInput', { input, moduleUrl });
    }
    const schema = isFactory ? await defaultExport(input) : defaultExport;
    return { schema, url: moduleUrl };
  }

  async loadModule(path) {
    const cache = this.#moduleCache;
    const url = path.endsWith('.js') ? path : `${path}.js`;
    const cached = cache[url];
    if (cached) return cached;
    let moduleUrl;
    if (url.startsWith('http')) moduleUrl = url;
    else moduleUrl = this.resolveNamespace(url, true);
    try {
      const defaultExport = (await import(moduleUrl)).default;
      return (cache[url] = { defaultExport, moduleUrl });
    } catch {
      return { defaultExport: 'Module not found', moduleUrl };
    }
  }

  resolveNamespace(path, makeAbsolute = false) {
    const firstSlashPos = path.indexOf('/');
    const ns = path.slice(0, firstSlashPos);
    const prefix = this.#namespaces[ns];
    let resolvedPath = path;
    if (prefix) resolvedPath = prefix + path.slice(firstSlashPos);
    if (makeAbsolute) resolvedPath = this.#createAbsoluteUrl(resolvedPath);
    return resolvedPath;
  }

  #createAbsoluteUrl(relativePath) {
    return new URL(relativePath, this.#origin).toString();
  }
}
