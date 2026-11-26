import { useEffect, useState, type ReactNode } from 'react';
import { getThumb, useElementWidth, usePageSize } from './hooks';
import type { PdfProxy } from '../lib/pdf/render';
import { Sheet } from './ui';

/**
 * A page shown at a known scale, with an overlay drawn in page points so live
 * previews (watermarks, page numbers) match what will be written.
 */
export function PagePreview({
  pdf,
  page = 1,
  overlay,
  maxWidth = 520,
}: {
  pdf: PdfProxy;
  page?: number;
  overlay?: (pt: (n: number) => number, size: { w: number; h: number }) => ReactNode;
  maxWidth?: number;
}) {
  const size = usePageSize(pdf, page);
  const { ref, width } = useElementWidth<HTMLDivElement>();
  const [url, setUrl] = useState('');
  useEffect(() => {
    let cancelled = false;
    getThumb(pdf, page, 640).then((u) => !cancelled && setUrl(u));
    return () => {
      cancelled = true;
    };
  }, [pdf, page]);

  const scale = size && width ? width / size.w : 0;
  return (
    <Sheet className="bg-sunk/60 p-4 sm:p-6">
      <div
        ref={ref}
        className="relative mx-auto w-full overflow-hidden rounded-[3px] bg-white shadow-sheet"
        style={{ maxWidth, aspectRatio: size ? `${size.w} / ${size.h}` : '3 / 4' }}
      >
        {url && <img src={url} alt={`Page ${page}`} className="absolute inset-0 size-full" draggable={false} />}
        {scale > 0 && size && overlay?.((n) => n * scale, size)}
      </div>
    </Sheet>
  );
}
