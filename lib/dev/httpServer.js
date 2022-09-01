import { createReadStream } from 'node:fs';
import fsp from 'node:fs/promises';
import http from 'node:http';
import { extname, join, normalize, resolve } from 'node:path';
import serverPlatform from '../platforms/server.js';

const FILE_TYPES = {
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpg',
};

const getType = (filePath) => {
  const ext = extname(filePath);
  return FILE_TYPES[ext];
};

export default class HttpServer {
  #platform = serverPlatform;
  #config;

  constructor(config) {
    this.#config = config;
  }

  async start() {
    const basePath = resolve(this.#config.path || '.');
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
            ...this.#config,
            path: schemaPath,
          });
          res.setHeader('Content-Type', 'text/html');
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
    const { host = '127.0.0.1', port = 8000 } = this.#config;
    server.listen(port, host, () => {
      console.log(`Server running at http://${host}:${port}/`);
    });
  }
}
