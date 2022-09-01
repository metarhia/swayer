import fsp from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import Loader from '../loader.js';
import serverPlatform from '../platforms/server.js';

const ensureDirAccess = async (dirPath) => {
  try {
    await fsp.access(dirPath);
  } catch {
    await fsp.mkdir(dirPath, { recursive: true });
  }
};

export default class Builder {
  #platform = serverPlatform;
  #appDir;
  #outputDir;
  #params;
  #includeFiles;

  constructor(params) {
    const { app, src, output } = params;
    this.#appDir = app ? resolve(app) : resolve();
    this.#outputDir = output ? resolve(output) : resolve('dist');
    this.#params = params;
    this.#includeFiles = [
      join(this.#appDir, src || 'app'),
      join(this.#appDir, Loader.CONFIG_FILE_NAME),
    ];
  }

  async build() {
    const appDir = this.#appDir;
    const path = this.#params.path ? resolve(this.#params.path) : appDir;
    const config = await this.#platform.loadConfig(appDir);
    const routes = config.routes;
    await this.#copyFolder(appDir, this.#outputDir, this.#includeFiles);
    if (routes && appDir.endsWith(path)) {
      const mapRoutePath = (path) => ({ ...this.#params, path });
      const pages = Object.values(routes).map(mapRoutePath);
      const writes = pages.map((params) => this.#writeComponent(params));
      return Promise.all(writes);
    }
    await this.#writeComponent();
  }

  async #writeComponent(params = this.#params) {
    const content = await this.#platform.render(params);
    const resolvedPath = this.#platform.loader.resolveNamespace(params.path);
    let htmlPath = resolve(this.#outputDir, resolvedPath);
    if (htmlPath.endsWith('.js')) htmlPath = htmlPath.replace('.js', '.html');
    else htmlPath += '.html';
    await fsp.writeFile(htmlPath, content);
  }

  async #copyFolder(src, dest, include = []) {
    await ensureDirAccess(dest);
    for await (const srcFile of this.#iterateFiles(src)) {
      if (include.some((name) => srcFile.startsWith(name))) {
        const destFile = srcFile.replace(src, dest);
        await ensureDirAccess(dirname(destFile));
        await fsp.copyFile(srcFile, destFile);
      }
    }
  }

  async *#iterateFiles(dirPath) {
    const dirents = await fsp.readdir(dirPath, { withFileTypes: true });
    for (const dirent of dirents) {
      const file = resolve(dirPath, dirent.name);
      if (dirent.isDirectory()) yield* this.#iterateFiles(file);
      else yield file;
    }
  }
}
