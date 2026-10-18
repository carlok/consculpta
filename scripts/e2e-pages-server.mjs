// SPDX-License-Identifier: Apache-2.0
/** Static server for e2e: serves the repo like GitHub Pages at /consculpta/. */
import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize } from 'node:path';

const root = process.cwd();
const prefix = '/consculpta';
const port = Number(process.env.E2E_PORT || 4173);

const types = {
  '.css': 'text/css',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json',
  '.mp3': 'audio/mpeg',
  '.woff2': 'font/woff2',
};

const server = createServer((req, res) => {
  const raw = (req.url ?? '/').split('?')[0];
  if (!raw.startsWith(prefix)) {
    res.writeHead(302, { Location: `${prefix}/` });
    res.end();
    return;
  }
  let rel = raw.slice(prefix.length);
  if (rel === '' || rel === '/') rel = '/index.html';
  const file = normalize(join(root, rel.replace(/^\//, '')));
  if (!file.startsWith(root) || !existsSync(file) || statSync(file).isDirectory()) {
    res.writeHead(404);
    res.end('Not found');
    return;
  }
  const ext = extname(file);
  res.writeHead(200, { 'Content-Type': types[ext] ?? 'application/octet-stream' });
  createReadStream(file).pipe(res);
});

server.listen(port, '127.0.0.1', () => {
  process.stdout.write(`e2e pages server http://127.0.0.1:${port}${prefix}/\n`);
});
