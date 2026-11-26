import { useMemo, useState } from 'react';
import { Download, Share2 } from 'lucide-react';
import { baseName } from '../lib/pdf/engine';
import { pdfToImages } from '../lib/pdf/render';
import { parsePageRanges, rangesToIndices } from '../lib/pdf/ranges';
import { canShare, saveFile, shareFile, type Saveable } from '../lib/platform';
import { formatBytes, plural } from '../lib/format';
import { toast } from '../lib/store';
import { PdfGate } from '../components/PdfGate';
import { PageThumb } from '../components/PageThumb';
import { ResultView } from '../components/ResultView';
import { FileHeader, Workspace } from '../components/Workspace';
import { useJob, useObjectUrl, type LoadedPdf } from '../components/hooks';
import { Button, Field, IconButton, Notice, Segmented, Slider, cx, inputClass } from '../components/ui';

export default function PdfToImagesTool() {
  const [file, setFile] = useState<File | null>(null);
  return (
    <PdfGate file={file} setFile={setFile} title="Choose a PDF to turn into images">
      {(doc) => <Converter key={doc.file.name + doc.file.size} doc={doc} onClear={() => setFile(null)} />}
    </PdfGate>
  );
}

const DPI = { screen: 96, print: 150, sharp: 300 } as const;

function Converter({ doc, onClear }: { doc: LoadedPdf; onClear: () => void }) {
  const [format, setFormat] = useState<'jpg' | 'png'>('jpg');
  const [res, setRes] = useState<keyof typeof DPI>('print');
  const [quality, setQuality] = useState(85);
  const [which, setWhich] = useState<'all' | 'some'>('all');
  const [range, setRange] = useState('1');
  const job = useJob<Saveable[]>();

  const parsed = useMemo(() => parsePageRanges(range, doc.pages), [range, doc.pages]);
  const pages = which === 'all' ? Array.from({ length: doc.pages }, (_, i) => i) : rangesToIndices(parsed.ranges);
  const valid = which === 'all' || (parsed.errors.length === 0 && pages.length > 0);

  if (job.state.status === 'done') {
    const outputs = job.state.result;
    return (
      <ResultView
        tool="pdf-to-jpg"
        outputs={outputs}
        headline={`${plural(outputs.length, 'image')} ready`}
        zipName={`${baseName(doc.file.name)} (images).zip`}
        onReset={job.reset}
        resetLabel="Convert again"
        // The cards below already name and save every image; the list is only
        // needed for images beyond the 24 that get a preview.
        listFiles={outputs.length > PREVIEW_LIMIT}
      >
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {outputs.slice(0, PREVIEW_LIMIT).map((o) => (
            <ImageCard key={o.name} item={o} />
          ))}
        </div>
      </ResultView>
    );
  }

  const run = () =>
    job.run(async (progress) => {
      const images = await pdfToImages(doc.bytes, baseName(doc.file.name), { format, dpi: DPI[res], quality: quality / 100, pages }, progress);
      return images.map((i) => ({ name: i.name, blob: i.blob }));
    });

  return (
    <Workspace
      job={job.state}
      main={
        <>
          <FileHeader file={doc.file} pages={doc.pages} onClear={onClear} />
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
            {Array.from({ length: Math.min(doc.pages, 12) }, (_, i) => (
              <PageThumb key={i} pdf={doc.pdf} page={i + 1} width={160} dim={!pages.includes(i)} />
            ))}
          </div>
        </>
      }
      side={
        <>
          <div className="space-y-2">
            <p className="text-[13px] font-semibold">Format</p>
            <Segmented
              label="Format"
              value={format}
              onChange={setFormat}
              options={[
                { value: 'jpg', label: 'JPG' },
                { value: 'png', label: 'PNG' },
              ]}
            />
          </div>
          <div className="space-y-2">
            <p className="text-[13px] font-semibold">Resolution</p>
            <Segmented
              label="Resolution"
              value={res}
              onChange={setRes}
              options={[
                { value: 'screen', label: 'Screen', hint: '96 dpi' },
                { value: 'print', label: 'Print', hint: '150 dpi' },
                { value: 'sharp', label: 'Sharp', hint: '300 dpi' },
              ]}
            />
            <p className="num text-[11px] text-ink-3">{DPI[res]} dpi</p>
          </div>
          {format === 'jpg' && <Slider label="Quality" value={quality} min={40} max={100} step={5} onChange={setQuality} format={(v) => `${v}%`} />}
          <div className="space-y-3">
            <Segmented
              label="Pages"
              value={which}
              onChange={setWhich}
              options={[
                { value: 'all', label: `All ${doc.pages}` },
                { value: 'some', label: 'Choose' },
              ]}
            />
            {which === 'some' && (
              <Field label="Pages" htmlFor="img-range">
                <input id="img-range" value={range} onChange={(e) => setRange(e.target.value)} className={cx(inputClass, 'num text-sm')} />
              </Field>
            )}
            {which === 'some' && parsed.errors[0] && <Notice tone="error">{parsed.errors[0]}</Notice>}
          </div>
        </>
      }
      action={
        <Button variant="primary" size="lg" className="w-full" busy={job.busy} disabled={!valid} onClick={run}>
          Convert {plural(pages.length, 'page')}
        </Button>
      }
    />
  );
}

/** Images that get a preview card; any beyond this are listed by name instead. */
const PREVIEW_LIMIT = 24;

function ImageCard({ item }: { item: Saveable }) {
  const url = useObjectUrl(item.blob);
  const share = canShare();
  return (
    <figure className="overflow-hidden rounded-2xl border border-rule bg-sheet">
      <img src={url} alt={item.name} className="aspect-[3/4] w-full bg-white object-contain" loading="lazy" />
      <figcaption className="flex items-center gap-1 py-1.5 pr-1 pl-3">
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[12px] font-medium">{item.name}</span>
          <span className="num block text-[11px] text-ink-3">{formatBytes(item.blob.size)}</span>
        </span>
        {share && (
          <IconButton
            label={`Share ${item.name}`}
            className="size-8"
            onClick={async () => {
              const r = await shareFile(item);
              if (!r.ok) toast(r.message, 'error');
            }}
          >
            <Share2 className="size-3.5" />
          </IconButton>
        )}
        <IconButton
          label={`Save ${item.name}`}
          className="size-8"
          onClick={async () => {
            const r = await saveFile(item);
            toast(r.message, r.ok ? 'ok' : 'error');
          }}
        >
          <Download className="size-3.5" />
        </IconButton>
      </figcaption>
    </figure>
  );
}
