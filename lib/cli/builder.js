import { exec as execute } from 'node:child_process';
import fsp from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { minify } from 'terser';
import { fileURLToPath } from 'url';
import { promisify } from 'util';
import { ENTRY_FILE_NAME } from '../constants.js';
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

const BUILD_FILES = [
  'app',
  'assets',
  ENTRY_FILE_NAME,
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
  #platform;

  constructor(platformOptions = {}) {
    this.#platform = new ServerPlatform(platformOptions);
  }

  async build(options) {
    const { app, output, production: isProd } = options;
    const srcDir = app ? resolve(app) : resolve();
    const outputDir = output ? resolve(output) : resolve('dist');
    const buildFiles = BUILD_FILES.map((path) => join(srcDir, path));
    const filter = (src) => buildFiles.some((name) => src.startsWith(name));
    await this.#copyDir(srcDir, outputDir, { filter, isProd });
    await this.#runCommand('npm ci --omit=dev', outputDir);
    await this.#cleanFilesFromDir(PACKAGE_FILES, outputDir);
    await this.#writeMain(srcDir, outputDir);
  }

  async createStarter(name) {
    const currentDir = dirname(fileURLToPath(import.meta.url));
    const templateDir = join(currentDir, 'templates', 'starterApp');
    const destDir = resolve(name);
    await fsp.cp(templateDir, destDir, { recursive: true });
    await this.#runCommand('npm i', destDir);
  }

  async #runCommand(command, cwd) {
    const { stdout } = await exec(command, { cwd });
    console.log(stdout);
  }

  async #cleanFilesFromDir(files, dir) {
    const removals = files.map((path) => {
      const file = join(dir, path);
      return fsp.rm(file);
    });
    await Promise.all(removals);
  }

  async #writeMain(appDir, outputDir) {
    const content = await this.#platform.renderApp(appDir, '/');
    let htmlPath = resolve(outputDir, ENTRY_FILE_NAME);
    if (htmlPath.endsWith('.js')) htmlPath = htmlPath.replace('.js', '.html');
    else htmlPath += '.html';
    await fsp.writeFile(htmlPath, content);
  }

  async #copyDir(srcDir, destDir, options = {}) {
    const { filter = () => true, isProd = false } = options;
    await ensureDirAccess(destDir);
    for await (const srcFile of this.#iterateFiles(srcDir)) {
      if (filter(srcFile)) {
        const destFile = srcFile.replace(srcDir, destDir);
        await ensureDirAccess(dirname(destFile));
        const minify = srcFile.endsWith('.js') && isProd;
        if (minify) await this.#writeMinified(srcFile, destFile);
        else await fsp.copyFile(srcFile, destFile);
      }
    }
  }

  async #writeMinified(srcFile, destFile) {
    const source = await fsp.readFile(srcFile, 'utf-8');
    const { code = '' } = await minify(source, TERSER_OPTIONS);
    return fsp.writeFile(destFile, code);
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
