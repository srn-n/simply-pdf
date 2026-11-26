/**
 * The PDF engine. Every function takes and returns plain bytes, runs entirely
 * in memory and never touches the network or the DOM, so the whole file is
 * covered by the Node test suite in /tests.
 */
import {
  PDFDict,
  PDFDocument,
  PDFName,
  StandardFonts,
  degrees,
  rgb,
  type PDFFont,
  type PDFPage,
} from 'pdf-lib';
import { chunkRanges, describeRange, rangesToIndices, type PageRange } from './ranges';
import { sanitizeForFont, wrapLine } from './text';
import { normalizeRotation, visualFrame } from './geometry';

export const PRODUCER = 'Simply PDF (on-device)';

/** An error that is safe and useful to show to a person as-is. */
export class PdfError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PdfError';
  }
}

export interface OutputFile {
  name: string;
  bytes: Uint8Array;
  type: string;
}

export type Progress = (done: number, total: number, label?: string) => void;

const PDF_MIME = 'application/pdf';

// ---------------------------------------------------------------------------
// Loading and saving
// ---------------------------------------------------------------------------

export async function loadPdf(bytes: Uint8Array | ArrayBuffer, name = 'This file'): Promise<PDFDocument> {
  let doc: PDFDocument;
  try {
    doc = await PDFDocument.load(bytes, { ignoreEncryption: true, updateMetadata: false });
  } catch {
    throw new PdfError(`${name} could not be read as a PDF. It may be damaged or not a PDF at all.`);
  }
  if (doc.isEncrypted) {
    // Covers both real passwords and "owner" locks that only forbid editing;
    // either way the content is encrypted and can't be changed safely.
    throw new PdfError(
      `${name} is locked with a password or editing restrictions, so it can't be changed. Remove the lock in the app that made it and try again. PDF to images and PDF to text may still work.`,
    );
  }
  if (doc.getPageCount() === 0) {
    throw new PdfError(`${name} has no pages.`);
  }
  return doc;
}

export async function createPdf(): Promise<PDFDocument> {
  const doc = await PDFDocument.create({ updateMetadata: false });
  doc.setProducer(PRODUCER);
  doc.setCreator(PRODUCER);
  const now = new Date();
  doc.setCreationDate(now);
  doc.setModificationDate(now);
  return doc;
}

export async function savePdf(doc: PDFDocument): Promise<Uint8Array> {
  return doc.save({ useObjectStreams: true, addDefaultPage: false });
}

export function baseName(filename: string): string {
  return filename.replace(/\.[a-z0-9]{1,5}$/i, '').trim() || 'document';
}

function pdfFile(name: string, bytes: Uint8Array): OutputFile {
  return { name, bytes, type: PDF_MIME };
}

export async function pageCount(bytes: Uint8Array): Promise<number> {
  return (await loadPdf(bytes)).getPageCount();
}

// ---------------------------------------------------------------------------
// Merge
// ---------------------------------------------------------------------------

export async function mergePdfs(
  inputs: { name: string; bytes: Uint8Array }[],
  onProgress?: Progress,
): Promise<{ bytes: Uint8Array; pages: number }> {
  if (inputs.length < 2) throw new PdfError('Add at least two PDFs to merge.');
  const out = await createPdf();
  for (let i = 0; i < inputs.length; i++) {
    onProgress?.(i, inputs.length, inputs[i].name);
    const src = await loadPdf(inputs[i].bytes, inputs[i].name);
    const pages = await out.copyPages(src, src.getPageIndices());
    pages.forEach((p) => out.addPage(p));
  }
  onProgress?.(inputs.length, inputs.length);
  return { bytes: await savePdf(out), pages: out.getPageCount() };
}

// ---------------------------------------------------------------------------
// Split / extract
// ---------------------------------------------------------------------------

async function copyIndices(src: PDFDocument, indices: number[]): Promise<Uint8Array> {
  const out = await createPdf();
  const pages = await out.copyPages(src, indices);
  pages.forEach((p) => out.addPage(p));
  return savePdf(out);
}

export type SplitPlan =
  | { mode: 'ranges'; ranges: PageRange[]; combine: boolean }
  | { mode: 'every'; size: number };

