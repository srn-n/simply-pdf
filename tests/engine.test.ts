import { PDFDocument, StandardFonts } from 'pdf-lib';
import { describe, expect, it } from 'vitest';
import {
  PRODUCER,
  PdfError,
  addPageNumbers,
  baseName,
  compareSizes,
  formatPageLabel,
  hexToRgb,
  imagePageSize,
  imagesToPdf,
  loadPdf,
  mergePdfs,
  optimizeLossless,
  organizePdf,
  readMetadata,
  rotateAll,
  splitPdf,
  stampImage,
  stripMetadata,
  textToPdf,
  watermarkPdf,
  writeMetadata,
} from '../src/lib/pdf/engine';
import { makePdf, open, TINY_PNG } from './helpers';

describe('loadPdf', () => {
  it('rejects bytes that are not a PDF with a readable message', async () => {
    await expect(loadPdf(new TextEncoder().encode('hello'), 'notes.txt')).rejects.toThrow(/notes\.txt could not be read/);
  });

  it('throws PdfError so the UI can show the message as-is', async () => {
    await expect(loadPdf(new Uint8Array([1, 2, 3]))).rejects.toBeInstanceOf(PdfError);
  });
});

describe('mergePdfs', () => {
  it('keeps every page, in the chosen order', async () => {
    const a = await makePdf(2);
    const b = await makePdf(3);
    const { bytes, pages } = await mergePdfs([{ name: 'a', bytes: a }, { name: 'b', bytes: b }]);
    expect(pages).toBe(5);
    expect((await open(bytes)).getPageCount()).toBe(5);
  });

  it('keeps different page sizes intact', async () => {
    const a = await makePdf(1, { size: [612, 792] });
    const b = await makePdf(1, { size: [841.89, 595.28] });
    const merged = await open((await mergePdfs([{ name: 'a', bytes: a }, { name: 'b', bytes: b }])).bytes);
    expect(merged.getPage(0).getSize()).toEqual({ width: 612, height: 792 });
    expect(merged.getPage(1).getWidth()).toBeCloseTo(841.89);
  });

  it('needs at least two files', async () => {
    await expect(mergePdfs([{ name: 'a', bytes: await makePdf(1) }])).rejects.toThrow(/at least two/);
  });

  it('names the broken file when one input is bad', async () => {
    await expect(
      mergePdfs([{ name: 'good.pdf', bytes: await makePdf(1) }, { name: 'broken.pdf', bytes: new Uint8Array(10) }]),
    ).rejects.toThrow(/broken\.pdf/);
  });

  it('reports progress up to the total', async () => {
    const seen: number[] = [];
    await mergePdfs(
      [{ name: 'a', bytes: await makePdf(1) }, { name: 'b', bytes: await makePdf(1) }],
      (done) => seen.push(done),
    );
    expect(seen.at(-1)).toBe(2);
  });

  it('stamps its own producer instead of the library name', async () => {
    const merged = await open((await mergePdfs([{ name: 'a', bytes: await makePdf(1) }, { name: 'b', bytes: await makePdf(1) }])).bytes);
    expect(merged.getProducer()).toBe(PRODUCER);
  });
});

describe('splitPdf', () => {
  it('makes one file per range', async () => {
    const out = await splitPdf(await makePdf(6), 'report.pdf', {
      mode: 'ranges',
      ranges: [{ start: 1, end: 2 }, { start: 5, end: 6 }],
      combine: false,
    });
    expect(out.map((f) => f.name)).toEqual(['report (pages 1-2).pdf', 'report (pages 5-6).pdf']);
    expect((await open(out[1].bytes)).getPageCount()).toBe(2);
  });

  it('can combine ranges into one file', async () => {
    const out = await splitPdf(await makePdf(6), 'report.pdf', {
      mode: 'ranges',
      ranges: [{ start: 1, end: 1 }, { start: 4, end: 6 }],
      combine: true,
    });
    expect(out).toHaveLength(1);
    expect((await open(out[0].bytes)).getPageCount()).toBe(4);
  });

  it('splits every N pages', async () => {
    const out = await splitPdf(await makePdf(5), 'a.pdf', { mode: 'every', size: 2 });
    expect(out.map((f) => f.name)).toEqual(['a (pages 1-2).pdf', 'a (pages 3-4).pdf', 'a (page 5).pdf']);
  });

  it('refuses ranges outside the document', async () => {
    await expect(
      splitPdf(await makePdf(3), 'a.pdf', { mode: 'ranges', ranges: [{ start: 2, end: 9 }], combine: false }),
    ).rejects.toThrow(/outside this 3-page document/);
  });
});

