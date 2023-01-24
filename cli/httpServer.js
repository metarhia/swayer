import { createReadStream } from 'node:fs';
import fsp from 'node:fs/promises';
import http from 'node:http';
import { extname, join, normalize, resolve } from 'node:path';
import { ENTRY_FILE_NAME } from '../lib/constants.js';
import ServerPlatform from '../lib/platforms/server.js';
import Reporter from '../lib/reporter.js';

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

const UNSAFE_PATH = /^(\.\.[/\\])+/;

const getType = (filePath) => {
  const typeName = extname(filePath).slice(1);
  return FILE_TYPES[typeName];
};

const getDate = () => new Date().toISOString();

export default class HttpServer {
  #platform;

  constructor(platformOptions = {}) {
    this.#platform = new ServerPlatform(platformOptions);
  }

  async start(options) {
    const { path = './', input } = options;
    const servePath = resolve(path);
    const baseStats = await fsp.lstat(servePath);
    if (!baseStats.isDirectory()) {
      throw Reporter.error('InvalidDirPath', servePath);
    }
    const server = http.createServer(async (req, res) => {
      const routingPath = String(req.url);
      try {
        res.statusCode = 200;
        if (routingPath.includes('.')) {
          const safeSuffix = normalize(routingPath).replace(UNSAFE_PATH, '');
          const filePath = join(servePath, safeSuffix);
          await fsp.access(filePath);
          const type = getType(filePath);
          res.setHeader('Content-Type', type);
          createReadStream(filePath).pipe(res);
        } else {
          const entryPath = join(servePath, ENTRY_FILE_NAME);
          const content = await this.#platform.render(
            entryPath, input, routingPath,
          );
          res.setHeader('Content-Type', FILE_TYPES.html);
          res.end(content);
        }
      } catch (error) {
        console.log(error);
        res.statusCode = 404;
        res.end();
      }
    });
    const { host = '127.0.0.1', port = 8000 } = options;
    server.listen(port, host, () => {
      console.log(`${getDate()} Server running at http://${host}:${port}/`);
    });
  }
}
