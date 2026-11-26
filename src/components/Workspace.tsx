import type { ReactNode } from 'react';
import { FileText, RefreshCw } from 'lucide-react';
import type { JobState } from './hooks';
import { formatBytes, plural } from '../lib/format';
import { Button, Notice, ProgressBar, Sheet, cx } from './ui';

/**
 * Two panes on wide screens (the document on the left, options on the right),
 * one column on phones with the main action pinned to the bottom of the screen.
 */
export function Workspace({
  main,
  side,
  action,
  job,
}: {
  main: ReactNode;
  side?: ReactNode;
  action?: ReactNode;
  job?: JobState<unknown>;
}) {
  const status =
    job?.status === 'working' ? (
      <ProgressBar {...job.progress} />
    ) : job?.status === 'error' ? (
      <Notice tone="error">{job.message}</Notice>
    ) : null;

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-8">
      <div className="min-w-0 space-y-4">{main}</div>
      {(side || action) && (
        <aside className="min-w-0 lg:sticky lg:top-24 lg:self-start">
          <Sheet className="space-y-6 p-5 sm:p-6">
            {side}
            <div className="hidden space-y-4 lg:block">
              {status}
              {action}
            </div>
          </Sheet>
          {/* Phone: the action sits in a bar at the bottom of the screen. */}
          <div className="h-32 lg:hidden" aria-hidden />
          <div className="safe-bottom pointer-events-none fixed inset-x-0 bottom-0 z-30 px-3 lg:hidden">
            <div className="glass glass-strong pointer-events-auto mx-auto max-w-xl space-y-3 rounded-[28px] p-2.5">
              {status && <div className="px-2 pt-1">{status}</div>}
              {action}
            </div>
          </div>
        </aside>
      )}
    </div>
  );
}

/** The chosen file, with a way to swap it. */
export function FileHeader({
  file,
  pages,
  onClear,
  extra,
}: {
  file: File;
  pages?: number;
  onClear: () => void;
  extra?: ReactNode;
}) {
  return (
    <Sheet className="flex items-center gap-3 p-3 pl-4">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-sunk text-ink-2">
        <FileText className="size-5" strokeWidth={1.75} aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold" title={file.name}>
          {file.name}
        </p>
        <p className="num mt-0.5 text-[11px] text-ink-3">
          {formatBytes(file.size)}
          {pages !== undefined && ` · ${plural(pages, 'page')}`}
        </p>
      </div>
      {extra}
      <Button variant="ghost" size="sm" onClick={onClear} icon={<RefreshCw className="size-3.5" aria-hidden />}>
        Change
      </Button>
    </Sheet>
  );
}

export function Loading({ label = 'Opening on this device…', className }: { label?: string; className?: string }) {
  return (
    <Sheet className={cx('p-6', className)}>
      <ProgressBar done={0} total={0} label={label} />
    </Sheet>
  );
}
