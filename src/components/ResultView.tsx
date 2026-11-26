import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ArrowRight, Download, Eye, FileArchive, FileText, Image as ImageIcon, RotateCcw, Share2 } from 'lucide-react';
import { canShare, saveFile, shareFile, zipFiles, type Saveable } from '../lib/platform';
import { addRecent, handOff, toast } from '../lib/store';
import { navigate } from '../lib/router';
import { formatBytes } from '../lib/format';
import { NEXT_STEPS, TOOL_BY_ID, type ToolId } from '../tools/registry';
import { ToolIcon } from './icons';
import { PreviewModal } from './PreviewModal';
import { Button, IconButton, Sheet, cx } from './ui';

export function ResultView({
  tool,
  outputs,
  headline,
  summary,
  zipName,
  onReset,
  resetLabel = 'Start again',
  listFiles = true,
  children,
  record = true,
}: {
  tool: ToolId;
  outputs: Saveable[];
  headline: string;
  summary?: ReactNode;
  zipName?: string;
  onReset: () => void;
  resetLabel?: string;
  /** Show the one-row-per-file list when there are several outputs. Off when
   *  the tool's own content already shows every file (e.g. image previews). */
  listFiles?: boolean;
  children?: ReactNode;
  record?: boolean;
}) {
  const [preview, setPreview] = useState<Saveable | null>(null);
  const [zipping, setZipping] = useState(false);
  // The name of the file being saved or shared, so a second tap can't start a duplicate.
  const [pending, setPending] = useState<string | null>(null);
  const share = canShare();
  const recorded = useRef(false);
  const topRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    topRef.current?.scrollIntoView({ block: 'start', behavior: 'smooth' });
    if (!record || recorded.current || outputs.length === 0) return;
    recorded.current = true;
    const size = outputs.reduce((n, o) => n + o.blob.size, 0);
    addRecent({
      tool,
      name: outputs.length === 1 ? outputs[0].name : `${outputs.length} files`,
      size,
      detail: outputs.length > 1 ? outputs.map((o) => o.name).slice(0, 3).join(', ') : undefined,
    });
  }, [tool, outputs, record]);

  const save = async (f: Saveable) => {
    if (pending) return;
    setPending(f.name);
    try {
      const r = await saveFile(f);
      toast(r.message, r.ok ? 'ok' : 'error');
    } finally {
      setPending(null);
    }
  };
  const doShare = async (f: Saveable) => {
    if (pending) return;
    setPending(f.name);
    try {
      const r = await shareFile(f);
      if (!r.ok) toast(r.message, 'error');
    } finally {
      setPending(null);
    }
  };
  const saveAll = async () => {
    if (zipping || pending) return;
    setZipping(true);
    try {
      const zip = await zipFiles(outputs, zipName ?? 'Simply PDF files.zip');
      setZipping(false);
      await save(zip);
    } catch {
      toast('The ZIP could not be made. Try saving the files one by one.', 'error');
    } finally {
      setZipping(false);
    }
  };

  const single = outputs.length === 1 ? outputs[0] : null;
  const singlePdf = single && single.blob.type === 'application/pdf' ? single : null;
  const next = NEXT_STEPS.filter((id) => id !== tool && !(id === 'merge')).slice(0, 4);

  return (
    <div ref={topRef} className="scroll-mt-24 space-y-5">
      <Sheet className="thump relative overflow-hidden p-5 sm:p-7">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 space-y-2">
            <p className="eyebrow">Finished on this device</p>
            <h2 className="text-2xl leading-tight font-semibold tracking-tight text-balance sm:text-[28px]">{headline}</h2>
            {summary && <div className="text-sm leading-relaxed text-ink-2">{summary}</div>}
          </div>
          <span
            aria-hidden
            className="stamp num shrink-0 rounded-md border-2 border-accent px-2.5 py-1 text-[13px] font-medium tracking-[0.12em] text-accent uppercase"
          >
            Done
          </span>
        </div>

        {outputs.length === 0 ? null : single ? (
          <div className="mt-6 flex flex-col gap-2.5 sm:flex-row">
            <Button variant="primary" size="lg" className="sm:flex-1" busy={pending === single.name} disabled={!!pending} onClick={() => save(single)} icon={<Download className="size-4" aria-hidden />}>
              Save {single.blob.type === 'application/pdf' ? 'PDF' : 'file'}
            </Button>
            {share && (
              <Button size="lg" disabled={!!pending} onClick={() => doShare(single)} icon={<Share2 className="size-4" aria-hidden />}>
                Share
              </Button>
            )}
            {singlePdf && (
              <Button size="lg" onClick={() => setPreview(singlePdf)} icon={<Eye className="size-4" aria-hidden />}>
                Preview
              </Button>
            )}
          </div>
        ) : (
          <div className="mt-6">
            <Button
              variant="primary"
              size="lg"
              className="w-full sm:w-auto"
              busy={zipping || (!!pending && pending.endsWith('.zip'))}
              disabled={!!pending}
              onClick={saveAll}
              icon={<FileArchive className="size-4" aria-hidden />}
            >
              Save all {outputs.length} as ZIP
            </Button>
          </div>
        )}
      </Sheet>

      {children}

      {listFiles && outputs.length > 1 && (
        <Sheet className="divide-y divide-rule">
          {outputs.map((o, i) => (
            <div key={`${o.name}-${i}`} className="flex items-center gap-3 px-4 py-2.5">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-sunk text-ink-3">
                {o.blob.type.startsWith('image/') ? <ImageIcon className="size-4" aria-hidden /> : <FileText className="size-4" aria-hidden />}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-medium">{o.name}</p>
                <p className="num text-[11px] text-ink-3">{formatBytes(o.blob.size)}</p>
              </div>
              {o.blob.type === 'application/pdf' && (
                <IconButton label={`Preview ${o.name}`} onClick={() => setPreview(o)}>
                  <Eye className="size-4" />
                </IconButton>
              )}
              {share && (
                <IconButton label={`Share ${o.name}`} disabled={!!pending} onClick={() => doShare(o)}>
                  <Share2 className="size-4" />
                </IconButton>
              )}
              <IconButton label={`Save ${o.name}`} disabled={!!pending} onClick={() => save(o)}>
                <Download className="size-4" />
              </IconButton>
            </div>
          ))}
        </Sheet>
      )}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        {singlePdf ? (
          <div className="min-w-0 space-y-2">
            <p className="eyebrow">Keep going with this file</p>
            <div className="flex flex-wrap gap-2">
              {next.map((id) => (
                <button
                  key={id}
                  onClick={() => {
                    handOff([new File([singlePdf.blob], singlePdf.name, { type: 'application/pdf' })]);
                    navigate(`/${TOOL_BY_ID[id].slug}`);
                  }}
                  className="group inline-flex h-9 items-center gap-2 rounded-full border border-rule bg-sheet pr-3 pl-2.5 text-[13px] font-semibold transition-colors hover:border-ink"
                >
                  <ToolIcon name={TOOL_BY_ID[id].icon} className="size-4 text-ink-2" />
                  {TOOL_BY_ID[id].name}
                  <ArrowRight className="size-3.5 text-ink-3 transition-transform group-hover:translate-x-0.5" aria-hidden />
                </button>
              ))}
            </div>
          </div>
        ) : (
          <span />
        )}
        <Button variant="ghost" onClick={onReset} icon={<RotateCcw className="size-4" aria-hidden />} className={cx('self-start sm:self-auto')}>
          {resetLabel}
        </Button>
      </div>

      {preview && <PreviewModal file={preview} onClose={() => setPreview(null)} />}
    </div>
  );
}