export async function splitPdf(
  bytes: Uint8Array,
  filename: string,
  plan: SplitPlan,
  onProgress?: Progress,
): Promise<OutputFile[]> {
  const src = await loadPdf(bytes, filename);
  const total = src.getPageCount();
  const stem = baseName(filename);

  if (plan.mode === 'ranges' && plan.ranges.length === 0) throw new PdfError('Choose at least one page.');
  for (const r of plan.mode === 'ranges' ? plan.ranges : []) {
    if (r.start < 1 || r.end > total || r.start > r.end) {
      throw new PdfError(`Pages ${describeRange(r)} are outside this ${total}-page document.`);
    }
  }

  if (plan.mode === 'ranges' && plan.combine) {
    onProgress?.(0, 1);
    const data = await copyIndices(src, rangesToIndices(plan.ranges));
    onProgress?.(1, 1);
    return [pdfFile(`${stem} (pages ${plan.ranges.map(describeRange).join(', ')}).pdf`, data)];
  }

  const ranges = plan.mode === 'every' ? chunkRanges(total, plan.size) : plan.ranges;
  const results: OutputFile[] = [];
  for (let i = 0; i < ranges.length; i++) {
    const r = ranges[i];
    onProgress?.(i, ranges.length, `Pages ${describeRange(r)}`);
    const indices = Array.from({ length: r.end - r.start + 1 }, (_, k) => r.start - 1 + k);
    const data = await copyIndices(src, indices);
    const label = r.start === r.end ? `page ${r.start}` : `pages ${r.start}-${r.end}`;
    results.push(pdfFile(`${stem} (${label}).pdf`, data));
  }
  onProgress?.(ranges.length, ranges.length);
  return results;
}

// ---------------------------------------------------------------------------
// Organize: reorder, rotate, delete
// ---------------------------------------------------------------------------

export interface PagePlan {
  /** 0-based index in the source document */
  source: number;
  /** extra clockwise rotation to apply, in degrees */
  rotate: number;
}

export async function organizePdf(bytes: Uint8Array, plan: PagePlan[], onProgress?: Progress): Promise<Uint8Array> {
  if (plan.length === 0) throw new PdfError('Keep at least one page.');
  const src = await loadPdf(bytes);
  const total = src.getPageCount();
  const out = await createPdf();
  for (const p of plan) {
    if (p.source < 0 || p.source >= total) throw new PdfError(`Page ${p.source + 1} does not exist.`);
  }
  const copied = await out.copyPages(src, plan.map((p) => p.source));
  copied.forEach((page, i) => {
    const extra = normalizeRotation(plan[i].rotate);
    if (extra !== 0) page.setRotation(degrees(normalizeRotation(page.getRotation().angle + extra)));
    out.addPage(page);
    onProgress?.(i + 1, plan.length);
  });
  return savePdf(out);
}

export async function rotateAll(bytes: Uint8Array, angle: number): Promise<Uint8Array> {
  const doc = await loadPdf(bytes);
  const extra = normalizeRotation(angle);
  for (const page of doc.getPages()) {
    page.setRotation(degrees(normalizeRotation(page.getRotation().angle + extra)));
  }
  return savePdf(doc);
}

// ---------------------------------------------------------------------------
// Text drawing helpers shared by watermark and page numbers
// ---------------------------------------------------------------------------

export function hexToRgb(hex: string) {
  const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return rgb(0, 0, 0);
  let h = m[1];
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  const n = parseInt(h, 16);
  return rgb(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255);
}

/** Draws text centred on a visual point, at a visual angle, on any page rotation. */
function drawCentredText(
  page: PDFPage,
  text: string,
  opts: { font: PDFFont; size: number; cx: number; cy: number; angle: number; color: ReturnType<typeof rgb>; opacity: number },
) {
  const frame = visualFrame(page);
  const width = opts.font.widthOfTextAtSize(text, opts.size);
  const height = opts.font.heightAtSize(opts.size, { descender: false });
  const a = (opts.angle * Math.PI) / 180;
  const vx = opts.cx - (width / 2) * Math.cos(a) + (height / 2) * Math.sin(a);
  const vy = opts.cy - (width / 2) * Math.sin(a) - (height / 2) * Math.cos(a);
  const { x, y } = frame.toUser(vx, vy);
  page.drawText(text, {
    x,
    y,
    size: opts.size,
    font: opts.font,
    color: opts.color,
    opacity: opts.opacity,
    rotate: degrees(opts.angle + frame.rotation),
  });
}

