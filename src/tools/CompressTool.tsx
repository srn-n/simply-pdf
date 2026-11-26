import { useState } from 'react';
import { baseName, optimizeLossless, type CompressResult } from '../lib/pdf/engine';
import { compressAsImages, type RasterPreset } from '../lib/pdf/render';
import { toBlob } from '../lib/platform';
import { formatBytes, percentSaved } from '../lib/format';
import { PdfGate } from '../components/PdfGate';
import { ResultView } from '../components/ResultView';
import { FileHeader, Workspace } from '../components/Workspace';
import { PageThumb } from '../components/PageThumb';
import { useJob, type LoadedPdf } from '../components/hooks';
import { Button, Notice, Segmented, Sheet, Switch, cx } from '../components/ui';

export default function CompressTool() {
  const [file, setFile] = useState<File | null>(null);
  return (
    <PdfGate file={file} setFile={setFile} title="Choose a PDF to compress">
      {(doc) => <CompressWorkspace key={doc.file.name + doc.file.size} doc={doc} onClear={() => setFile(null)} />}
    </PdfGate>
  );
}

type Mode = 'lossless' | 'images';

function CompressWorkspace({ doc, onClear }: { doc: LoadedPdf; onClear: () => void }) {
  const [mode, setMode] = useState<Mode>('lossless');
  const [preset, setPreset] = useState<RasterPreset>('balanced');
  const [gray, setGray] = useState(false);
  const job = useJob<CompressResult & { mode: Mode }>();

  if (job.state.status === 'done') {
    const r = job.state.result;
    const pct = percentSaved(r.originalSize, r.newSize);
    return (
      <ResultView
        tool="compress"
        outputs={[{ name: r.changed ? `${baseName(doc.file.name)} (compressed).pdf` : doc.file.name, blob: toBlob(r.bytes) }]}
        record={r.changed}
        headline={r.changed ? `${pct}% smaller` : 'This PDF is already as small as it gets'}
        summary={
          r.changed ? undefined : (
            <>
              No smaller version could be made{r.mode === 'lossless' ? ' without losing quality' : ''}, so you get your original back,
              unchanged.{r.mode === 'lossless' && ' Try "Smallest file" if it is a scan or full of photos.'}
            </>
          )
        }
        onReset={job.reset}
        resetLabel="Try other settings"
      >
        <SizeCompare before={r.originalSize} after={r.newSize} />
      </ResultView>
    );
  }

  const run = () =>
    job.run(async (progress) => {
      const r =
        mode === 'lossless'
          ? (progress(0, 0, 'Rewriting the file structure'), await optimizeLossless(doc.bytes))
          : await compressAsImages(doc.bytes, preset, gray, progress);
      return { ...r, mode };
    });

  return (
    <Workspace
      job={job.state}
      main={
        <>
          <FileHeader file={doc.file} pages={doc.pages} onClear={onClear} />
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
            {Array.from({ length: Math.min(doc.pages, 8) }, (_, i) => (
              <PageThumb key={i} pdf={doc.pdf} page={i + 1} width={160} />
            ))}
          </div>
          {doc.pages > 8 && <p className="num px-1 text-xs text-ink-3">+ {doc.pages - 8} more pages</p>}
        </>
      }
      side={
        <>
          <div className="space-y-3">
            <p className="eyebrow">Method</p>
            <ModeCard
              active={mode === 'lossless'}
              onClick={() => setMode('lossless')}
              title="Keep text"
              body="Rewrites the file without touching quality. Text stays selectable. Best for documents made on a computer."
            />
            <ModeCard
              active={mode === 'images'}
              onClick={() => setMode('images')}
              title="Smallest file"
              body="Redraws each page as a compressed image. Shrinks scans and photos a lot, but text can't be selected afterwards."
            />
          </div>
          {mode === 'images' && (
            <div className="space-y-5">
              <Segmented
                label="Strength"
                value={preset}
                onChange={setPreset}
                options={[
                  { value: 'light', label: 'Light', hint: '150 dpi' },
                  { value: 'balanced', label: 'Balanced', hint: '120 dpi' },
                  { value: 'strong', label: 'Strong', hint: '90 dpi' },
                ]}
              />
              <Switch checked={gray} onChange={setGray} label="Black and white" hint="Smaller still. Good for text scans." />
            </div>
          )}
          <Notice tone="info">You'll see the exact size before you save. If it can't get smaller, you keep the original.</Notice>
        </>
      }
      action={
        <Button variant="primary" size="lg" className="w-full" busy={job.busy} onClick={run}>
          Compress
        </Button>
      }
    />
  );
}

function ModeCard({ active, onClick, title, body }: { active: boolean; onClick: () => void; title: string; body: string }) {
  return (
    <button
      role="radio"
      aria-checked={active}
      onClick={onClick}
      className={cx(
        'block w-full rounded-2xl border p-4 text-left transition-colors',
        active ? 'border-ink bg-paper' : 'border-rule hover:border-rule-strong',
      )}
    >
      <span className="flex items-center gap-2.5">
        <span className={cx('flex size-4 items-center justify-center rounded-full border-2', active ? 'border-ink' : 'border-rule-strong')}>
          {active && <span className="size-1.5 rounded-full bg-ink" />}
        </span>
        <span className="text-sm font-semibold">{title}</span>
      </span>
      <span className="mt-1.5 block pl-6.5 text-xs leading-relaxed text-ink-2">{body}</span>
    </button>
  );
}

function SizeCompare({ before, after }: { before: number; after: number }) {
  const ratio = before > 0 ? Math.max(0.02, after / before) : 1;
  return (
    <Sheet className="space-y-4 p-5 sm:p-6">
      <Bar label="Before" value={formatBytes(before)} width={1} muted />
      <Bar label="After" value={formatBytes(after)} width={ratio} />
      <p className="num text-[11px] text-ink-3">
        {before.toLocaleString()} → {after.toLocaleString()} bytes
      </p>
    </Sheet>
  );
}

function Bar({ label, value, width, muted }: { label: string; value: string; width: number; muted?: boolean }) {
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-xs">
        <span className="text-ink-2">{label}</span>
        <span className="num text-ink">{value}</span>
      </div>
      <div className="h-3 rounded-full bg-sunk">
        <div
          className={cx('h-full rounded-full transition-[width] duration-700 ease-out-soft', muted ? 'bg-rule-strong' : 'bg-accent')}
          style={{ width: `${width * 100}%` }}
        />
      </div>
    </div>
  );
}
