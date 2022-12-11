import { exec as execute } from 'node:child_process';
import fsp from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { minify } from 'terser';
import { promisify } from 'util';
import Loader from '../loader.js';
import ServerPlatform from '../platforms/server.js';

const exec = promisify(execute);

const ensureDirAccess = async (dirPath) => {
  try {
    await fsp.access(dirPath);
  } catch {
    await fsp.mkdir(dirPath, { recursive: true });
  }
};

const PACKAGE_FILES = [
  'package.json',
  'package-lock.json',
];

const DIST_STRUCT = [
  'app',
  'assets',
  Loader.ENTRY_FILE_NAME,
  ...PACKAGE_FILES,
];

const TERSER_OPTIONS = {
  module: true,
  format: {
    // eslint-disable-next-line camelcase
    quote_style: 3,
  },
};

export default class Builder {
  #options;
  #platform;
  #appDir;
  #outputDir;
  #buildStructure;

  constructor(options) {
    const { app, output } = options;
    this.#options = options;
    this.#platform = new ServerPlatform(options);
    this.#appDir = app ? resolve(app) : resolve();
    this.#outputDir = output ? resolve(output) : resolve('dist');
    this.#buildStructure = DIST_STRUCT.map((path) => join(this.#appDir, path));
  }

  async build() {
    const appDir = this.#appDir;
    const path = this.#options.path ? resolve(this.#options.path) : appDir;
    const config = await this.#platform.loadEntry(appDir);
    const routes = config?.routes;
    await this.#copySources();
    await this.#installModules();
    if (routes && appDir.endsWith(path)) {
      const pages = Object.values(routes).map((path) => ({ path }));
      const writes = pages.map((options) => this.#writeComponent(options));
      return Promise.all(writes);
    }
    await this.#writeComponent();
  }

  async #installModules() {
    const command = 'npm ci --omit=dev';
    const { stdout } = await exec(command, { cwd: this.#outputDir });
    const removals = PACKAGE_FILES.map((path) => {
      const file = join(this.#outputDir, path);
      return fsp.rm(file);
    });
    await Promise.all(removals);
    console.log(stdout);
  }

  async #writeComponent(options = this.#options) {
    const path = options.path;
    const schemaRef = { path };
    const content = await this.#platform.render(schemaRef);
    const resolvedPath = this.#platform.loader.resolveNamespace(path);
    let htmlPath = resolve(this.#outputDir, resolvedPath);
    if (htmlPath.endsWith('.js')) htmlPath = htmlPath.replace('.js', '.html');
    else htmlPath += '.html';
    await fsp.writeFile(htmlPath, content);
  }

  async #copySources() {
    const src = this.#appDir;
    const dest = this.#outputDir;
    await ensureDirAccess(dest);
    for await (const srcFile of this.#iterateFiles(src)) {
      if (this.#buildStructure.some((name) => srcFile.startsWith(name))) {
        const destFile = srcFile.replace(src, dest);
        await ensureDirAccess(dirname(destFile));
        if (srcFile.endsWith('.js')) await this.#copyJs(srcFile, destFile);
        else await fsp.copyFile(srcFile, destFile);
      }
    }
  }

  async #copyJs(srcFile, destFile) {
    if (this.#options.production) {
      const source = await fsp.readFile(srcFile, 'utf-8');
      const { code = '' } = await minify(source, TERSER_OPTIONS);
      return fsp.writeFile(destFile, code);
    }
    await fsp.copyFile(srcFile, destFile);
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