// ---------------------------------------------------------------------------
// Watermark
// ---------------------------------------------------------------------------

export interface WatermarkOptions {
  text: string;
  /** 0-1 */
  opacity: number;
  /** font size in points */
  size: number;
  /** visual angle in degrees, counter-clockwise */
  angle: number;
  color: string;
  layout: 'centre' | 'tile';
  bold?: boolean;
}

export async function watermarkPdf(
  bytes: Uint8Array,
  opts: WatermarkOptions,
  onProgress?: Progress,
): Promise<{ bytes: Uint8Array; replaced: number }> {
  const doc = await loadPdf(bytes);
  const font = await doc.embedFont(opts.bold === false ? StandardFonts.Helvetica : StandardFonts.HelveticaBold);
  const { text, replaced } = sanitizeForFont(opts.text.replace(/\n+/g, ' ').trim(), font);
  if (!text) throw new PdfError('Type the watermark text first.');
  const color = hexToRgb(opts.color);
  const opacity = Math.min(1, Math.max(0.02, opts.opacity));
  // Tiny sizes would tile tens of thousands of copies per page.
  const size = Math.min(400, Math.max(6, opts.size || 0));
  const pages = doc.getPages();

  pages.forEach((page, i) => {
    const { width, height } = visualFrame(page);
    if (opts.layout === 'centre') {
      drawCentredText(page, text, { font, size, cx: width / 2, cy: height / 2, angle: opts.angle, color, opacity });
    } else {
      const textWidth = font.widthOfTextAtSize(text, size);
      const stepX = Math.max(textWidth * 0.9, size * 4) + size * 2;
      const stepY = size * 5;
      let row = 0;
      for (let cy = -stepY; cy < height + stepY; cy += stepY, row++) {
        const offset = row % 2 ? stepX / 2 : 0;
        for (let cx = -stepX + offset; cx < width + stepX; cx += stepX) {
          drawCentredText(page, text, { font, size, cx, cy, angle: opts.angle, color, opacity });
        }
      }
    }
    onProgress?.(i + 1, pages.length);
  });

  return { bytes: await savePdf(doc), replaced };
}

// ---------------------------------------------------------------------------
// Page numbers
// ---------------------------------------------------------------------------

export type NumberPosition =
  | 'bottom-left'
  | 'bottom-centre'
  | 'bottom-right'
  | 'top-left'
  | 'top-centre'
  | 'top-right';

export interface PageNumberOptions {
  position: NumberPosition;
  /** Use {n} for the number and {total} for the page count. */
  format: string;
  startAt: number;
  skipFirst: boolean;
  size: number;
  margin: number;
  color: string;
}

export function formatPageLabel(format: string, n: number, total: number): string {
  return format.replace(/\{n\}/g, String(n)).replace(/\{total\}/g, String(total));
}

export async function addPageNumbers(bytes: Uint8Array, opts: PageNumberOptions, onProgress?: Progress): Promise<Uint8Array> {
  const doc = await loadPdf(bytes);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const pages = doc.getPages();
  const color = hexToRgb(opts.color);
  opts = { ...opts, size: Math.min(72, Math.max(4, opts.size || 10)), margin: Math.max(0, opts.margin || 0), startAt: Math.floor(opts.startAt) || 0 };
  const numbered = opts.skipFirst ? pages.length - 1 : pages.length;
  const lastNumber = opts.startAt + numbered - 1;

  pages.forEach((page, i) => {
    if (opts.skipFirst && i === 0) return;
    const n = opts.startAt + (opts.skipFirst ? i - 1 : i);
    const label = sanitizeForFont(formatPageLabel(opts.format, n, lastNumber), font).text;
    const { width, height } = visualFrame(page);
    const textWidth = font.widthOfTextAtSize(label, opts.size);
    const [v, h] = opts.position.split('-') as ['top' | 'bottom', 'left' | 'centre' | 'right'];
    const cx = h === 'left' ? opts.margin + textWidth / 2 : h === 'right' ? width - opts.margin - textWidth / 2 : width / 2;
    const cy = v === 'top' ? height - opts.margin - opts.size / 2 : opts.margin + opts.size / 2;
    drawCentredText(page, label, { font, size: opts.size, cx, cy, angle: 0, color, opacity: 1 });
    onProgress?.(i + 1, pages.length);
  });

  return savePdf(doc);
}

