// Lentera Malam — tiny static server for local play (Node 22, stdlib only).
// A development convenience, not part of the entry: `node serve.ts`
// serves game/ on http://localhost:8080. It sends the MIME types a
// browser game needs and refuses any path outside game/.

import { readFileSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('./game', import.meta.url)));
const requested = Number(process.argv[2]) || 8080;
const port = Number.isInteger(requested) && requested > 0 && requested < 65536 ? requested : 8080;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
};

createServer((request, response) => {
  // Local Network Access (Chrome 138+): a navigation to a loopback
  // origin from a public context sends a preflight that must be
  // answered with Access-Control-Allow-Local-Network, or the document
  // is blocked. Answer it, and stamp the header on every response.
  const lnaHeaders = {
    'access-control-allow-local-network': 'true',
    'access-control-allow-private-network': 'true',
  };
  if (request.method === 'OPTIONS') {
    response.writeHead(204, {
      ...lnaHeaders,
      'access-control-allow-origin': '*',
      'access-control-allow-methods': 'GET, OPTIONS',
      'access-control-allow-headers': '*',
    });
    response.end();
    return;
  }
  const url = new URL(request.url ?? '/', 'http://localhost');
  let pathname = url.pathname;
  try {
    pathname = decodeURIComponent(pathname);
  } catch {
    response.writeHead(400).end('bad request');
    return;
  }
  if (pathname.endsWith('/')) pathname += 'index.html';
  const file = resolve(join(root, normalize(pathname)));
  if (file !== root && !file.startsWith(root + sep)) {
    response.writeHead(403).end('forbidden');
    return;
  }
  let body;
  try {
    if (!statSync(file).isFile()) throw new Error('not a file');
    body = readFileSync(file);
  } catch {
    response.writeHead(404).end('not found');
    return;
  }
  response.writeHead(200, {
    ...lnaHeaders,
    'content-type': MIME[extname(file).toLowerCase()] ?? 'application/octet-stream',
    'content-length': body.length,
    'cache-control': 'no-store',
  });
  response.end(body);
}).listen(port, '127.0.0.1', () => {
  console.log(`game/ is on http://localhost:${port}`);
});
