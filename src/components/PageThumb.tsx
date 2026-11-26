import type { ReactNode } from 'react';
import type { PdfProxy } from '../lib/pdf/render';
import { useThumb } from './hooks';
import { cx } from './ui';

/** A page as a little sheet of paper. Rotation is shown with CSS. */
export function PageThumb({
  pdf,
  page,
  rotate = 0,
  width = 200,
  className,
  children,
  dim,
}: {
  pdf: PdfProxy | null | undefined;
  page: number;
  rotate?: number;
  width?: number;
  className?: string;
  children?: ReactNode;
  dim?: boolean;
}) {
  const { ref, url } = useThumb(pdf, page, width);
  const sideways = Math.abs(rotate % 180) === 90;
  return (
    <div ref={ref} className={cx('relative flex aspect-[3/4] items-center justify-center', className)}>
      {url ? (
        <img
          src={url}
          alt={`Page ${page}`}
          draggable={false}
          className={cx(
            'max-h-full max-w-full rounded-[3px] bg-white shadow-sheet ring-1 ring-black/5 transition-[transform,opacity,filter] duration-300 ease-out-soft',
            dim && 'opacity-30 grayscale',
          )}
          style={{ transform: `rotate(${rotate}deg) scale(${sideways ? 0.74 : 1})` }}
        />
      ) : (
        <div className="h-[92%] w-[70%] animate-pulse rounded-[3px] bg-sunk" />
      )}
      {children}
    </div>
  );
}