// ---------------------------------------------------------------------------
// Sign / stamp an image
// ---------------------------------------------------------------------------

export interface Placement {
  /** 0-based page index */
  page: number;
  /** left edge as a fraction of the visual page width (0-1) */
  x: number;
  /** top edge as a fraction of the visual page height (0-1) */
  y: number;
  /** width as a fraction of the visual page width (0-1) */
  width: number;
}

export async function stampImage(
  bytes: Uint8Array,
  png: Uint8Array,
  placements: Placement[],
): Promise<Uint8Array> {
  if (placements.length === 0) throw new PdfError('Place the signature on a page first.');
  const doc = await loadPdf(bytes);
  const image = await doc.embedPng(png);
  const pages = doc.getPages();
  for (const p of placements) {
    const page = pages[p.page];
    if (!page) throw new PdfError(`Page ${p.page + 1} does not exist.`);
    const frame = visualFrame(page);
    // The same box can be copied onto pages of other shapes; keep it on the page.
    let w = Math.min(1, Math.max(0.01, p.width)) * frame.width;
    let h = (w * image.height) / image.width;
    if (h > frame.height) {
      h = frame.height;
      w = (h * image.width) / image.height;
    }
    const vx = Math.min(frame.width - w, Math.max(0, p.x * frame.width));
    const vyTop = Math.min(frame.height - h, Math.max(0, p.y * frame.height));
    const { x, y } = frame.toUser(vx, frame.height - vyTop - h);
    page.drawImage(image, { x, y, width: w, height: h, rotate: degrees(frame.rotation) });
  }
  return savePdf(doc);
}

// ---------------------------------------------------------------------------
// Images to PDF
// ---------------------------------------------------------------------------

export interface PreparedImage {
  bytes: Uint8Array;
  format: 'jpg' | 'png';
  /** pixel size, already corrected for camera orientation */
  width: number;
  height: number;
}

export interface ImagePageOptions {
  pageSize: 'a4' | 'letter' | 'fit';
  orientation: 'auto' | 'portrait' | 'landscape';
  /** margin in points */
  margin: number;
}

const PAGE_SIZES = {
  a4: [595.28, 841.89],
  letter: [612, 792],
} as const;

export function imagePageSize(img: { width: number; height: number }, opts: ImagePageOptions): [number, number] {
  const landscapeImage = img.width > img.height;
  if (opts.pageSize === 'fit') {
    // Same physical width as A4 for portrait images, A4 height for landscape ones.
    const long = landscapeImage ? PAGE_SIZES.a4[1] : PAGE_SIZES.a4[0];
    const w = long + opts.margin * 2;
    const h = (long * img.height) / img.width + opts.margin * 2;
    return [w, h];
  }
  const [short, tall] = PAGE_SIZES[opts.pageSize];
  const landscape = opts.orientation === 'landscape' || (opts.orientation === 'auto' && landscapeImage);
  return landscape ? [tall, short] : [short, tall];
}

export async function imagesToPdf(images: PreparedImage[], opts: ImagePageOptions, onProgress?: Progress): Promise<Uint8Array> {
  if (images.length === 0) throw new PdfError('Add at least one image.');
  const doc = await createPdf();
  for (let i = 0; i < images.length; i++) {
    const img = images[i];
    const embedded = img.format === 'jpg' ? await doc.embedJpg(img.bytes) : await doc.embedPng(img.bytes);
    const [pw, ph] = imagePageSize(img, opts);
    const page = doc.addPage([pw, ph]);
    const margin = Math.min(Math.max(0, opts.margin), Math.min(pw, ph) / 4);
    const maxW = pw - margin * 2;
    const maxH = ph - margin * 2;
    const scale = Math.min(maxW / img.width, maxH / img.height);
    const w = img.width * scale;
    const h = img.height * scale;
    page.drawImage(embedded, { x: (pw - w) / 2, y: (ph - h) / 2, width: w, height: h });
    onProgress?.(i + 1, images.length);
  }
  return savePdf(doc);
}

// ---------------------------------------------------------------------------
// Text to PDF
// ---------------------------------------------------------------------------

export interface TextPdfOptions {
  font: 'sans' | 'serif' | 'mono';
  size: number;
  pageSize: 'a4' | 'letter';
  margin: number;
  pageNumbers: boolean;
}

