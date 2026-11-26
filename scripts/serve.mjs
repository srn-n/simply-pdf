// Serves the built app from dist/ the way Vercel does: the same security
// headers as vercel.json, and every unknown page path falls back to
// index.html. Used by the smoke test and for a quick look at a production build.
// Usage: npm run preview   [PORT=4173]
import { createServer } from 'node:http';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { extname, join, normalize, resolve, sep } from 'node:path';

const dist = resolve(import.meta.dirname, '..', 'dist');
if (!existsSync(join(dist, 'index.html'))) {
  console.error('dist/ is missing. Run "npm run build" first.');
  process.exit(1);
}

// The headers vercel.json sends on every response (minus HSTS and
// upgrade-insecure-requests, which would break plain http://localhost).
const vercel = JSON.parse(readFileSync(resolve(import.meta.dirname, '..', 'vercel.json'), 'utf8'));
const HEADERS = Object.fromEntries(
  vercel.headers
    .find((h) => h.source === '/(.*)')
    .headers.filter((h) => h.key !== 'Strict-Transport-Security')
    .map((h) => [h.key, h.key === 'Content-Security-Policy' ? h.value.replace('; upgrade-insecure-requests', '') : h.value]),
);

const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css',
  '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.woff2': 'font/woff2', '.woff': 'font/woff',
  '.wasm': 'application/wasm', '.txt': 'text/plain', '.bcmap': 'application/octet-stream', '.pfb': 'application/octet-stream',
  '.ttf': 'font/ttf', '.webmanifest': 'application/manifest+json', '.ico': 'image/x-icon',
};

function resolveFile(pathname) {
  const p = normalize(decodeURIComponent(pathname));
  const file = join(dist, p);
  // Never serve anything outside dist/.
  if (!file.startsWith(dist + sep) && file !== dist) return join(dist, 'index.html');
  if (existsSync(file) && statSync(file).isFile()) return file;
  return join(dist, 'index.html');
}

const port = Number(process.env.PORT || 4173);
createServer((req, res) => {
  try {
    const { pathname } = new URL(req.url, 'http://x');
    const path = resolveFile(pathname);
    res.writeHead(200, { ...HEADERS, 'Content-Type': TYPES[extname(path)] ?? 'application/octet-stream', 'Cache-Control': 'no-cache' });
    res.end(readFileSync(path));
  } catch {
    res.writeHead(400).end();
  }
}).listen(port, () => console.log(`Serving dist/ at http://localhost:${port}`));
