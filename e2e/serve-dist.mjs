// Serves a production build the way the README asks hosts to: with CORS, so
// the Preview's opaque-origin iframe can load its module scripts. With
// --no-cors, serves it like a host that can't, for a same-origin Preview build.
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import { extname, resolve, sep } from 'node:path';

const [dir, port] = process.argv.slice(2);
const cors = !process.argv.includes('--no-cors');
const root = resolve(dir);

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.map': 'application/json',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
};

/** The file under `root` that `url` names, or undefined if it names none. */
async function fileFor(url) {
  try {
    const { pathname } = new URL(url, 'http://localhost');
    const path = pathname.endsWith('/') ? `${pathname}index.html` : pathname;
    const file = resolve(root, `.${decodeURIComponent(path)}`);
    if (!file.startsWith(root + sep)) return undefined;
    return (await stat(file)).isFile() ? file : undefined;
  } catch {
    return undefined;
  }
}

createServer(async (request, response) => {
  const file = await fileFor(request.url);
  if (!file) {
    response.writeHead(404).end();
    return;
  }
  response.writeHead(200, {
    'Content-Type': TYPES[extname(file)] ?? 'application/octet-stream',
    ...(cors && { 'Access-Control-Allow-Origin': '*' }),
  });
  createReadStream(file)
    .on('error', () => response.destroy())
    .pipe(response);
}).listen(Number(port), '127.0.0.1');