const FONT_FAMILIES = {
  sans: [StandardFonts.Helvetica, StandardFonts.HelveticaBold],
  serif: [StandardFonts.TimesRoman, StandardFonts.TimesRomanBold],
  mono: [StandardFonts.Courier, StandardFonts.CourierBold],
} as const;

/**
 * Lays out plain text with a light touch of Markdown: "# " and "## " headings,
 * "- " or "* " bullets and blank lines between paragraphs.
 */
export async function textToPdf(
  title: string,
  content: string,
  opts: TextPdfOptions,
): Promise<{ bytes: Uint8Array; replaced: number; pages: number }> {
  if (!title.trim() && !content.trim()) throw new PdfError('Write something first.');
  const doc = await createPdf();
  if (title.trim()) doc.setTitle(title.trim());
  const [regularName, boldName] = FONT_FAMILIES[opts.font];
  const regular = await doc.embedFont(regularName);
  const bold = await doc.embedFont(boldName);
  const [pw, ph] = PAGE_SIZES[opts.pageSize];
  const m = opts.margin;
  const maxW = pw - m * 2;
  const footer = opts.pageNumbers ? 24 : 0;
  let replaced = 0;

  let page = doc.addPage([pw, ph]);
  let y = ph - m;

  const ensure = (needed: number) => {
    if (y - needed < m + footer) {
      page = doc.addPage([pw, ph]);
      y = ph - m;
    }
  };

  const block = (raw: string, font: PDFFont, size: number, indent = 0, bullet = false) => {
    const clean = sanitizeForFont(raw, font);
    replaced += clean.replaced;
    const lineH = size * 1.45;
    const lines = wrapLine(clean.text, font, size, maxW - indent);
    lines.forEach((line, i) => {
      ensure(lineH);
      y -= size;
      if (bullet && i === 0) page.drawText('•', { x: m + indent - size * 0.9, y, size, font });
      if (line) page.drawText(line, { x: m + indent, y, size, font, color: rgb(0.1, 0.1, 0.11) });
      y -= lineH - size;
    });
  };

  if (title.trim()) {
    block(title.trim(), bold, opts.size * 1.9);
    y -= opts.size * 0.6;
    ensure(1);
    page.drawLine({ start: { x: m, y }, end: { x: pw - m, y }, thickness: 0.6, color: rgb(0.8, 0.79, 0.76) });
    y -= opts.size * 1.4;
  }

  for (const rawLine of content.replace(/\r\n?/g, '\n').split('\n')) {
    const line = rawLine.replace(/\s+$/, '');
    if (line.trim() === '') {
      y -= opts.size * 0.8;
      continue;
    }
    const h2 = /^##\s+(.*)$/.exec(line);
    const h1 = /^#\s+(.*)$/.exec(line);
    const li = /^\s*[-*•]\s+(.*)$/.exec(line);
    if (h1) {
      y -= opts.size * 0.6;
      block(h1[1], bold, opts.size * 1.5);
      y -= opts.size * 0.3;
    } else if (h2) {
      y -= opts.size * 0.4;
      block(h2[1], bold, opts.size * 1.2);
      y -= opts.size * 0.2;
    } else if (li) {
      block(li[1], regular, opts.size, opts.size * 1.4, true);
    } else {
      block(line, regular, opts.size);
    }
  }

  const pages = doc.getPages();
  if (opts.pageNumbers) {
    pages.forEach((p, i) => {
      const label = `${i + 1} / ${pages.length}`;
      const w = regular.widthOfTextAtSize(label, 9);
      p.drawText(label, { x: (pw - w) / 2, y: m / 2, size: 9, font: regular, color: rgb(0.45, 0.45, 0.47) });
    });
  }

  return { bytes: await savePdf(doc), replaced, pages: pages.length };
}

// ---------------------------------------------------------------------------
// Lossless optimisation
// ---------------------------------------------------------------------------

export interface CompressResult {
  bytes: Uint8Array;
  originalSize: number;
  newSize: number;
  /** false when nothing smaller could be made; `bytes` is then the original */
  changed: boolean;
}

export function compareSizes(original: Uint8Array, candidates: Uint8Array[]): CompressResult {
  let best = original;
  for (const c of candidates) if (c.length < best.length) best = c;
  return { bytes: best, originalSize: original.length, newSize: best.length, changed: best !== original };
}

