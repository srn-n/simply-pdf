import { useId, useRef, useState } from 'react';
import { ArrowRight, Upload, X } from 'lucide-react';
import { handOff, toast } from '../lib/store';
import { navigate } from '../lib/router';
import { formatBytes, plural } from '../lib/format';
import { TOOLS, TOOL_BY_ID, type ToolId } from '../tools/registry';
import { isImage, isPdf } from './files';
import { ToolIcon } from './icons';
import { cx } from './ui';

/**
 * "Drop anything, then pick what to do." The product is the demo: the home
 * page opens real files straight away.
 */
export function QuickStart({ compact }: { compact?: boolean }) {
  const id = useId();
  const [files, setFiles] = useState<File[]>([]);
  const [over, setOver] = useState(false);
  const depth = useRef(0);

  const take = (list: FileList | null) => {
    const all = Array.from(list ?? []);
    const usable = all.filter((f) => isPdf(f) || isImage(f));
    if (usable.length < all.length) toast(`${plural(all.length - usable.length, 'file')} skipped: only PDFs and images work here.`, 'error');
    if (!usable.length) return;
    const pdfs = usable.filter(isPdf);
    if (pdfs.length === 0) {
      handOff(usable);
      navigate(`/${TOOL_BY_ID['jpg-to-pdf'].slug}`);
      return;
    }
    setFiles(pdfs);
  };

  const go = (tool: ToolId) => {
    handOff(files);
    navigate(`/${TOOL_BY_ID[tool].slug}`);
  };

  if (files.length) {
    const many = files.length > 1;
    const choices = many
      ? (['merge'] as ToolId[])
      : TOOLS.filter((t) => t.accepts === 'pdf' || t.accepts === 'pdfs').map((t) => t.id);
    return (
      <div className="rise rounded-[24px] border border-rule bg-sheet p-4 shadow-sheet sm:p-5">
        <div className="flex items-center gap-3 border-b border-rule pb-4">
          <div className="min-w-0 flex-1">
            <p className="eyebrow">Opened on this device</p>
            <p className="mt-1 truncate text-[15px] font-semibold">{many ? `${files.length} PDFs` : files[0].name}</p>
            <p className="num text-[11px] text-ink-3">{formatBytes(files.reduce((n, f) => n + f.size, 0))}</p>
          </div>
          <button aria-label="Clear" onClick={() => setFiles([])} className="flex size-9 items-center justify-center rounded-full text-ink-3 hover:bg-sunk hover:text-ink">
            <X className="size-4" />
          </button>
        </div>
        <p className="pt-4 pb-2 text-sm font-semibold">What would you like to do?</p>
        <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
          {choices.map((tid) => (
            <button
              key={tid}
              onClick={() => go(tid)}
              className="group flex min-h-12 items-center gap-2.5 rounded-xl px-3 text-left text-[13px] font-semibold hover:bg-sunk"
            >
              <ToolIcon name={TOOL_BY_ID[tid].icon} className="size-4 shrink-0 text-ink-2 group-hover:text-ink" />
              <span className="min-w-0 truncate">{TOOL_BY_ID[tid].name}</span>
            </button>
          ))}
        </div>
        {many && <p className="px-3 pt-2 text-xs text-ink-3">To use another tool, open one PDF at a time.</p>}
      </div>
    );
  }

  return (
    <div
      data-dropzone
      onDragEnter={(e) => {
        e.preventDefault();
        depth.current++;
        setOver(true);
      }}
      onDragOver={(e) => e.preventDefault()}
      onDragLeave={() => {
        depth.current = Math.max(0, depth.current - 1);
        if (!depth.current) setOver(false);
      }}
      onDrop={(e) => {
        e.preventDefault();
        depth.current = 0;
        setOver(false);
        take(e.dataTransfer.files);
      }}
    >
      <input id={id} type="file" multiple accept="application/pdf,.pdf,image/*" className="sr-only" onChange={(e) => {
        take(e.target.files);
        e.target.value = '';
      }} />
      <label
        htmlFor={id}
        className={cx(
          'press-soft press group relative flex flex-col items-center justify-center overflow-hidden rounded-[28px] text-center',
          compact ? 'min-h-48 gap-4 px-5 py-8' : 'min-h-[19rem] gap-5 px-6 py-12',
          over ? 'jelly glass outline-2 outline-dashed outline-ink' : 'glass',
        )}
      >
        {/* A stack of sheets that fans out on hover: a quiet nod to what this does. */}
        <span className="relative h-16 w-14" aria-hidden>
          <span className="breathe absolute inset-0 rounded-lg border border-rule-strong bg-sheet shadow-sheet" style={{ '--r': '-10deg' } as React.CSSProperties} />
          <span className="breathe absolute inset-0 rounded-lg border border-rule-strong bg-sheet shadow-sheet [animation-delay:-1.2s]" style={{ '--r': '9deg' } as React.CSSProperties} />
          <span
            className={cx(
              'absolute inset-0 flex items-center justify-center rounded-lg bg-ink text-paper shadow-sheet transition-transform duration-500 ease-spring',
              over ? '-translate-y-3 scale-110' : 'group-active:scale-90',
            )}
          >
            <Upload className="size-5" strokeWidth={1.75} />
          </span>
        </span>
        <span className="space-y-1.5">
          <span className="block text-lg font-semibold tracking-tight sm:text-xl">{over ? 'Drop to open' : 'Open a PDF or photos'}</span>
          <span className="block text-sm text-ink-2">
            <span className="hidden sm:inline">Or drop them here. </span>They stay on this device.
          </span>
        </span>
        <span className="inline-flex h-11 items-center gap-2 rounded-full bg-ink px-5 text-sm font-semibold text-paper transition-transform group-active:scale-95">
          Choose files <ArrowRight className="size-4" aria-hidden />
        </span>
      </label>
    </div>
  );
}
