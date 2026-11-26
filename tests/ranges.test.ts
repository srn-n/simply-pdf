import { describe, expect, it } from 'vitest';
import { chunkRanges, describeRange, parsePageRanges, rangesToIndices } from '../src/lib/pdf/ranges';

describe('parsePageRanges', () => {
  it('reads single pages and ranges', () => {
    expect(parsePageRanges('1-3, 5', 10)).toEqual({ ranges: [{ start: 1, end: 3 }, { start: 5, end: 5 }], errors: [] });
  });

  it('accepts en and em dashes and spaces', () => {
    expect(parsePageRanges('2 – 4,6—7', 10).ranges).toEqual([{ start: 2, end: 4 }, { start: 6, end: 7 }]);
  });

  it('treats open ends as first and last page', () => {
    expect(parsePageRanges('8-', 10).ranges).toEqual([{ start: 8, end: 10 }]);
    expect(parsePageRanges('-3', 10).ranges).toEqual([{ start: 1, end: 3 }]);
  });

  it('understands "last"', () => {
    expect(parsePageRanges('last', 12).ranges).toEqual([{ start: 12, end: 12 }]);
    expect(parsePageRanges('10-last', 12).ranges).toEqual([{ start: 10, end: 12 }]);
  });

  it('swaps reversed ranges instead of rejecting them', () => {
    expect(parsePageRanges('7-3', 10).ranges).toEqual([{ start: 3, end: 7 }]);
  });

  it('reports pages outside the document', () => {
    const r = parsePageRanges('1, 14', 12);
    expect(r.ranges).toEqual([{ start: 1, end: 1 }]);
    expect(r.errors[0]).toMatch(/outside this document, which has 12 pages/);
  });

  it('reports page zero', () => {
    expect(parsePageRanges('0', 5).errors).toHaveLength(1);
  });

  it('reports text that is not a page number', () => {
    expect(parsePageRanges('two', 5).errors[0]).toMatch(/not a page number/);
    expect(parsePageRanges('1.5', 5).errors).toHaveLength(1);
    expect(parsePageRanges('1-2-3', 5).errors[0]).toMatch(/too many dashes/);
  });

  it('asks for input when empty', () => {
    expect(parsePageRanges('  , ', 5).errors).toHaveLength(1);
  });

  it('uses singular "page" for one-page documents', () => {
    expect(parsePageRanges('2', 1).errors[0]).toMatch(/has 1 page\./);
  });
});

describe('rangesToIndices', () => {
  it('dedupes overlapping ranges and sorts them', () => {
    expect(rangesToIndices([{ start: 3, end: 5 }, { start: 1, end: 4 }])).toEqual([0, 1, 2, 3, 4]);
  });
});

describe('chunkRanges', () => {
  it('splits into equal chunks with a short last chunk', () => {
    expect(chunkRanges(7, 3)).toEqual([{ start: 1, end: 3 }, { start: 4, end: 6 }, { start: 7, end: 7 }]);
  });
  it('never uses a chunk size below one', () => {
    expect(chunkRanges(2, 0)).toHaveLength(2);
  });
});

describe('describeRange', () => {
  it('collapses single pages', () => {
    expect(describeRange({ start: 4, end: 4 })).toBe('4');
    expect(describeRange({ start: 4, end: 6 })).toBe('4-6');
  });
});
