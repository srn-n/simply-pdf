import { PDFDocument, StandardFonts, degrees } from 'pdf-lib';

/** Builds a small real PDF in memory. Each page prints its own number. */
export async function makePdf(pages = 3, opts: { size?: [number, number]; rotate?: number; title?: string } = {}) {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  for (let i = 1; i <= pages; i++) {
    const page = doc.addPage(opts.size ?? [595.28, 841.89]);
    page.drawText(`Page ${i}`, { x: 50, y: 700, size: 24, font });
    if (opts.rotate) page.setRotation(degrees(opts.rotate));
  }
  if (opts.title) doc.setTitle(opts.title);
  doc.setAuthor('Test Author');
  return doc.save();
}

export async function open(bytes: Uint8Array) {
  return PDFDocument.load(bytes, { updateMetadata: false });
}

/** A 1x1 transparent PNG. */
export const TINY_PNG = Uint8Array.from(
  atob('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='),
  (c) => c.charCodeAt(0),
);
