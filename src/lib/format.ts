export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
  const v = bytes / 1024 ** i;
  return `${v >= 100 || i === 0 ? Math.round(v) : v.toFixed(1)} ${units[i]}`;
}

export function plural(n: number, word: string, many = `${word}s`): string {
  return `${n} ${n === 1 ? word : many}`;
}

export function percentSaved(before: number, after: number): number {
  if (before <= 0 || after >= before) return 0;
  return Math.round(((before - after) / before) * 100);
}

/** 0-based sorted indices to a compact "1-3, 5" string. */
export function indicesToRanges(indices: number[]): string {
  const sorted = [...new Set(indices)].sort((a, b) => a - b);
  const parts: string[] = [];
  for (let i = 0; i < sorted.length; i++) {
    const start = sorted[i];
    while (i + 1 < sorted.length && sorted[i + 1] === sorted[i] + 1) i++;
    parts.push(start === sorted[i] ? `${start + 1}` : `${start + 1}-${sorted[i] + 1}`);
  }
  return parts.join(', ');
}

export function timeAgo(ts: number, now = Date.now()): string {
  const s = Math.round((now - ts) / 1000);
  if (s < 60) return 'just now';
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} h ago`;
  const d = Math.round(h / 24);
  if (d < 7) return `${d} d ago`;
  return new Date(ts).toLocaleDateString();
}

/** Characters Android, Windows and most share targets refuse in file names. */
export function safeFileName(name: string, fallback = 'document.pdf'): string {
  const dot = name.lastIndexOf('.');
  const ext = dot >= 0 && name.length - dot >= 2 && name.length - dot <= 6 ? name.slice(dot) : '';
  let stem = (ext ? name.slice(0, dot) : name)
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u001f\\/:*?"<>|]+/g, '-')
    .replace(/\s+/g, ' ')
    .replace(/^[\s.-]+|[\s.]+$/g, '');
  // Keep well under the 255-byte limit, even with multi-byte characters.
  if (stem.length > 120) stem = `${stem.slice(0, 117).trim()}…`;
  return stem ? `${stem}${ext}` : fallback;
}
