import { describe, expect, it } from 'vitest';
import { formatBytes, indicesToRanges, percentSaved, plural, timeAgo } from '../src/lib/format';

describe('formatBytes', () => {
  it('uses sensible precision', () => {
    expect(formatBytes(0)).toBe('0 B');
    expect(formatBytes(512)).toBe('512 B');
    expect(formatBytes(1536)).toBe('1.5 KB');
    expect(formatBytes(250 * 1024)).toBe('250 KB');
    expect(formatBytes(4.2 * 1024 * 1024)).toBe('4.2 MB');
  });
});

describe('percentSaved', () => {
  it('rounds the real saving', () => {
    expect(percentSaved(1000, 380)).toBe(62);
  });
  it('is zero when nothing was saved, never negative', () => {
    expect(percentSaved(1000, 1000)).toBe(0);
    expect(percentSaved(1000, 1200)).toBe(0);
    expect(percentSaved(0, 0)).toBe(0);
  });
});

describe('indicesToRanges', () => {
  it('collapses runs and sorts', () => {
    expect(indicesToRanges([4, 0, 1, 2, 7, 8])).toBe('1-3, 5, 8-9');
    expect(indicesToRanges([])).toBe('');
  });
});

describe('plural and timeAgo', () => {
  it('pluralises', () => {
    expect(plural(1, 'page')).toBe('1 page');
    expect(plural(3, 'page')).toBe('3 pages');
  });
  it('describes recent times', () => {
    const now = 1_000_000_000_000;
    expect(timeAgo(now - 5_000, now)).toBe('just now');
    expect(timeAgo(now - 5 * 60_000, now)).toBe('5 min ago');
    expect(timeAgo(now - 3 * 3_600_000, now)).toBe('3 h ago');
  });
});
