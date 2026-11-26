/**
 * Everything that needs pdf.js and a canvas: thumbnails, page images,
 * image-based compression and text extraction. Browser only.
 */
// The legacy build plus our own polyfills (in the page and in the worker), on
// purpose: pdf.js 6 calls JavaScript features so new that a browser or an
// Android System WebView a few versions behind throws on every PDF. See src/lib/polyfills.ts.
import '../polyfills';
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';
import workerUrl from './pdf-worker?worker&url';
import { PdfError, compareSizes, createPdf, savePdf, type CompressResult, type Progress } from './engine';

pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

const ASSETS = `${import.meta.env.BASE_URL}pdfjs/`;

export type PdfProxy = pdfjs.PDFDocumentProxy;

/** Opens a document with pdf.js. The bytes are copied because pdf.js transfers them to its worker. */
export async function openForRender(bytes: Uint8Array): Promise<PdfProxy> {
  try {
    return await pdfjs.getDocument({
      data: bytes.slice(),
      cMapUrl: `${ASSETS}cmaps/`,
      cMapPacked: true,
      standardFontDataUrl: `${ASSETS}standard_fonts/`,
      wasmUrl: `${ASSETS}wasm/`,
      enableXfa: false,
    }).promise;
  } catch (err) {
    if (err instanceof Error && err.name === 'PasswordException') {
      throw new PdfError('This PDF is password-protected. Remove the password in the app that made it, then try again.');
    }
    // Keep the real cause in the log; the person sees the plain message.
    console.warn('pdf.js could not open the file:', err);
    throw new PdfError('This file could not be opened as a PDF. It may be damaged.');
  }
}

/** Frees the worker-side document. Safe to call more than once. */
export function closePdf(pdf: PdfProxy | null | undefined): void {
  if (pdf) pdf.loadingTask.destroy().catch(() => {});
}

// Browsers cap canvas size; phones much lower than desktops. Stay well inside.
const MAX_SIDE = 4096;
const MAX_PIXELS = 12_000_000;

export interface RenderedPage {
  canvas: HTMLCanvasElement;
  /** page size in points as displayed (rotation applied) */
  widthPt: number;
  heightPt: number;
}

export async function renderPage(
  pdf: PdfProxy,
  pageNumber: number,
  opts: { scale?: number; maxWidth?: number; extraRotation?: number; background?: string } = {},
): Promise<RenderedPage> {
  const page = await pdf.getPage(pageNumber);
  const rotation = (page.rotate + (opts.extraRotation ?? 0) + 360) % 360;
  const base = page.getViewport({ scale: 1, rotation });
  let scale = opts.scale ?? 1;
  if (opts.maxWidth) scale = opts.maxWidth / base.width;
  scale = Math.min(scale, MAX_SIDE / Math.max(base.width, base.height), Math.sqrt(MAX_PIXELS / (base.width * base.height)));
  const viewport = page.getViewport({ scale, rotation });

  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.floor(viewport.width));
  canvas.height = Math.max(1, Math.floor(viewport.height));
  const ctx = canvas.getContext('2d', { alpha: false });
  if (!ctx) throw new PdfError('This device ran out of memory for drawing pages.');
  ctx.fillStyle = opts.background ?? '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  await page.render({ canvas, canvasContext: ctx, viewport }).promise;
  page.cleanup();
  return { canvas, widthPt: base.width, heightPt: base.height };
}

export function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality?: number): Promise<Blob> {
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new PdfError('Could not encode the page image.'))), type, quality),
  );
}

export function releaseCanvas(canvas: HTMLCanvasElement) {
  canvas.width = 0;
  canvas.height = 0;
}

/** Renders a small JPEG data URL; thumbnails are cheap to keep in state. */
export async function thumbnail(pdf: PdfProxy, pageNumber: number, width = 220): Promise<string> {
  // Previews never need more than ~1400 px across, whatever the screen density.
  const { canvas } = await renderPage(pdf, pageNumber, { maxWidth: Math.min(1400, width * Math.min(2, window.devicePixelRatio || 1)) });
  const url = canvas.toDataURL('image/jpeg', 0.78);
  releaseCanvas(canvas);
  return url;
}

// ---------------------------------------------------------------------------
// PDF to images
// ---------------------------------------------------------------------------

export interface PageImage {
  name: string;
  blob: Blob;
  width: number;
  height: number;
}

