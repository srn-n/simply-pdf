import type { PDFFont } from 'pdf-lib';

/**
 * The 14 standard PDF fonts can only draw the WinAnsi character set. Drawing
 * anything else (Bangla, Arabic, CJK, emoji...) makes pdf-lib throw halfway
 * through a document. This swaps unsupported characters for a visible
 * placeholder and reports how many were replaced, so nothing fails silently.
 */
const REPLACEMENTS: Record<string, string> = {
  '\t': '    ',
  ' ': ' ',
  ' ': ' ',
  ' ': ' ',
  '−': '-',
  '‐': '-',
  '‑': '-',
  '‒': '-',
  '′': "'",
  '″': '"',
  '→': '->',
  '←': '<-',
  '✓': 'v',
  '✔': 'v',
};

const charsetCache = new WeakMap<PDFFont, Set<number>>();

function charset(font: PDFFont): Set<number> {
  let set = charsetCache.get(font);
  if (!set) {
    set = new Set(font.getCharacterSet());
    charsetCache.set(font, set);
  }
  return set;
}

export interface SanitizedText {
  text: string;
  replaced: number;
}

export function sanitizeForFont(input: string, font: PDFFont): SanitizedText {
  const supported = charset(font);
  let replaced = 0;
  let text = '';
  for (const ch of input.replace(/\r\n?/g, '\n')) {
    if (ch === '\n') {
      text += ch;
      continue;
    }
    const mapped = REPLACEMENTS[ch];
    if (mapped !== undefined) {
      text += mapped;
      continue;
    }
    const cp = ch.codePointAt(0)!;
    if (supported.has(cp)) {
      text += ch;
    } else if (/\p{M}/u.test(ch)) {
      // A lone combining accent: the letter before it has already been kept.
      continue;
    } else {
      // Strip combining marks quietly when the base letter survives (é typed as e + ´).
      const base = ch.normalize('NFD')[0];
      if (base && base !== ch && supported.has(base.codePointAt(0)!)) {
        text += base;
      } else {
        text += '?';
        replaced++;
      }
    }
  }
  return { text, replaced };
}

/** Word-wraps a paragraph to a width, breaking very long words if needed. */
export function wrapLine(line: string, font: PDFFont, size: number, maxWidth: number): string[] {
  if (line === '') return [''];
  const words = line.split(/(\s+)/);
  const lines: string[] = [];
  let current = '';

  const width = (s: string) => font.widthOfTextAtSize(s, size);

  for (const word of words) {
    const candidate = current + word;
    if (width(candidate) <= maxWidth) {
      current = candidate;
      continue;
    }
    if (current.trim() !== '') lines.push(current.trimEnd());
    current = word.trimStart();
    // A single word wider than the line: hard-break it.
    while (width(current) > maxWidth && current.length > 1) {
      let cut = current.length - 1;
      while (cut > 1 && width(current.slice(0, cut)) > maxWidth) cut--;
      lines.push(current.slice(0, cut));
      current = current.slice(cut);
    }
  }
  if (current !== '' || lines.length === 0) lines.push(current.trimEnd());
  return lines;
}
