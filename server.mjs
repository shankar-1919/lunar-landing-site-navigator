import http from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const port = Number(process.env.PORT || 4173);
const mime = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml' };

function send(res, status, body, type = 'application/json; charset=utf-8') {
  res.writeHead(status, { 'content-type': type, 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' });
  res.end(typeof body === 'string' ? body : JSON.stringify(body));
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  if (req.method !== 'GET') return send(res, 405, { error: 'Use a GET request.' });
  if (url.pathname.startsWith('/api/')) {
    return send(res, 410, { error: 'Remote ephemeris requests are disabled. Import a locally prepared Horizons bundle instead.' });
  }
  let relative;
  try { relative = url.pathname === '/' ? 'index.html' : decodeURIComponent(url.pathname.slice(1)); }
  catch { return send(res, 400, { error: 'Invalid path.' }); }
  const file = path.resolve(root, relative);
  if (!file.startsWith(`${root}${path.sep}`) && file !== path.join(root, 'index.html')) return send(res, 403, { error: 'Path is outside the app.' });
  try {
    const bytes = await readFile(file);
    res.writeHead(200, { 'content-type': mime[path.extname(file)] || 'application/octet-stream', 'cache-control': 'no-cache', 'x-content-type-options': 'nosniff' });
    res.end(bytes);
  } catch {
    send(res, 404, 'Not found', 'text/plain; charset=utf-8');
  }
});

server.listen(port, '127.0.0.1', () => {
  console.log(`Lunar Landing Site Navigator is ready at http://127.0.0.1:${port}`);
  console.log('Offline terrain and imported ephemeris bundles only; no JPL API calls are made by this server.');
});
