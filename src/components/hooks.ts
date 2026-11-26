import { useCallback, useEffect, useRef, useState } from 'react';
import { PdfError } from '../lib/pdf/engine';
import { closePdf, openForRender, thumbnail, type PdfProxy } from '../lib/pdf/render';
import { takeHandOff } from '../lib/store';
import { readBytes } from './files';

export interface ProgressState {
  done: number;
  total: number;
  label?: string;
}

export type JobState<R> =
  | { status: 'idle' }
  | { status: 'working'; progress: ProgressState }
  | { status: 'done'; result: R }
  | { status: 'error'; message: string };

/** Thrown into a running job when its screen is left, so the work stops. */
export class JobAborted extends Error {
  constructor() {
    super('The screen was closed');
    this.name = 'AbortError';
  }
}

export function messageFor(err: unknown): string {
  if (err instanceof PdfError) return err.message;
  if (err instanceof JobAborted) return '';
  if (err instanceof Error && err.name === 'NotReadableError') {
    return 'This file could not be read. It may have been moved, or it is stored in the cloud and not downloaded yet.';
  }
  if (err instanceof RangeError || (err instanceof Error && /memory|allocation/i.test(err.message))) {
    return 'This device ran out of memory. Try a smaller file, or fewer pages at once.';
  }
  console.error(err);
  return 'Something went wrong while processing the file. Nothing was uploaded; you can try again.';
}

/** Runs one job at a time, tracks progress and turns any error into a message. */
export function useJob<R>() {
  const [state, setState] = useState<JobState<R>>({ status: 'idle' });
  const alive = useRef(true);
  // Guards against a second tap starting the same job before React re-renders.
  const running = useRef(false);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  const run = useCallback(async (work: (progress: (done: number, total: number, label?: string) => void) => Promise<R>) => {
    if (running.current) return undefined;
    running.current = true;
    setState({ status: 'working', progress: { done: 0, total: 0 } });
    let last = 0;
    const progress = (done: number, total: number, label?: string) => {
      // Leaving the screen (Back, a tab) stops the job at its next step, so a
      // heavy job never keeps rendering pages in the background. Every engine
      // loop reports progress per page or file, which is where it stops.
      if (!alive.current) throw new JobAborted();
      const now = performance.now();
      if (now - last < 50 && done < total) return;
      last = now;
      if (alive.current) setState({ status: 'working', progress: { done, total, label } });
    };
    try {
      // Let the progress bar paint before heavy synchronous work starts.
      await new Promise((r) => requestAnimationFrame(() => r(null)));
      const result = await work(progress);
      if (alive.current) setState({ status: 'done', result });
      return result;
    } catch (err) {
      if (alive.current) setState({ status: 'error', message: messageFor(err) });
      return undefined;
    } finally {
      running.current = false;
    }
  }, []);

  const reset = useCallback(() => setState({ status: 'idle' }), []);
  return { state, run, reset, busy: state.status === 'working' };
}

/** Initial files handed over from the home page or a previous tool. */
export function useHandOff(onFiles: (files: File[]) => void) {
  const done = useRef(false);
  useEffect(() => {
    if (done.current) return;
    done.current = true;
    const files = takeHandOff();
    if (files?.length) onFiles(files);
  }, [onFiles]);
}

export interface LoadedPdf {
  file: File;
  bytes: Uint8Array;
  pdf: PdfProxy;
  pages: number;
}

/** Reads a PDF once and keeps a pdf.js proxy for previews. */
export function useLoadedPdf(file: File | null) {
  const [doc, setDoc] = useState<LoadedPdf | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Drop the previous document straight away: its pdf.js proxy is closed
    // below, and drawing thumbnails from a closed proxy throws.
    setDoc(null);
    setError(null);
    if (!file) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    let proxy: PdfProxy | null = null;
    setLoading(true);
    (async () => {
      try {
        const bytes = await readBytes(file);
        proxy = await openForRender(bytes);
        if (cancelled) return closePdf(proxy);
        setDoc({ file, bytes, pdf: proxy, pages: proxy.numPages });
      } catch (err) {
        if (!cancelled) {
          setDoc(null);
          setError(messageFor(err));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
      closePdf(proxy);
    };
  }, [file]);

  return { doc, error, loading };
}

const thumbCache = new WeakMap<PdfProxy, Map<string, Promise<string>>>();

export function getThumb(pdf: PdfProxy, page: number, width: number): Promise<string> {
  let map = thumbCache.get(pdf);
  if (!map) thumbCache.set(pdf, (map = new Map()));
  const key = `${page}:${width}`;
  let p = map.get(key);
  if (!p) {
    p = thumbnail(pdf, page, width).catch(() => '');
    map.set(key, p);
  }
  return p;
}

/** Renders a page thumbnail only once it scrolls near the viewport. */
export function useThumb(pdf: PdfProxy | null | undefined, page: number, width = 200) {
  const ref = useRef<HTMLDivElement>(null);
  const [url, setUrl] = useState('');
  useEffect(() => {
    if (!pdf || !ref.current) return;
    let cancelled = false;
    const el = ref.current;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          io.disconnect();
          getThumb(pdf, page, width).then((u) => !cancelled && setUrl(u));
        }
      },
      { rootMargin: '300px' },
    );
    io.observe(el);
    return () => {
      cancelled = true;
      io.disconnect();
    };
  }, [pdf, page, width]);
  return { ref, url };
}

/** Object URL for a blob or file that is revoked when it changes. */
export function useObjectUrl(blob: Blob | null | undefined) {
  const [url, setUrl] = useState('');
  useEffect(() => {
    if (!blob) return setUrl('');
    const u = URL.createObjectURL(blob);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [blob]);
  return url;
}

export function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(() => typeof window !== 'undefined' && window.matchMedia(query).matches);
  useEffect(() => {
    const m = window.matchMedia(query);
    const on = () => setMatches(m.matches);
    m.addEventListener('change', on);
    on();
    return () => m.removeEventListener('change', on);
  }, [query]);
  return matches;
}

/** Page size in points as displayed (rotation applied). */
export function usePageSize(pdf: import('../lib/pdf/render').PdfProxy | null | undefined, page: number) {
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  useEffect(() => {
    if (!pdf) return;
    let cancelled = false;
    pdf
      .getPage(page)
      .then((p) => {
        const v = p.getViewport({ scale: 1 });
        if (!cancelled) setSize({ w: v.width, h: v.height });
      })
      .catch(() => {
        /* the document was closed while this was loading */
      });
    return () => {
      cancelled = true;
    };
  }, [pdf, page]);
  return size;
}

export function useElementWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver(([e]) => setWidth(e.contentRect.width));
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);
  return { ref, width };
}
