/**
 * Page-range parsing for Split and Extract.
 *
 * Accepts what people actually type: "1-3, 5, 8-", "2–4" (en dash), "last",
 * "7-3" (reversed). Every problem is reported with the piece that caused it,
 * instead of being silently dropped.
 */

export interface PageRange {
  /** 1-based, inclusive */
  start: number;
  /** 1-based, inclusive */
  end: number;
}

export interface ParsedRanges {
  ranges: PageRange[];
  errors: string[];
}

const DASH = /\s*[-–—]\s*/;

function readBound(raw: string, total: number): number | null {
  const s = raw.trim().toLowerCase();
  if (s === 'last' || s === 'end') return total;
  if (!/^\d+$/.test(s)) return null;
  return parseInt(s, 10);
}

export function parsePageRanges(input: string, total: number): ParsedRanges {
  const ranges: PageRange[] = [];
  const errors: string[] = [];
  const parts = input.split(/[,;]+/).map((p) => p.trim()).filter(Boolean);

  if (parts.length === 0) {
    errors.push('Enter at least one page, for example 1-3, 5.');
    return { ranges, errors };
  }

  for (const part of parts) {
    const pieces = part.split(DASH);
    if (pieces.length > 2) {
      errors.push(`"${part}" has too many dashes.`);
      continue;
    }

    let start: number | null;
    let end: number | null;
    if (pieces.length === 1) {
      start = end = readBound(pieces[0], total);
    } else {
      // "-4" means from the first page, "8-" means to the last page.
      start = pieces[0].trim() === '' ? 1 : readBound(pieces[0], total);
      end = pieces[1].trim() === '' ? total : readBound(pieces[1], total);
    }

    if (start === null || end === null) {
      errors.push(`"${part}" is not a page number.`);
      continue;
    }
    if (start > end) [start, end] = [end, start];
    if (start < 1 || end > total) {
      errors.push(`"${part}" is outside this document, which has ${total} page${total === 1 ? '' : 's'}.`);
      continue;
    }
    ranges.push({ start, end });
  }

  return { ranges, errors };
}

/** Flattens ranges into unique 0-based page indices, in document order. */
export function rangesToIndices(ranges: PageRange[]): number[] {
  const set = new Set<number>();
  for (const r of ranges) for (let p = r.start; p <= r.end; p++) set.add(p - 1);
  return [...set].sort((a, b) => a - b);
}

/** Splits a document into consecutive chunks of `size` pages. */
export function chunkRanges(total: number, size: number): PageRange[] {
  const step = Math.max(1, Math.floor(size));
  const out: PageRange[] = [];
  for (let s = 1; s <= total; s += step) out.push({ start: s, end: Math.min(total, s + step - 1) });
  return out;
}

export function describeRange(r: PageRange): string {
  return r.start === r.end ? `${r.start}` : `${r.start}-${r.end}`;
}
