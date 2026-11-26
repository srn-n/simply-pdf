import { PDFDocument, StandardFonts } from 'pdf-lib';
import { describe, expect, it } from 'vitest';
import { sanitizeForFont, wrapLine } from '../src/lib/pdf/text';

const font = async () => (await PDFDocument.create()).embedFont(StandardFonts.Helvetica);

describe('sanitizeForFont', () => {
  it('leaves supported text alone', async () => {
    expect(sanitizeForFont('Hello, world! £10 ©', await font())).toEqual({ text: 'Hello, world! £10 ©', replaced: 0 });
  });

  it('turns tabs into spaces and normalises line endings', async () => {
    expect(sanitizeForFont('a\tb\r\nc', await font()).text).toBe('a    b\nc');
  });

  it('keeps the base letter of accented letters the font lacks', async () => {
    expect(sanitizeForFont('Kā Ōtautahi', await font())).toEqual({ text: 'Ka Otautahi', replaced: 0 });
  });

  it('drops lone combining accents', async () => {
    expect(sanitizeForFont('Kā', await font()).text).toBe('Ka');
  });

  it('replaces each unsupported character with one ?', async () => {
    expect(sanitizeForFont('日本', await font())).toEqual({ text: '??', replaced: 2 });
  });
});

describe('wrapLine', () => {
  it('never produces a line wider than the limit', async () => {
    const f = await font();
    const lines = wrapLine('The quick brown fox jumps over the lazy dog '.repeat(10), f, 11, 200);
    for (const l of lines) expect(f.widthOfTextAtSize(l, 11)).toBeLessThanOrEqual(200);
    expect(lines.length).toBeGreaterThan(3);
  });

  it('hard-breaks a single huge word', async () => {
    const f = await font();
    const lines = wrapLine('W'.repeat(100), f, 11, 100);
    expect(lines.join('')).toBe('W'.repeat(100));
    expect(lines.length).toBeGreaterThan(1);
  });

  it('returns one empty line for empty input', async () => {
    expect(wrapLine('', await font(), 11, 100)).toEqual(['']);
  });
});