describe('organizePdf', () => {
  it('reorders, drops and rotates pages', async () => {
    const src = await makePdf(4);
    const out = await open(
      await organizePdf(src, [
        { source: 3, rotate: 0 },
        { source: 0, rotate: 90 },
      ]),
    );
    expect(out.getPageCount()).toBe(2);
    expect(out.getPage(1).getRotation().angle).toBe(90);
  });

  it('adds to an existing rotation and wraps at 360', async () => {
    const out = await open(await organizePdf(await makePdf(1, { rotate: 270 }), [{ source: 0, rotate: 180 }]));
    expect(out.getPage(0).getRotation().angle).toBe(90);
  });

  it('accepts negative (anticlockwise) rotations', async () => {
    const out = await open(await organizePdf(await makePdf(1), [{ source: 0, rotate: -90 }]));
    expect(out.getPage(0).getRotation().angle).toBe(270);
  });

  it('refuses to delete every page', async () => {
    await expect(organizePdf(await makePdf(2), [])).rejects.toThrow(/at least one page/);
  });

  it('refuses page indices that do not exist', async () => {
    await expect(organizePdf(await makePdf(2), [{ source: 5, rotate: 0 }])).rejects.toThrow(/Page 6 does not exist/);
  });
});

describe('rotateAll', () => {
  it('rotates each page relative to where it was', async () => {
    const src = await organizePdf(await makePdf(2), [
      { source: 0, rotate: 0 },
      { source: 1, rotate: 90 },
    ]);
    const out = await open(await rotateAll(src, 90));
    expect(out.getPages().map((p) => p.getRotation().angle)).toEqual([90, 180]);
  });
});

describe('watermarkPdf', () => {
  const base = { opacity: 0.2, size: 48, angle: 45, color: '#cc0000', layout: 'centre' as const };

  it('watermarks every page and grows the file', async () => {
    const src = await makePdf(3);
    const { bytes, replaced } = await watermarkPdf(src, { ...base, text: 'CONFIDENTIAL' });
    expect(replaced).toBe(0);
    expect((await open(bytes)).getPageCount()).toBe(3);
    expect(bytes.length).toBeGreaterThan(src.length);
  });

  it('tiles without failing on rotated pages', async () => {
    const { bytes } = await watermarkPdf(await makePdf(2, { rotate: 90 }), { ...base, text: 'DRAFT', layout: 'tile' });
    expect((await open(bytes)).getPageCount()).toBe(2);
  });

  it('replaces characters the font cannot draw rather than crashing', async () => {
    const { replaced } = await watermarkPdf(await makePdf(1), { ...base, text: 'খসড়া draft' });
    expect(replaced).toBeGreaterThan(0);
  });

  it('needs some text', async () => {
    await expect(watermarkPdf(await makePdf(1), { ...base, text: '   ' })).rejects.toThrow(/watermark text/);
  });
});

describe('page numbers', () => {
  it('formats labels', () => {
    expect(formatPageLabel('Page {n} of {total}', 3, 9)).toBe('Page 3 of 9');
    expect(formatPageLabel('{n}', 12, 20)).toBe('12');
  });

  it('numbers every position on every rotation', async () => {
    for (const rotate of [0, 90, 180, 270]) {
      for (const position of ['bottom-left', 'bottom-centre', 'bottom-right', 'top-left', 'top-centre', 'top-right'] as const) {
        const out = await addPageNumbers(await makePdf(2, { rotate }), {
          position,
          format: '{n} / {total}',
          startAt: 1,
          skipFirst: false,
          size: 10,
          margin: 28,
          color: '#333333',
        });
        expect((await open(out)).getPageCount()).toBe(2);
      }
    }
  });
});

describe('stampImage', () => {
  it('places a signature on the chosen page', async () => {
    const src = await makePdf(2);
    const out = await stampImage(src, TINY_PNG, [{ page: 1, x: 0.6, y: 0.8, width: 0.25 }]);
    expect(out.length).toBeGreaterThan(src.length);
  });

  it('refuses a page that does not exist', async () => {
    await expect(stampImage(await makePdf(1), TINY_PNG, [{ page: 3, x: 0, y: 0, width: 0.2 }])).rejects.toThrow(/Page 4/);
  });

  it('needs a placement', async () => {
    await expect(stampImage(await makePdf(1), TINY_PNG, [])).rejects.toThrow(/Place the signature/);
  });
});

describe('imagesToPdf', () => {
  it('fits landscape images on landscape pages when orientation is auto', () => {
    const [w, h] = imagePageSize({ width: 4000, height: 3000 }, { pageSize: 'a4', orientation: 'auto', margin: 0 });
    expect(w).toBeGreaterThan(h);
  });

  it('respects a forced portrait orientation', () => {
    const [w, h] = imagePageSize({ width: 4000, height: 3000 }, { pageSize: 'letter', orientation: 'portrait', margin: 0 });
    expect([w, h]).toEqual([612, 792]);
  });

  it('sizes "fit" pages to the image aspect ratio plus margins', () => {
    const [w, h] = imagePageSize({ width: 1000, height: 2000 }, { pageSize: 'fit', orientation: 'auto', margin: 10 });
    expect(w - 20).toBeCloseTo(595.28);
    expect(h - 20).toBeCloseTo(595.28 * 2);
  });

  it('makes one page per image', async () => {
    const img = { bytes: TINY_PNG, format: 'png' as const, width: 1, height: 1 };
    const out = await open(await imagesToPdf([img, img, img], { pageSize: 'a4', orientation: 'auto', margin: 24 }));
    expect(out.getPageCount()).toBe(3);
  });

  it('needs at least one image', async () => {
    await expect(imagesToPdf([], { pageSize: 'a4', orientation: 'auto', margin: 0 })).rejects.toThrow(/at least one image/);
  });
});

