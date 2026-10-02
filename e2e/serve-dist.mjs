// Serves a production build the way the README asks hosts to: with CORS, so
// the Preview's opaque-origin iframe can load its module scripts.
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import { extname, join, normalize } from 'node:path';

const [root, port] = process.argv.slice(2);

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.map': 'application/json',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
};

createServer(async (request, response) => {
  const { pathname } = new URL(request.url, 'http://localhost');
  const relative = pathname === '/' ? 'index.html' : decodeURIComponent(pathname);
  const file = join(root, normalize(relative).replace(/^(\.\.[/\\])+/, ''));
  try {
    if (!(await stat(file)).isFile()) throw new Error('not a file');
  } catch {
    response.writeHead(404).end();
    return;
  }
  response.writeHead(200, {
    'Content-Type': TYPES[extname(file)] ?? 'application/octet-stream',
    'Access-Control-Allow-Origin': '*',
  });
  createReadStream(file).pipe(response);
}).listen(Number(port));
