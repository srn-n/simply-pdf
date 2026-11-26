// Runs after `vite build` (npm run build). Fails the build if the output would
// break, or quietly weaken, the Content Security Policy:
//   - dist/index.html must carry the policy as a <meta> tag
//   - vercel.json must send the same policy plus the header-only directives
//   - no inline <script> blocks, <style> blocks or style="" attributes in HTML
//   - nothing in HTML loads from another site
//   - sw.js must exist (offline support)
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const dist = join(root, 'dist');
const problems = [];
const fail = (msg) => problems.push(msg);

if (!existsSync(join(dist, 'index.html'))) {
  console.error('check-csp-build: dist/index.html is missing. Run vite build first.');
  process.exit(1);
}

const html = readFileSync(join(dist, 'index.html'), 'utf8');
const meta = html.match(/<meta http-equiv="Content-Security-Policy" content="([^"]+)"/);
if (!meta) fail('index.html has no Content-Security-Policy <meta> tag');
const pagePolicy = meta?.[1] ?? '';

for (const must of ["default-src 'self'", "script-src 'self' 'wasm-unsafe-eval'", "style-src 'self'", "object-src 'none'"]) {
  if (!pagePolicy.split('; ').includes(must)) fail(`page policy is missing "${must}"`);
}
if (/'unsafe-inline'|'unsafe-eval'|\*|https?:/.test(pagePolicy)) fail(`page policy allows too much: ${pagePolicy}`);

const vercel = JSON.parse(readFileSync(join(root, 'vercel.json'), 'utf8'));
const header = vercel.headers
  ?.find((h) => h.source === '/(.*)')
  ?.headers.find((h) => h.key === 'Content-Security-Policy')?.value;
const expectedHeader = `${pagePolicy}; frame-ancestors 'none'; upgrade-insecure-requests`;
if (header !== expectedHeader) fail(`vercel.json CSP differs from the page policy.\n    vercel.json: ${header}\n    expected:    ${expectedHeader}`);

const htmlFiles = readdirSync(dist).filter((f) => f.endsWith('.html'));
for (const f of htmlFiles) {
  const text = readFileSync(join(dist, f), 'utf8');
  for (const m of text.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)) {
    if (!/\bsrc=/.test(m[1]) || m[2].trim()) fail(`${f}: inline <script> block (the policy forbids it)`);
    const src = m[1].match(/src="([^"]+)"/)?.[1] ?? '';
    if (/^(https?:)?\/\//.test(src)) fail(`${f}: script from another site: ${src}`);
  }
  if (/<style\b/i.test(text)) fail(`${f}: inline <style> block (the policy forbids it)`);
  if (/\sstyle=/i.test(text)) fail(`${f}: style="" attribute (the policy forbids it)`);
  for (const m of text.matchAll(/<link\b[^>]*href="([^"]+)"/g)) {
    if (/^(https?:)?\/\//.test(m[1])) fail(`${f}: link to another site: ${m[1]}`);
  }
}

// Built JavaScript must not reach any other server.
const walk = (dir) => readdirSync(dir).flatMap((n) => (statSync(join(dir, n)).isDirectory() ? walk(join(dir, n)) : [join(dir, n)]));
for (const file of walk(join(dist, 'assets')).filter((f) => f.endsWith('.js'))) {
  const js = readFileSync(file, 'utf8');
  if (/navigator\.sendBeacon\(|new WebSocket\(|new EventSource\(/.test(js)) fail(`${file}: beacon/socket code in the bundle`);
}

if (!existsSync(join(dist, 'sw.js'))) fail('dist/sw.js is missing (offline support)');
if (!existsSync(join(dist, 'manifest.webmanifest'))) fail('dist/manifest.webmanifest is missing');

if (problems.length) {
  console.error('check-csp-build: FAILED\n  - ' + problems.join('\n  - '));
  process.exit(1);
}
console.log(`check-csp-build: ok (${htmlFiles.length} HTML file, policy and vercel.json in step, no inline code)`);