export async function pdfToImages(
  bytes: Uint8Array,
  stem: string,
  opts: { format: 'jpg' | 'png'; dpi: number; quality: number; pages: number[] },
  onProgress?: Progress,
): Promise<PageImage[]> {
  const pdf = await openForRender(bytes);
  const out: PageImage[] = [];
  const pad = String(pdf.numPages).length;
  try {
    for (let i = 0; i < opts.pages.length; i++) {
      const n = opts.pages[i] + 1;
      onProgress?.(i, opts.pages.length, `Page ${n}`);
      const { canvas } = await renderPage(pdf, n, { scale: opts.dpi / 72 });
      const type = opts.format === 'png' ? 'image/png' : 'image/jpeg';
      const blob = await canvasToBlob(canvas, type, opts.format === 'jpg' ? opts.quality : undefined);
      out.push({ name: `${stem} ${String(n).padStart(pad, '0')}.${opts.format}`, blob, width: canvas.width, height: canvas.height });
      releaseCanvas(canvas);
    }
  } finally {
    closePdf(pdf);
  }
  onProgress?.(opts.pages.length, opts.pages.length);
  return out;
}

// ---------------------------------------------------------------------------
// Image-based compression
// ---------------------------------------------------------------------------

export const RASTER_PRESETS = {
  light: { dpi: 150, quality: 0.8 },
  balanced: { dpi: 120, quality: 0.68 },
  strong: { dpi: 90, quality: 0.5 },
} as const;

export type RasterPreset = keyof typeof RASTER_PRESETS;

/**
 * Redraws every page as a JPEG. Very effective on scans and photo-heavy files,
 * but text stops being selectable, which the UI says up front. If the result
 * is not smaller, the original is returned untouched.
 */
export async function compressAsImages(
  bytes: Uint8Array,
  preset: RasterPreset,
  grayscale: boolean,
  onProgress?: Progress,
): Promise<CompressResult> {
  const { dpi, quality } = RASTER_PRESETS[preset];
  const pdf = await openForRender(bytes);
  const out = await createPdf();
  try {
    for (let n = 1; n <= pdf.numPages; n++) {
      onProgress?.(n - 1, pdf.numPages, `Page ${n} of ${pdf.numPages}`);
      const { canvas, widthPt, heightPt } = await renderPage(pdf, n, { scale: dpi / 72 });
      if (grayscale) toGrayscale(canvas);
      const blob = await canvasToBlob(canvas, 'image/jpeg', quality);
      releaseCanvas(canvas);
      const image = await out.embedJpg(new Uint8Array(await blob.arrayBuffer()));
      const page = out.addPage([widthPt, heightPt]);
      page.drawImage(image, { x: 0, y: 0, width: widthPt, height: heightPt });
    }
  } finally {
    closePdf(pdf);
  }
  onProgress?.(1, 1, 'Saving');
  return compareSizes(bytes, [await savePdf(out)]);
}

function toGrayscale(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d')!;
  const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const y = 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2];
    d[i] = d[i + 1] = d[i + 2] = y;
  }
  ctx.putImageData(img, 0, 0);
}

// ---------------------------------------------------------------------------
// Text extraction
// ---------------------------------------------------------------------------

export async function extractText(bytes: Uint8Array, onProgress?: Progress): Promise<{ text: string; pagesWithText: number; pages: number }> {
  const pdf = await openForRender(bytes);
  const chunks: string[] = [];
  let pagesWithText = 0;
  try {
    for (let n = 1; n <= pdf.numPages; n++) {
      onProgress?.(n - 1, pdf.numPages, `Page ${n}`);
      const page = await pdf.getPage(n);
      const content = await page.getTextContent();
      let text = '';
      for (const item of content.items) {
        if (!('str' in item)) continue;
        text += item.str;
        if (item.hasEOL) text += '\n';
        else if (item.str && !item.str.endsWith(' ')) text += ' ';
      }
      text = text.replace(/[ \t]+\n/g, '\n').replace(/[ \t]{2,}/g, ' ').trim();
      if (text) pagesWithText++;
      chunks.push(`--- Page ${n} ---\n${text}`);
      page.cleanup();
    }
  } finally {
    closePdf(pdf);
  }
  onProgress?.(1, 1);
  return { text: chunks.join('\n\n'), pagesWithText, pages: chunks.length };
}
