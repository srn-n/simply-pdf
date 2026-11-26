// pdf.js's worker, with the same polyfills as the page loaded first, so it
// also runs in older browsers and Android WebViews. See src/lib/polyfills.ts.
import '../polyfills';
import 'pdfjs-dist/legacy/build/pdf.worker.mjs';
