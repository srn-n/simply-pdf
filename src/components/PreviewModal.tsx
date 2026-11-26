import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { closePdf, openForRender, type PdfProxy } from '../lib/pdf/render';
import type { Saveable } from '../lib/platform';
import { formatBytes, plural } from '../lib/format';
import { PageThumb } from './PageThumb';
import { messageFor } from './hooks';
import { IconButton, Notice } from './ui';

/** Read-only, scrolling preview of a PDF. Pages render as they come into view. */
export function PreviewModal({ file, onClose }: { file: Saveable; onClose: () => void }) {
  const [pdf, setPdf] = useState<PdfProxy | null>(null);
  const [error, setError] = useState<string | null>(null);


  useEffect(() => {
    let proxy: PdfProxy | null = null;
    let cancelled = false;
    file.blob
      .arrayBuffer()
      .then((b) => openForRender(new Uint8Array(b)))
      .then((p) => {
        proxy = p;
        if (cancelled) closePdf(p);
        else setPdf(p);
      })
      .catch((e) => !cancelled && setError(messageFor(e)));
    return () => {
      cancelled = true;
      closePdf(proxy);
    };
  }, [file]);

  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    document.querySelector<HTMLElement>("[data-autofocus]")?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
      prev?.focus();
    };
  }, [onClose]);

  return (
    <div role="dialog" aria-modal="true" aria-label={`Preview of ${file.name}`} className="fixed inset-0 z-50 flex flex-col bg-sunk">
      <header className="safe-top flex items-center gap-3 border-b border-rule bg-paper px-4 py-2.5">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{file.name}</p>
          <p className="num text-[11px] text-ink-3">
            {formatBytes(file.blob.size)}
            {pdf && ` · ${plural(pdf.numPages, 'page')}`}
          </p>
        </div>
        <IconButton label="Close preview" onClick={onClose} data-autofocus>
          <X className="size-5" />
        </IconButton>
      </header>
      <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-6">
        {error && <Notice tone="error" className="mx-auto max-w-md">{error}</Notice>}
        {pdf && (
          <div className="mx-auto max-w-3xl space-y-5">
            {Array.from({ length: pdf.numPages }, (_, i) => (
              <figure key={i} className="space-y-1.5">
                <PageThumb pdf={pdf} page={i + 1} width={760} className="aspect-auto min-h-40" />
                <figcaption className="num text-center text-[10px] text-ink-3">{i + 1}</figcaption>
              </figure>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
