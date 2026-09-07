#!/usr/bin/env node
// ローカル確認用の簡易サーバー。`npm run serve` で http://localhost:8080
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { join, extname } from 'node:path';

const dir = new URL('../dist/', import.meta.url).pathname;
const port = Number(process.env.PORT ?? 8080);
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8', '.json': 'application/json', '.xml': 'application/xml',
  '.txt': 'text/plain; charset=utf-8', '.svg': 'image/svg+xml' };

createServer(async (req, res) => {
  let path = join(dir, decodeURIComponent(req.url.split('?')[0]));
  try {
    if ((await stat(path)).isDirectory()) path = join(path, 'index.html');
  } catch {}
  try {
    const buf = await readFile(path);
    res.writeHead(200, { 'Content-Type': types[extname(path)] ?? 'application/octet-stream' });
    res.end(buf);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('404');
  }
}).listen(port, () => console.log(`http://localhost:${port}`));
