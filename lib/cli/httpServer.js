import { createReadStream } from 'node:fs';
import fsp from 'node:fs/promises';
import http from 'node:http';
import { extname, join, normalize, resolve } from 'node:path';
import ServerPlatform from '../platforms/server.js';

const FILE_TYPES = {
  html: 'text/html',
  css: 'text/css',
  js: 'text/javascript',
  json: 'application/json',
  ico: 'image/x-icon',
  png: 'image/png',
  jpg: 'image/jpg',
  svg: 'image/svg+xml',
};

const getType = (filePath) => {
  const typeName = extname(filePath).slice(1);
  return FILE_TYPES[typeName];
};

export default class HttpServer {
  #options;
  #platform;

  constructor(options = {}) {
    this.#options = options;
    this.#platform = new ServerPlatform(options);
  }

  async start() {
    const basePath = resolve(this.#options.path || '.');
    const baseStats = await fsp.lstat(basePath);
    if (!baseStats.isDirectory()) {
      throw new Error('Not a directory. Provide correct directory path.');
    }
    const config = await this.#platform.loadConfig(basePath);
    const routes = config.routes;
    const server = http.createServer(async (req, res) => {
      const url = String(req.url);
      const schemaPath = routes[url];
      try {
        res.statusCode = 200;
        if (schemaPath) {
          const content = await this.#platform.render({
            path: schemaPath,
          });
          res.setHeader('Content-Type', FILE_TYPES.html);
          res.end(content);
        } else {
          const safeSuffix = normalize(url).replace(/^(\.\.[/\\])+/, '');
          const filePath = join(basePath, safeSuffix);
          await fsp.access(filePath);
          const type = getType(filePath);
          res.setHeader('Content-Type', type);
          createReadStream(filePath).pipe(res);
        }
      } catch (error) {
        console.log(error);
        res.statusCode = 404;
        res.end();
      }
    });
    const { host = '127.0.0.1', port = 8000 } = this.#options;
    server.listen(port, host, () => {
      console.log(`Server running at http://${host}:${port}/`);
    });
  }
}