/**
 * Rewrites the file with compressed object streams and, when it is safe to do
 * so (no forms or bookmarks to lose), drops objects nothing refers to. Text
 * stays selectable and nothing is re-encoded. The smallest valid result wins;
 * if nothing beats the original, the original is returned unchanged.
 */
export async function optimizeLossless(bytes: Uint8Array): Promise<CompressResult> {
  const doc = await loadPdf(bytes);
  const candidates = [await savePdf(doc)];
  const hasForms = doc.catalog.has(PDFName.of('AcroForm'));
  const hasOutline = doc.catalog.has(PDFName.of('Outlines'));
  if (!hasForms && !hasOutline) {
    const fresh = await PDFDocument.create({ updateMetadata: false });
    const pages = await fresh.copyPages(doc, doc.getPageIndices());
    pages.forEach((p) => fresh.addPage(p));
    copyInfo(doc, fresh);
    candidates.push(await savePdf(fresh));
  }
  return compareSizes(bytes, candidates);
}

// ---------------------------------------------------------------------------
// Metadata
// ---------------------------------------------------------------------------

export interface PdfMetadata {
  title: string;
  author: string;
  subject: string;
  keywords: string;
  creator: string;
  producer: string;
  created?: string;
  modified?: string;
  pages: number;
  hasXmp: boolean;
}

export async function readMetadata(bytes: Uint8Array): Promise<PdfMetadata> {
  const doc = await loadPdf(bytes);
  const safe = <T>(fn: () => T): T | undefined => {
    try {
      return fn();
    } catch {
      return undefined;
    }
  };
  return {
    title: safe(() => doc.getTitle()) ?? '',
    author: safe(() => doc.getAuthor()) ?? '',
    subject: safe(() => doc.getSubject()) ?? '',
    keywords: safe(() => doc.getKeywords()) ?? '',
    creator: safe(() => doc.getCreator()) ?? '',
    producer: safe(() => doc.getProducer()) ?? '',
    created: safe(() => doc.getCreationDate()?.toISOString()),
    modified: safe(() => doc.getModificationDate()?.toISOString()),
    pages: doc.getPageCount(),
    hasXmp: doc.catalog.has(PDFName.of('Metadata')),
  };
}

function copyInfo(from: PDFDocument, to: PDFDocument) {
  const get = (fn: () => string | undefined) => {
    try {
      return fn();
    } catch {
      return undefined;
    }
  };
  const title = get(() => from.getTitle());
  const author = get(() => from.getAuthor());
  const subject = get(() => from.getSubject());
  if (title) to.setTitle(title);
  if (author) to.setAuthor(author);
  if (subject) to.setSubject(subject);
}

function infoDict(doc: PDFDocument): PDFDict | undefined {
  const ref = doc.context.trailerInfo.Info;
  if (!ref) return undefined;
  const dict = doc.context.lookup(ref);
  return dict instanceof PDFDict ? dict : undefined;
}

export interface MetadataEdit {
  title: string;
  author: string;
  subject: string;
  keywords: string;
}

export async function writeMetadata(bytes: Uint8Array, edit: MetadataEdit): Promise<Uint8Array> {
  const doc = await loadPdf(bytes);
  const info = infoDict(doc);
  const apply = (key: string, value: string, set: (v: string) => void) => {
    if (value.trim()) set(value.trim());
    else info?.delete(PDFName.of(key));
  };
  apply('Title', edit.title, (v) => doc.setTitle(v));
  apply('Author', edit.author, (v) => doc.setAuthor(v));
  apply('Subject', edit.subject, (v) => doc.setSubject(v));
  apply('Keywords', edit.keywords, (v) => doc.setKeywords(v.split(/\s*,\s*/).filter(Boolean)));
  doc.setModificationDate(new Date());
  return savePdf(doc);
}

/** Removes the document information dictionary and the XMP metadata stream. */
export async function stripMetadata(bytes: Uint8Array): Promise<Uint8Array> {
  const doc = await loadPdf(bytes);
  const info = infoDict(doc);
  if (info) for (const key of info.keys()) info.delete(key);
  doc.catalog.delete(PDFName.of('Metadata'));
  for (const page of doc.getPages()) page.node.delete(PDFName.of('Metadata'));
  return savePdf(doc);
}
