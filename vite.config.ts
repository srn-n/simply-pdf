/// <reference types="vitest/config" />
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { createHash } from 'node:crypto';
import { cpSync, existsSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { relative, resolve, sep } from 'node:path';
import { defineConfig, type Plugin } from 'vite';
import { APP_POLICY, PAGE_POLICY } from './csp.config';

const root = import.meta.dirname;

// Two builds from the same code:
//   npm run build           the website, into dist/ (what Vercel serves)
//   npm run build:android   the Android app's copy, into dist-android/ (Capacitor's webDir)
// The Android build keeps everything exactly as the app has always shipped:
// its own page policy, its browser target, no service worker, and none of the
// website-only <head> tags.

/** Copies the pdf.js font, CMap and wasm decoders next to the app so that
 *  scanned (JPX/JBIG2) and CJK documents render without any outside request. */
function pdfjsAssets(): Plugin {
  const copy = () => {
    const src = resolve(root, 'node_modules/pdfjs-dist');
    const out = resolve(root, 'public/pdfjs');
    for (const dir of ['cmaps', 'standard_fonts', 'wasm']) {
      if (!existsSync(resolve(out, dir))) cpSync(resolve(src, dir), resolve(out, dir), { recursive: true });
    }
  };
  return { name: 'pdfjs-assets', buildStart: copy, configureServer: copy };
}

/** The page policy as a <meta> tag (website: the same policy as the Vercel
 *  header, so it holds on any host). Build only: Vite's dev server relies on
 *  inline scripts. */
function cspMeta(policy: string): Plugin {
  return {
    name: 'csp-meta',
    apply: 'build',
    transformIndexHtml(html) {
      return html.replace('<meta charset="UTF-8" />', `<meta charset="UTF-8" />\n    <meta http-equiv="Content-Security-Policy" content="${policy}" />`);
    },
  };
}

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = resolve(dir, name);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}

/**
 * Writes dist/sw.js, the offline service worker. It precaches the app shell
 * and pdf.js's standard fonts (most PDFs need them). The CJK character maps
 * and the scanned-image decoders (3 MB, rarely needed) are cached the first
 * time a document needs them. Its cache name is a hash of the build, so a new
 * deploy replaces the old copy cleanly. It only ever caches the app's own
 * files: documents are never fetched, so they never pass through it.
 */
function serviceWorker(): Plugin {
  return {
    name: 'service-worker',
    apply: 'build',
    closeBundle() {
      const dist = resolve(root, 'dist');
      const files = walk(dist)
        .map((f) => '/' + relative(dist, f).split(sep).join('/'))
        .filter((f) => !/^\/pdfjs\/(cmaps|wasm)\//.test(f) && !/LICENSE/.test(f) && f !== '/sw.js' && f !== '/og-image.png')
        .sort();
      const hash = createHash('sha256');
      for (const f of files) hash.update(f).update(readFileSync(resolve(dist, '.' + f)));
      const version = hash.digest('hex').slice(0, 12);
      const core = ['/', ...files.filter((f) => f !== '/index.html')];
      const sw = readFileSync(resolve(root, 'scripts/sw.template.js'), 'utf8')
        .replace('__VERSION__', version)
        .replace('__CORE__', JSON.stringify(core));
      writeFileSync(resolve(dist, 'sw.js'), sw);
      console.log(`sw.js: ${core.length} files precached, version ${version}`);
    },
  };
}

const pkg = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8'));

/** Counts the real test cases, so every "N tests" claim in the UI stays true. */
function countTests(): number {
  const dir = resolve(root, 'tests');
  return readdirSync(dir)
    .filter((f) => f.endsWith('.test.ts'))
    .reduce((n, f) => n + (readFileSync(resolve(dir, f), 'utf8').match(/^\s*it\(/gm)?.length ?? 0), 0);
}

/** Android build: drops the website-only part of index.html (between the
 *  web-only markers: the long title, description, install and link-preview
 *  tags), leaving the app's page exactly as before, and the website-only files
 *  (install icons, manifest, link-preview image) the app never uses. */
function appHead(): Plugin {
  return {
    name: 'app-head',
    apply: 'build',
    transformIndexHtml(html) {
      return html.replace(/\s*<!-- web-only -->[\s\S]*?<!-- \/web-only -->/g, '').replace(/<title>[^<]*<\/title>/, '<title>Simply PDF</title>');
    },
    closeBundle() {
      const out = resolve(root, 'dist-android');
      for (const f of ['manifest.webmanifest', 'og-image.png', 'icons']) rmSync(resolve(out, f), { recursive: true, force: true });
    },
  };
}

export default defineConfig(({ mode }) => {
  const android = mode === 'android';
  return {
    plugins: android
      ? [react(), tailwindcss(), pdfjsAssets(), cspMeta(APP_POLICY), appHead()]
      : [react(), tailwindcss(), pdfjsAssets(), cspMeta(PAGE_POLICY), serviceWorker()],
    define: {
      __APP_VERSION__: JSON.stringify(pkg.version),
      __TEST_COUNT__: JSON.stringify(countTests()),
    },
    worker: {
      // pdf.js starts its worker as an ES module.
      format: 'es',
    },
    build: {
      outDir: android ? 'dist-android' : 'dist',
      // Website: browsers from 2022 on (Chrome/Edge 100+, Firefox 100+, Safari
      // 15.4+). Android: System WebView updates through the Play Store, and
      // Chrome 100+ covers every supported device. pdf.js needs these modern
      // features anyway; older ones get a plain message from public/compat.js.
      target: android ? ['es2022', 'chrome100'] : ['es2022', 'chrome100', 'firefox100', 'safari15.4'],
      chunkSizeWarningLimit: 1600,
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
    },
    test: {
      environment: 'node',
      include: ['tests/**/*.test.ts'],
    },
  };
});
