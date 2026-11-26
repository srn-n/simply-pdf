/**
 * The Content Security Policy, in one place. The page may load and contact
 * only itself: no other server, no inline scripts, no inline styles.
 *
 * - PAGE_POLICY goes into dist/index.html as a <meta> tag (vite.config.ts).
 * - HEADER_POLICY is what vercel.json sends. It adds the directives a <meta>
 *   tag can't carry. scripts/check-csp-build.mjs fails the build if
 *   vercel.json drifts from it.
 *
 * 'wasm-unsafe-eval' lets pdf.js run its WebAssembly image decoders (scanned
 * JPX/JBIG2 pages). It allows compiling WebAssembly only, not eval().
 * blob: and data: are needed because PDFs, page images and downloads are made
 * from in-memory blobs.
 */
const BASE = [
  "default-src 'self'",
  "script-src 'self' 'wasm-unsafe-eval'",
  "style-src 'self'",
  "img-src 'self' blob: data:",
  "font-src 'self' data:",
  "worker-src 'self' blob:",
  "connect-src 'self' blob: data:",
  "manifest-src 'self'",
  "object-src 'none'",
  "base-uri 'none'",
  "form-action 'none'",
];

export const PAGE_POLICY = BASE.join('; ');

export const HEADER_POLICY = [...BASE, "frame-ancestors 'none'", 'upgrade-insecure-requests'].join('; ');

/**
 * The Android app's policy (vite build --mode android). Kept exactly as the
 * app has always shipped it, so nothing in the app changes: it also allows
 * inline styles. Android adds its own guarantee on top: the app has no
 * INTERNET permission at all.
 */
export const APP_POLICY = [
  "default-src 'self'",
  "script-src 'self' 'wasm-unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' blob: data:",
  "font-src 'self' data:",
  "worker-src 'self' blob:",
  "connect-src 'self' blob: data:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'none'",
].join('; ');
