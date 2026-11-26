/** File-type checks shared by drop zones, paste and the home quick start. */

export type FileKind = 'pdf' | 'images' | 'text';

const IMAGE_EXT = /\.(jpe?g|png|webp|gif|bmp|avif|hei[cf])$/i;

export function isPdf(f: File) {
  return f.type === 'application/pdf' || /\.pdf$/i.test(f.name);
}

export function isImage(f: File) {
  return f.type.startsWith('image/') || IMAGE_EXT.test(f.name);
}

export function isText(f: File) {
  return f.type.startsWith('text/') || /\.(txt|md|markdown|csv|log)$/i.test(f.name);
}

export const ACCEPT_ATTR: Record<FileKind, string> = {
  pdf: 'application/pdf,.pdf',
  images: 'image/*,.heic,.heif',
  text: 'text/plain,text/markdown,.txt,.md,.markdown,.csv,.log',
};

const CHECK: Record<FileKind, (f: File) => boolean> = { pdf: isPdf, images: isImage, text: isText };

export const LARGE_FILE = 250 * 1024 * 1024;

export function filterFiles(files: File[], kind: FileKind): { ok: File[]; rejected: File[] } {
  const ok: File[] = [];
  const rejected: File[] = [];
  for (const f of files) (CHECK[kind](f) ? ok : rejected).push(f);
  return { ok, rejected };
}

export async function readBytes(file: File): Promise<Uint8Array> {
  return new Uint8Array(await file.arrayBuffer());
}
