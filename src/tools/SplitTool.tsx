import { useMemo, useState } from 'react';
import { Check } from 'lucide-react';
import { splitPdf, type SplitPlan } from '../lib/pdf/engine';
import { chunkRanges, describeRange, parsePageRanges } from '../lib/pdf/ranges';
import { toBlob, type Saveable } from '../lib/platform';
import { indicesToRanges, plural } from '../lib/format';
import { PdfGate } from '../components/PdfGate';
import { PageThumb } from '../components/PageThumb';
import { ResultView } from '../components/ResultView';
import { FileHeader, Workspace } from '../components/Workspace';
import { useJob, type LoadedPdf } from '../components/hooks';
import { Button, Field, Notice, Segmented, Switch, cx, inputClass } from '../components/ui';
import { baseName } from '../lib/pdf/engine';

export default function SplitTool() {
  const [file, setFile] = useState<File | null>(null);
  return (
    <PdfGate file={file} setFile={setFile} title="Choose a PDF to split">
      {(doc) => <SplitWorkspace key={doc.file.name + doc.file.size} doc={doc} onClear={() => setFile(null)} />}
    </PdfGate>
  );
}

function SplitWorkspace({ doc, onClear }: { doc: LoadedPdf; onClear: () => void }) {
  const [mode, setMode] = useState<'ranges' | 'every'>('ranges');
  const [text, setText] = useState(doc.pages > 1 ? `1-${Math.ceil(doc.pages / 2)}, ${Math.ceil(doc.pages / 2) + 1}-${doc.pages}` : '1');
  const [combine, setCombine] = useState(false);
  const [every, setEvery] = useState(1);
  const job = useJob<Saveable[]>();

  const parsed = useMemo(() => parsePageRanges(text, doc.pages), [text, doc.pages]);
  const selected = useMemo(() => {
    const s = new Set<number>();
    if (mode === 'ranges') for (const r of parsed.ranges) for (let p = r.start; p <= r.end; p++) s.add(p - 1);
    return s;
  }, [parsed, mode]);

  const parts = mode === 'every' ? chunkRanges(doc.pages, every) : combine ? (parsed.ranges.length ? [parsed.ranges[0]] : []) : parsed.ranges;
  const outputCount = mode === 'ranges' && combine ? (parsed.ranges.length ? 1 : 0) : parts.length;
  const canRun = mode === 'every' ? every >= 1 : parsed.ranges.length > 0 && parsed.errors.length === 0;

  const togglePage = (i: number) => {
    if (mode !== 'ranges') setMode('ranges');
    const next = new Set(selected);
    if (next.has(i)) next.delete(i);
    else next.add(i);
    setText(indicesToRanges([...next]));
  };

  if (job.state.status === 'done') {
    const outputs = job.state.result;
    return (
      <ResultView
        tool="split"
        outputs={outputs}
        headline={outputs.length === 1 ? 'Your pages are in a new PDF' : `Split into ${outputs.length} PDFs`}
        zipName={`${baseName(doc.file.name)} (split).zip`}
        onReset={job.reset}
        resetLabel="Split differently"
      />
    );
  }

  const run = () =>
    job.run(async (progress) => {
      const plan: SplitPlan = mode === 'every' ? { mode: 'every', size: every } : { mode: 'ranges', ranges: parsed.ranges, combine };
      const files = await splitPdf(doc.bytes, doc.file.name, plan, (d, t, l) => progress(d, t, l));
      return files.map((f) => ({ name: f.name, blob: toBlob(f.bytes) }));
    });

  return (
    <Workspace
      job={job.state}
      main={
        <>
          <FileHeader file={doc.file} pages={doc.pages} onClear={onClear} />
          <p className="px-1 text-xs text-ink-3">Tap pages to choose them.</p>
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 xl:grid-cols-5">
            {Array.from({ length: doc.pages }, (_, i) => {
              const on = mode === 'ranges' ? selected.has(i) : true;
              const chunk = mode === 'every' ? Math.floor(i / every) : -1;
              return (
                <button
                  key={i}
                  onClick={() => togglePage(i)}
                  aria-pressed={on}
                  aria-label={`Page ${i + 1}`}
                  className={cx(
                    'group relative rounded-xl p-2 text-left transition-colors',
                    on ? 'bg-mark/45 ring-1 ring-ink/25' : 'hover:bg-sunk',
                  )}
                >
                  <PageThumb pdf={doc.pdf} page={i + 1} width={160} dim={!on} />
                  <span className="mt-1.5 flex items-center justify-between">
                    <span className="num text-[11px] text-ink-2">{i + 1}</span>
                    {mode === 'every' ? (
                      <span className="num text-[10px] text-ink-3">#{chunk + 1}</span>
                    ) : (
                      <span
                        className={cx(
                          'flex size-4 items-center justify-center rounded-full border transition-colors',
                          on ? 'border-ink bg-ink text-paper' : 'border-rule-strong',
                        )}
                      >
                        {on && <Check className="size-3" strokeWidth={3} />}
                      </span>
                    )}
                  </span>
                </button>
              );
            })}
          </div>
        </>
      }
      side={
        <>
          <Segmented
            label="How to split"
            value={mode}
            onChange={setMode}
            options={[
              { value: 'ranges', label: 'Pick pages' },
              { value: 'every', label: 'Every N pages' },
            ]}
          />
          {mode === 'ranges' ? (
            <div className="space-y-5">
              <Field
                label="Pages"
                htmlFor="ranges"
                hint={
                  <>
                    Commas between parts, e.g. <span className="num">1-3, 5, 8-</span>. Each part becomes its own PDF.
                  </>
                }
              >
                <input
                  id="ranges"
                  className={cx(inputClass, 'num text-sm')}
                  value={text}
                  inputMode="numeric"
                  autoComplete="off"
                  spellCheck={false}
                  onChange={(e) => setText(e.target.value)}
                  aria-invalid={parsed.errors.length > 0}
                />
              </Field>
              {parsed.errors.length > 0 && <Notice tone="error">{parsed.errors[0]}</Notice>}
              <Switch checked={combine} onChange={setCombine} label="One file" hint="Put every chosen page into a single PDF." />
            </div>
          ) : (
            <Field label="Pages per file" htmlFor="every" hint={`Makes ${plural(chunkRanges(doc.pages, every).length, 'file')}.`}>
              <input
                id="every"
                type="number"
                min={1}
                max={doc.pages}
                value={every}
                onChange={(e) => setEvery(Math.max(1, Math.min(doc.pages, Number(e.target.value) || 1)))}
                className={cx(inputClass, 'num text-sm')}
              />
            </Field>
          )}
          {canRun && (
            <div className="space-y-1.5">
              <p className="eyebrow">You'll get</p>
              <ul className="num space-y-1 text-xs text-ink-2">
                {(mode === 'ranges' && combine
                  ? [`1 file · ${plural(selected.size, 'page')}`]
                  : parts.slice(0, 6).map((r) => `Pages ${describeRange(r)}`)
                ).map((l) => (
                  <li key={l}>{l}</li>
                ))}
                {!(mode === 'ranges' && combine) && parts.length > 6 && <li>…and {parts.length - 6} more</li>}
              </ul>
            </div>
          )}
        </>
      }
      action={
        <Button variant="primary" size="lg" className="w-full" busy={job.busy} disabled={!canRun} onClick={run}>
          {outputCount === 1 ? 'Make 1 PDF' : `Make ${outputCount} PDFs`}
        </Button>
      }
    />
  );
}
