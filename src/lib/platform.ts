/**
 * Saving and sharing results.
 * - Android app: files are written to Documents › Simply PDF and shared with
 *   the native share sheet, because WebView downloads do nothing.
 * - Browser (the website): saving is an ordinary download made from a local
 *   blob, so nothing is uploaded. Sharing uses the system share sheet where the
 *   browser offers one (phones, Safari, Edge); elsewhere the Share button is
 *   hidden and Save does the job.
 */
import { Capacitor } from '@capacitor/core';
import JSZip from 'jszip';
import { safeFileName } from './format';

/** True inside the installed Android app, false in a browser (the website). */
export const isNative = Capacitor.isNativePlatform();

export interface Saveable {
  name: string;
  blob: Blob;
}

export type SaveOutcome = { ok: true; message: string } | { ok: false; message: string };

const FOLDER = 'Simply PDF';

/** Turns a slice of a blob into base64 without building one giant string. */
async function sliceToBase64(blob: Blob): Promise<string> {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) {
    bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000) as unknown as number[]);
  }
  return btoa(bin);
}

// Files cross the native bridge as base64 text. Sending a 100 MB PDF in one go
// can crash the WebView, so it goes in pieces. A multiple of 3 keeps every
// piece valid base64 on its own.
const CHUNK = 3 * 1024 * 1024;

async function writeInChunks(path: string, blob: Blob, directory: import('@capacitor/filesystem').Directory) {
  const { Filesystem } = await import('@capacitor/filesystem');
  const first = await sliceToBase64(blob.slice(0, CHUNK));
  const result = await Filesystem.writeFile({ path, data: first, directory, recursive: true });
  for (let offset = CHUNK; offset < blob.size; offset += CHUNK) {
    await Filesystem.appendFile({ path, data: await sliceToBase64(blob.slice(offset, offset + CHUNK)), directory });
  }
  return result.uri;
}

/** "report.pdf" → "report (2).pdf" until the name is free, so nothing is overwritten.
 *  Lists the folder once rather than asking about each candidate name. */
async function freeName(name: string, directory: import('@capacitor/filesystem').Directory): Promise<string> {
  const { Filesystem } = await import('@capacitor/filesystem');
  let taken = new Set<string>();
  try {
    const { files } = await Filesystem.readdir({ path: FOLDER, directory });
    taken = new Set(files.map((f) => (typeof f === 'string' ? f : f.name).toLowerCase()));
  } catch {
    // The folder doesn't exist yet, so every name is free.
  }
  for (let i = 1; i < 1000; i++) {
    const candidate = i === 1 ? name : name.replace(/(\.[^.]+)?$/, ` (${i})$1`);
    if (!taken.has(candidate.toLowerCase())) return candidate;
  }
  return name.replace(/(\.[^.]+)?$/, ` (${Date.now()})$1`);
}

/** Android 10 and older need the storage permission to write to Documents. */
async function ensureWriteAccess(): Promise<boolean> {
  const { Filesystem } = await import('@capacitor/filesystem');
  try {
    const status = await Filesystem.checkPermissions();
    if (status.publicStorage === 'granted') return true;
    const asked = await Filesystem.requestPermissions();
    return asked.publicStorage === 'granted';
  } catch {
    // Android 11+ does not use this permission at all; just try the write.
    return true;
  }
}

async function saveNative(file: Saveable): Promise<string> {
  const { Directory } = await import('@capacitor/filesystem');
  const name = await freeName(safeFileName(file.name), Directory.Documents);
  await writeInChunks(`${FOLDER}/${name}`, file.blob, Directory.Documents);
  return name;
}

export async function saveFile(file: Saveable): Promise<SaveOutcome> {
  if (isNative) {
    try {
      if (!(await ensureWriteAccess())) throw new Error('permission');
      const name = await saveNative(file);
      return { ok: true, message: `Saved to Documents › ${FOLDER} as ${name}` };
    } catch {
      // Some devices refuse direct writes; the share sheet always works and
      // includes "Save to Files" / "Drive" style targets.
      const shared = await shareFile(file);
      return shared.ok ? { ok: true, message: 'Choose where to keep it' } : shared;
    }
  }
  const url = URL.createObjectURL(file.blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = safeFileName(file.name);
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Give the browser time to start the download before the blob is freed.
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
  return { ok: true, message: `Downloading ${a.download}` };
}

/** True when files can be handed to the system share sheet. */
export function canShare(): boolean {
  if (isNative) return true;
  try {
    const probe = new File([new Uint8Array(1)], 'probe.pdf', { type: 'application/pdf' });
    return typeof navigator.canShare === 'function' && navigator.canShare({ files: [probe] });
  } catch {
    return false;
  }
}

/** Old shared copies live in the app's cache; clear them so it never grows. */
async function clearShareCache() {
  try {
    const { Filesystem, Directory } = await import('@capacitor/filesystem');
    await Filesystem.rmdir({ path: 'share', directory: Directory.Cache, recursive: true });
  } catch {
    /* nothing to clear */
  }
}

export async function shareFile(file: Saveable): Promise<SaveOutcome> {
  try {
    if (isNative) {
      const { Directory } = await import('@capacitor/filesystem');
      await clearShareCache();
      const uri = await writeInChunks(`share/${safeFileName(file.name)}`, file.blob, Directory.Cache);
      const { Share } = await import('@capacitor/share');
      await Share.share({ title: file.name, files: [uri] });
      return { ok: true, message: 'Shared' };
    }
    const f = new File([file.blob], safeFileName(file.name), { type: file.blob.type });
    await navigator.share({ files: [f], title: file.name });
    return { ok: true, message: 'Shared' };
  } catch (err) {
    const msg = err instanceof Error ? `${err.name} ${err.message}` : String(err);
    if (/abort|cancel/i.test(msg)) return { ok: false, message: '' };
    return {
      ok: false,
      message: isNative ? 'Sharing is not available here. Use Save instead.' : 'Sharing is not available in this browser. Use Download instead.',
    };
  }
}

export async function zipFiles(files: Saveable[], name: string): Promise<Saveable> {
  const zip = new JSZip();
  const used = new Set<string>();
  for (const f of files) {
    const base = safeFileName(f.name);
    let n = base;
    for (let i = 2; used.has(n.toLowerCase()); i++) n = base.replace(/(\.[^.]+)?$/, ` (${i})$1`);
    used.add(n.toLowerCase());
    zip.file(n, f.blob);
  }
  const blob = await zip.generateAsync({ type: 'blob', compression: 'STORE' });
  return { name: safeFileName(name, 'Simply PDF files.zip'), blob };
}

export function toBlob(bytes: Uint8Array, type = 'application/pdf'): Blob {
  return new Blob([bytes as BlobPart], { type });
}