describe('textToPdf', () => {
  const opts = { font: 'sans' as const, size: 11, pageSize: 'a4' as const, margin: 56, pageNumbers: true };

  it('flows long text onto more pages', async () => {
    const long = Array.from({ length: 400 }, (_, i) => `Line ${i} of a long note.`).join('\n');
    const { pages } = await textToPdf('Notes', long, opts);
    expect(pages).toBeGreaterThan(5);
  });

  it('handles headings, bullets, tabs and very long words', async () => {
    const { bytes, replaced } = await textToPdf('', `# Heading\n## Sub\n- item\n\tindented\n${'x'.repeat(500)}`, opts);
    expect(replaced).toBe(0);
    expect((await open(bytes)).getPageCount()).toBeGreaterThanOrEqual(1);
  });

  it('keeps WinAnsi punctuation like curly quotes, dashes and the euro sign', async () => {
    const { replaced } = await textToPdf('', '“Quoted” — it costs €5…', opts);
    expect(replaced).toBe(0);
  });

  it('counts characters it had to replace (emoji, Bangla)', async () => {
    const { replaced } = await textToPdf('', 'Hello 👋 আমার', { ...opts, font: 'serif' });
    // 👋, আ, ম, র → four visible '?' marks (the vowel sign rides on its consonant)
    expect(replaced).toBe(4);
  });

  it('sets the document title', async () => {
    const { bytes } = await textToPdf('Weekly report', 'Body', { ...opts, font: 'mono', pageSize: 'letter' });
    expect((await open(bytes)).getTitle()).toBe('Weekly report');
  });

  it('refuses an empty document', async () => {
    await expect(textToPdf(' ', ' ', opts)).rejects.toThrow(/Write something/);
  });
});

describe('compression honesty', () => {
  it('never reports a saving that did not happen', () => {
    const original = new Uint8Array(100);
    const r = compareSizes(original, [new Uint8Array(120), new Uint8Array(100)]);
    expect(r.changed).toBe(false);
    expect(r.bytes).toBe(original);
    expect(r.newSize).toBe(100);
  });

  it('picks the smallest candidate', () => {
    const r = compareSizes(new Uint8Array(100), [new Uint8Array(80), new Uint8Array(60)]);
    expect(r).toMatchObject({ changed: true, newSize: 60, originalSize: 100 });
  });

  it('returns a file that is never larger than the original', async () => {
    const src = await makePdf(5);
    const r = await optimizeLossless(src);
    expect(r.newSize).toBeLessThanOrEqual(src.length);
    expect(r.bytes.length).toBe(r.newSize);
    expect((await open(r.bytes)).getPageCount()).toBe(5);
  });

  it('shrinks a bloated file with unused objects', async () => {
    const doc = await PDFDocument.create();
    const font = await doc.embedFont(StandardFonts.Helvetica);
    doc.addPage().drawText('kept', { font });
    for (let i = 0; i < 200; i++) doc.context.register(doc.context.obj({ Junk: 'x'.repeat(200) }));
    const src = await doc.save({ useObjectStreams: false });
    const r = await optimizeLossless(src);
    expect(r.changed).toBe(true);
    expect(r.newSize).toBeLessThan(src.length * 0.5);
  });
});

describe('metadata', () => {
  it('reads what is there', async () => {
    const meta = await readMetadata(await makePdf(2, { title: 'Lease' }));
    expect(meta).toMatchObject({ title: 'Lease', author: 'Test Author', pages: 2 });
  });

  it('writes and clears fields', async () => {
    const out = await writeMetadata(await makePdf(1, { title: 'Old' }), { title: 'New', author: '', subject: 'S', keywords: 'a, b' });
    const meta = await readMetadata(out);
    expect(meta.title).toBe('New');
    expect(meta.author).toBe('');
    expect(meta.subject).toBe('S');
  });

  it('strips everything, including the producer', async () => {
    const meta = await readMetadata(await stripMetadata(await makePdf(1, { title: 'Secret' })));
    expect(meta).toMatchObject({ title: '', author: '', producer: '', hasXmp: false });
  });
});

describe('small helpers', () => {
  it('parses short and long hex colours', () => {
    expect(hexToRgb('#fff')).toEqual(hexToRgb('#ffffff'));
    expect(hexToRgb('nonsense')).toEqual(hexToRgb('#000'));
  });

  it('strips extensions from names', () => {
    expect(baseName('Tax return 2026.PDF')).toBe('Tax return 2026');
    expect(baseName('.pdf')).toBe('document');
  });
});
