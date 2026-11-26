import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { Camera, Plus, Upload } from 'lucide-react';
import { ACCEPT_ATTR, LARGE_FILE, filterFiles, type FileKind } from './files';
import { toast } from '../lib/store';
import { formatBytes } from '../lib/format';
import { isNative } from '../lib/platform';
import { cx } from './ui';

const KIND_WORD: Record<FileKind, [string, string]> = {
  pdf: ['PDF', 'PDFs'],
  images: ['image', 'images'],
  text: ['text file', 'text files'],
};

export interface DropZoneProps {
  kind: FileKind;
  multiple?: boolean;
  onFiles: (files: File[]) => void;
  title?: string;
  hint?: ReactNode;
  /** a slim "add more" row instead of the big target */
  compact?: boolean;
  camera?: boolean;
  /** listen for pasted files while mounted */
  paste?: boolean;
}

export function DropZone({ kind, multiple, onFiles, title, hint, compact, camera, paste = true }: DropZoneProps) {
  const id = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const depth = useRef(0);
  const [one, many] = KIND_WORD[kind];

  const accept = (list: FileList | File[] | null) => {
    if (!list || list.length === 0) return;
    const { ok, rejected } = filterFiles(Array.from(list), kind);
    if (rejected.length) {
      toast(
        rejected.length === 1
          ? `${rejected[0].name} isn't ${kind === 'images' ? 'an image' : `a ${one}`}, so it was skipped.`
          : `${rejected.length} files weren't ${many} and were skipped.`,
        'error',
      );
    }
    const big = ok.find((f) => f.size > LARGE_FILE);
    if (big) toast(`${big.name} is ${formatBytes(big.size)}. Large files can be slow on ${isNative ? 'phones' : 'older devices'}.`, 'ok');
    const chosen = multiple ? ok : ok.slice(0, 1);
    if (chosen.length) onFiles(chosen);
  };

  useEffect(() => {
    if (!paste) return;
    const onPaste = (e: ClipboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return;
      const files = Array.from(e.clipboardData?.files ?? []);
      if (files.length) {
        e.preventDefault();
        accept(files);
      }
    };
    window.addEventListener('paste', onPaste);
    return () => window.removeEventListener('paste', onPaste);
  });

  const dragProps = {
    onDragEnter: (e: React.DragEvent) => {
      e.preventDefault();
      depth.current++;
      setOver(true);
    },
    onDragOver: (e: React.DragEvent) => e.preventDefault(),
    onDragLeave: () => {
      depth.current = Math.max(0, depth.current - 1);
      if (depth.current === 0) setOver(false);
    },
    onDrop: (e: React.DragEvent) => {
      e.preventDefault();
      depth.current = 0;
      setOver(false);
      accept(e.dataTransfer.files);
    },
  };

  const input = (
    <input
      ref={inputRef}
      id={id}
      type="file"
      className="sr-only"
      accept={ACCEPT_ATTR[kind]}
      multiple={multiple}
      onChange={(e) => {
        accept(e.target.files);
        e.target.value = '';
      }}
    />
  );

  if (compact) {
    return (
      <div {...dragProps} data-dropzone>
        {input}
        <label
          htmlFor={id}
          className={cx(
            'press flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-dashed px-4 text-[13px] font-semibold',
            over ? 'border-ink bg-mark/40 text-ink' : 'border-rule-strong text-ink-2 hover:border-ink hover:text-ink',
          )}
        >
          <Plus className="size-4" aria-hidden />
          {title ?? `Add more ${many}`}
        </label>
      </div>
    );
  }

  return (
    <div {...dragProps} data-dropzone className="relative">
      {input}
      <label
        htmlFor={id}
        className={cx(
          'press press-soft group relative flex min-h-[15rem] flex-col items-center justify-center gap-4 overflow-hidden rounded-[28px] px-6 py-10 text-center sm:min-h-[17rem]',
          over ? 'jelly glass outline-2 outline-dashed outline-ink' : 'glass',
        )}
      >
        <span
          className={cx(
            'flex size-14 items-center justify-center rounded-2xl bg-ink text-paper shadow-sheet transition-transform duration-500 ease-spring',
            over ? '-translate-y-2 rotate-[-8deg] scale-110' : 'group-active:scale-90',
          )}
        >
          <Upload className="size-6" strokeWidth={1.75} aria-hidden />
        </span>
        <span className="space-y-1.5">
          <span className="block text-lg font-semibold tracking-tight text-ink sm:text-xl">
            {over ? 'Drop to open' : title ?? `Choose ${multiple ? many : `a ${one}`}`}
          </span>
          <span className="block text-sm text-ink-2">
            {hint ?? (
              <>
                <span className="hidden sm:inline">or drop {multiple ? 'them' : 'it'} here · </span>
                stays on this device
              </>
            )}
          </span>
        </span>
      </label>
      {camera && (
        <CameraButton
          onFiles={accept}
          className="absolute right-3 bottom-3 sm:hidden"
        />
      )}
    </div>
  );
}

function CameraButton({ onFiles, className }: { onFiles: (f: FileList | null) => void; className?: string }) {
  const id = useId();
  return (
    <div className={className}>
      <input id={id} type="file" accept="image/*" capture="environment" className="sr-only" onChange={(e) => {
        onFiles(e.target.files);
        e.target.value = '';
      }} />
      <label htmlFor={id} className="inline-flex h-10 items-center gap-2 rounded-full bg-ink px-4 text-[13px] font-semibold text-paper">
        <Camera className="size-4" aria-hidden /> Camera
      </label>
    </div>
  );
}
