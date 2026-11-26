import { useState } from 'react';
import { addPageNumbers, baseName, formatPageLabel, type NumberPosition, type PageNumberOptions } from '../lib/pdf/engine';
import { toBlob, type Saveable } from '../lib/platform';
import { plural } from '../lib/format';
import { PdfGate } from '../components/PdfGate';
import { PagePreview } from '../components/PagePreview';
import { ResultView } from '../components/ResultView';
import { FileHeader, Workspace } from '../components/Workspace';
import { useJob, type LoadedPdf } from '../components/hooks';
import { Button, Field, Segmented, Switch, cx, inputClass } from '../components/ui';

const FORMATS = [
  { value: '{n}', label: '1' },
  { value: '{n} / {total}', label: '1 / 12' },
  { value: 'Page {n} of {total}', label: 'Page 1 of 12' },
  { value: '– {n} –', label: '– 1 –' },
];

const POSITIONS: NumberPosition[] = ['top-left', 'top-centre', 'top-right', 'bottom-left', 'bottom-centre', 'bottom-right'];

export default function PageNumbersTool() {
  const [file, setFile] = useState<File | null>(null);
  return (
    <PdfGate file={file} setFile={setFile} title="Choose a PDF to number">
      {(doc) => <NumbersWorkspace key={doc.file.name + doc.file.size} doc={doc} onClear={() => setFile(null)} />}
    </PdfGate>
  );
}

function NumbersWorkspace({ doc, onClear }: { doc: LoadedPdf; onClear: () => void }) {
  const [opts, setOpts] = useState<PageNumberOptions>({
    position: 'bottom-centre',
    format: '{n} / {total}',
    startAt: 1,
    skipFirst: false,
    size: 10,
    margin: 28,
    color: '#4b4d55',
  });
  const [previewPage, setPreviewPage] = useState(1);
  const job = useJob<Saveable>();
  const set = <K extends keyof PageNumberOptions>(k: K, v: PageNumberOptions[K]) => setOpts((o) => ({ ...o, [k]: v }));

  if (job.state.status === 'done') {
    return (
      <ResultView
        tool="page-numbers"
        outputs={[job.state.result]}
        headline={`Numbered ${plural(opts.skipFirst ? doc.pages - 1 : doc.pages, 'page')}`}
        onReset={job.reset}
        resetLabel="Change numbering"
      />
    );
  }

  const numbered = opts.skipFirst ? doc.pages - 1 : doc.pages;
  const last = opts.startAt + numbered - 1;
  const labelFor = (page: number) =>
    opts.skipFirst && page === 1 ? '' : formatPageLabel(opts.format, opts.startAt + page - 1 - (opts.skipFirst ? 1 : 0), last);

  const run = () =>
    job.run(async (progress) => {
      const bytes = await addPageNumbers(doc.bytes, opts, progress);
      return { name: `${baseName(doc.file.name)} (numbered).pdf`, blob: toBlob(bytes) };
    });

  return (
    <Workspace
      job={job.state}
      main={
        <>
          <FileHeader file={doc.file} pages={doc.pages} onClear={onClear} />
          <PagePreview
            pdf={doc.pdf}
            page={previewPage}
            overlay={(pt) => (
              <>
                {POSITIONS.map((pos) => {
                  const [v, h] = pos.split('-');
                  const active = pos === opts.position;
                  return (
                    <button
                      key={pos}
                      aria-label={`Put numbers ${v} ${h === 'centre' ? 'centre' : h}`}
                      aria-pressed={active}
                      onClick={() => set('position', pos)}
                      className={cx(
                        'absolute flex items-center rounded transition-colors',
                        h === 'left' && 'justify-start',
                        h === 'centre' && 'justify-center',
                        h === 'right' && 'justify-end',
                        active ? '' : 'hover:bg-[#e4f066]/50',
                      )}
                      style={{
                        [v]: pt(opts.margin) - pt(opts.size) * 0.5,
                        left: h === 'left' ? pt(opts.margin) - 6 : h === 'centre' ? '33%' : undefined,
                        right: h === 'right' ? pt(opts.margin) - 6 : h === 'centre' ? '33%' : undefined,
                        width: h === 'centre' ? undefined : '30%',
                        height: Math.max(28, pt(opts.size) * 2),
                        padding: '0 6px',
                      }}
                    >
                      {active ? (
                        <span style={{ fontSize: Math.max(7, pt(opts.size)), color: opts.color, fontFamily: 'Helvetica, Arial, sans-serif' }} className="rounded bg-[#e4f066]/70 px-1 whitespace-nowrap">
                          {labelFor(previewPage) || '—'}
                        </span>
                      ) : (
                        <span className="size-2 rounded-full bg-black/20" />
                      )}
                    </button>
                  );
                })}
              </>
            )}
          />
          <div className="flex items-center justify-center gap-2 text-xs text-ink-3">
            <span>Tap a dot to move the numbers.</span>
            {doc.pages > 1 && (
              <button className="font-semibold text-ink underline underline-offset-2" onClick={() => setPreviewPage((p) => (p % Math.min(doc.pages, 3)) + 1)}>
                Preview page {(previewPage % Math.min(doc.pages, 3)) + 1}
              </button>
            )}
          </div>
        </>
      }
      side={
        <>
          <div className="space-y-2">
            <p className="text-[13px] font-semibold">Style</p>
            <div className="grid grid-cols-2 gap-2">
              {FORMATS.map((f) => (
                <button
                  key={f.value}
                  onClick={() => set('format', f.value)}
                  aria-pressed={opts.format === f.value}
                  className={cx(
                    'num h-10 rounded-xl border text-xs transition-colors',
                    opts.format === f.value ? 'border-ink bg-ink text-paper' : 'border-rule text-ink-2 hover:border-ink',
                  )}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>
          <Segmented
            label="Size"
            value={String(opts.size) as '8' | '10' | '13'}
            onChange={(v) => set('size', Number(v))}
            options={[
              { value: '8', label: 'Small' },
              { value: '10', label: 'Medium' },
              { value: '13', label: 'Large' },
            ]}
          />
          <Field label="First number" htmlFor="start-at">
            <input
              id="start-at"
              type="number"
              min={0}
              value={opts.startAt}
              onChange={(e) => set('startAt', Math.max(0, Math.floor(Number(e.target.value) || 0)))}
              className={cx(inputClass, 'num text-sm')}
            />
          </Field>
          {doc.pages > 1 && <Switch checked={opts.skipFirst} onChange={(v) => set('skipFirst', v)} label="Skip first page" hint="Leave the cover page without a number." />}
        </>
      }
      action={
        <Button variant="primary" size="lg" className="w-full" busy={job.busy} onClick={run}>
          Add page numbers
        </Button>
      }
    />
  );
}
