import { useState } from 'react';
import { baseName, watermarkPdf, type WatermarkOptions } from '../lib/pdf/engine';
import { toBlob, type Saveable } from '../lib/platform';
import { plural } from '../lib/format';
import { PdfGate } from '../components/PdfGate';
import { PagePreview } from '../components/PagePreview';
import { ResultView } from '../components/ResultView';
import { FileHeader, Workspace } from '../components/Workspace';
import { useJob, type LoadedPdf } from '../components/hooks';
import { Button, Field, Notice, Segmented, Slider, cx, inputClass } from '../components/ui';

export const SWATCHES = ['#15161a', '#b42318', '#0b4a40', '#1f3a8a', '#8a8d93'];

export default function WatermarkTool() {
  const [file, setFile] = useState<File | null>(null);
  return (
    <PdfGate file={file} setFile={setFile} title="Choose a PDF to watermark">
      {(doc) => <WatermarkWorkspace key={doc.file.name + doc.file.size} doc={doc} onClear={() => setFile(null)} />}
    </PdfGate>
  );
}

function WatermarkWorkspace({ doc, onClear }: { doc: LoadedPdf; onClear: () => void }) {
  const [opts, setOpts] = useState<WatermarkOptions>({ text: 'CONFIDENTIAL', opacity: 0.18, size: 56, angle: 35, color: '#b42318', layout: 'centre' });
  const job = useJob<Saveable & { replaced: number }>();
  const set = <K extends keyof WatermarkOptions>(k: K, v: WatermarkOptions[K]) => setOpts((o) => ({ ...o, [k]: v }));

  if (job.state.status === 'done') {
    const r = job.state.result;
    return (
      <ResultView
        tool="watermark"
        outputs={[r]}
        headline={`Watermarked ${plural(doc.pages, 'page')}`}
        summary={r.replaced > 0 ? `${plural(r.replaced, 'character')} the PDF font can't draw became “?”.` : undefined}
        onReset={job.reset}
        resetLabel="Adjust the watermark"
      />
    );
  }

  const run = () =>
    job.run(async (progress) => {
      const r = await watermarkPdf(doc.bytes, opts, progress);
      return { name: `${baseName(doc.file.name)} (watermarked).pdf`, blob: toBlob(r.bytes), replaced: r.replaced };
    });

  const label = opts.text.trim() || ' ';

  return (
    <Workspace
      job={job.state}
      main={
        <>
          <FileHeader file={doc.file} pages={doc.pages} onClear={onClear} />
          <PagePreview
            pdf={doc.pdf}
            overlay={(pt) => {
              const style = {
                fontSize: pt(opts.size),
                color: opts.color,
                opacity: opts.opacity,
                transform: `rotate(${-opts.angle}deg)`,
                fontFamily: 'Helvetica, Arial, sans-serif',
                fontWeight: 700,
                lineHeight: 1,
              } as const;
              return opts.layout === 'centre' ? (
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center whitespace-nowrap">
                  <span style={style}>{label}</span>
                </div>
              ) : (
                <div className="pointer-events-none absolute -inset-1/2 flex flex-wrap content-center items-center justify-center gap-x-[1.6em] gap-y-[3em] overflow-hidden" style={{ transform: `rotate(${-opts.angle}deg)`, fontSize: pt(opts.size) }}>
                  {Array.from({ length: 60 }, (_, i) => (
                    <span key={i} style={{ ...style, transform: undefined, fontSize: 'inherit' }} className="whitespace-nowrap">
                      {label}
                    </span>
                  ))}
                </div>
              );
            }}
          />
          <p className="px-1 text-center text-xs text-ink-3">Preview of page 1. The same mark goes on every page.</p>
        </>
      }
      side={
        <>
          <Field label="Text" htmlFor="wm-text">
            <input id="wm-text" value={opts.text} maxLength={80} onChange={(e) => set('text', e.target.value)} className={inputClass} />
          </Field>
          <div className="flex flex-wrap gap-2">
            {['CONFIDENTIAL', 'DRAFT', 'COPY', 'SAMPLE', 'DO NOT COPY'].map((t) => (
              <button
                key={t}
                onClick={() => set('text', t)}
                className={cx(
                  'h-8 rounded-full border px-3 text-[12px] font-semibold',
                  opts.text === t ? 'border-ink bg-ink text-paper' : 'border-rule text-ink-2 hover:border-ink',
                )}
              >
                {t}
              </button>
            ))}
          </div>
          <Segmented
            label="Layout"
            value={opts.layout}
            onChange={(v) => set('layout', v)}
            options={[
              { value: 'centre', label: 'Once, centred' },
              { value: 'tile', label: 'Tiled' },
            ]}
          />
          <Slider label="Size" value={opts.size} min={16} max={140} onChange={(v) => set('size', v)} format={(v) => `${v} pt`} />
          <Slider label="Opacity" value={Math.round(opts.opacity * 100)} min={5} max={80} onChange={(v) => set('opacity', v / 100)} format={(v) => `${v}%`} />
          <Slider label="Angle" value={opts.angle} min={0} max={90} step={5} onChange={(v) => set('angle', v)} format={(v) => `${v}°`} />
          <div className="space-y-2">
            <p className="text-[13px] font-semibold">Colour</p>
            <div className="flex gap-2" role="radiogroup" aria-label="Colour">
              {SWATCHES.map((c) => (
                <button
                  key={c}
                  role="radio"
                  aria-checked={opts.color === c}
                  aria-label={c}
                  onClick={() => set('color', c)}
                  className={cx('size-9 rounded-full border-2 p-0.5 transition-transform', opts.color === c ? 'scale-110 border-ink' : 'border-transparent')}
                >
                  <span className="block size-full rounded-full" style={{ background: c }} />
                </button>
              ))}
            </div>
          </div>
          {!opts.text.trim() && <Notice tone="warn">Type the text to stamp.</Notice>}
        </>
      }
      action={
        <Button variant="primary" size="lg" className="w-full" busy={job.busy} disabled={!opts.text.trim()} onClick={run}>
          Add watermark
        </Button>
      }
    />
  );
}
