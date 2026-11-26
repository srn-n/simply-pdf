import { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Copy, X } from 'lucide-react';
import { baseName, stampImage, type Placement } from '../lib/pdf/engine';
import { toBlob, type Saveable } from '../lib/platform';
import { plural } from '../lib/format';
import { PdfGate } from '../components/PdfGate';
import { ResultView } from '../components/ResultView';
import { FileHeader, Workspace } from '../components/Workspace';
import { DrawPad, TypePad, UploadPad, type Signature } from '../components/SignaturePad';
import { getThumb, useElementWidth, useJob, type LoadedPdf } from '../components/hooks';
import { Button, IconButton, Notice, Segmented, Sheet } from '../components/ui';

export default function SignTool() {
  const [file, setFile] = useState<File | null>(null);
  return (
    <PdfGate file={file} setFile={setFile} title="Choose the PDF to sign">
      {(doc) => <SignWorkspace key={doc.file.name + doc.file.size} doc={doc} onClear={() => setFile(null)} />}
    </PdfGate>
  );
}

type Box = Omit<Placement, 'page'>;

function dataUrlToBytes(url: string): Uint8Array {
  const bin = atob(url.slice(url.indexOf(',') + 1));
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

function SignWorkspace({ doc, onClear }: { doc: LoadedPdf; onClear: () => void }) {
  const [mode, setMode] = useState<'draw' | 'type' | 'upload'>('draw');
  const [sig, setSig] = useState<Signature | null>(null);
  const [page, setPage] = useState(0);
  const [boxes, setBoxes] = useState<Record<number, Box>>({});
  const job = useJob<Saveable>();
  const onSig = useCallback((s: Signature | null) => setSig(s), []);

  const placed = Object.keys(boxes).length;

  if (job.state.status === 'done') {
    return (
      <ResultView
        tool="sign"
        outputs={[job.state.result]}
        headline="Signed"
        summary={`Your signature is on ${plural(placed, 'page')}.`}
        onReset={job.reset}
        resetLabel="Back to the document"
      />
    );
  }

  const place = (p: number) =>
    setBoxes((b) => ({ ...b, [p]: b[p] ?? b[page] ?? { x: 0.56, y: 0.78, width: 0.3 } }));

  const run = () =>
    job.run(async () => {
      if (!sig) throw new Error('no signature');
      const placements = Object.entries(boxes).map(([p, b]) => ({ page: Number(p), ...b }));
      const bytes = await stampImage(doc.bytes, dataUrlToBytes(sig.dataUrl), placements);
      return { name: `${baseName(doc.file.name)} (signed).pdf`, blob: toBlob(bytes) };
    });

  return (
    <Workspace
      job={job.state}
      main={
        <>
          <FileHeader file={doc.file} pages={doc.pages} onClear={onClear} />
          <PageStage
            doc={doc}
            page={page}
            sig={sig}
            box={boxes[page]}
            onBox={(b) => setBoxes((all) => ({ ...all, [page]: b }))}
            onRemove={() =>
              setBoxes((all) => {
                const next = { ...all };
                delete next[page];
                return next;
              })
            }
          />
          <div className="flex items-center justify-between gap-2">
            <IconButton label="Previous page" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
              <ChevronLeft className="size-5" />
            </IconButton>
            <span className="num text-xs text-ink-2">
              Page {page + 1} of {doc.pages}
              {boxes[page] && ' · signed'}
            </span>
            <IconButton label="Next page" disabled={page >= doc.pages - 1} onClick={() => setPage((p) => p + 1)}>
              <ChevronRight className="size-5" />
            </IconButton>
          </div>
        </>
      }
      side={
        <>
          <Segmented
            label="Signature"
            value={mode}
            onChange={(m) => {
              setMode(m);
              setSig(null);
            }}
            options={[
              { value: 'draw', label: 'Draw' },
              { value: 'type', label: 'Type' },
              { value: 'upload', label: 'Upload' },
            ]}
          />
          {mode === 'draw' && <DrawPad onChange={onSig} />}
          {mode === 'type' && <TypePad onChange={onSig} />}
          {mode === 'upload' && <UploadPad onChange={onSig} />}
          <div className="space-y-2">
            <Button className="w-full" disabled={!sig} onClick={() => place(page)}>
              {boxes[page] ? 'Placed on this page' : `Place on page ${page + 1}`}
            </Button>
            {doc.pages > 1 && (
              <Button
                variant="ghost"
                size="sm"
                className="w-full"
                disabled={!sig}
                icon={<Copy className="size-3.5" aria-hidden />}
                onClick={() => {
                  const template = boxes[page] ?? { x: 0.56, y: 0.78, width: 0.3 };
                  setBoxes(Object.fromEntries(Array.from({ length: doc.pages }, (_, i) => [i, template])));
                }}
              >
                Same spot on every page
              </Button>
            )}
          </div>
          {sig && placed === 0 && <Notice tone="info">Place it, then drag it into position. Pull the corner to resize.</Notice>}
          <p className="text-xs leading-relaxed text-ink-3">
            This adds a picture of your signature, like signing a printout. It isn't a certificate-based digital signature.
          </p>
        </>
      }
      action={
        <Button variant="primary" size="lg" className="w-full" busy={job.busy} disabled={!sig || placed === 0} onClick={run}>
          {placed > 1 ? `Sign ${placed} pages` : 'Sign and save'}
        </Button>
      }
    />
  );
}

function PageStage({
  doc,
  page,
  sig,
  box,
  onBox,
  onRemove,
}: {
  doc: LoadedPdf;
  page: number;
  sig: Signature | null;
  box: Box | undefined;
  onBox: (b: Box) => void;
  onRemove: () => void;
}) {
  const { ref, width } = useElementWidth<HTMLDivElement>();
  const [img, setImg] = useState<{ url: string; aspect: number } | null>(null);
  const drag = useRef<{ mode: 'move' | 'resize'; sx: number; sy: number; start: Box } | null>(null);

  useEffect(() => {
    let cancelled = false;
    setImg(null);
    getThumb(doc.pdf, page + 1, 760).then((url) => {
      const el = new Image();
      el.onload = () => !cancelled && setImg({ url, aspect: el.naturalWidth / el.naturalHeight });
      el.src = url;
    });
    return () => {
      cancelled = true;
    };
  }, [doc.pdf, page]);

  const height = img ? width / img.aspect : 0;
  const boxH = box && sig && height ? (box.width * width) / sig.ratio / height : 0;

  const onDown = (mode: 'move' | 'resize') => (e: React.PointerEvent) => {
    if (!box) return;
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { mode, sx: e.clientX, sy: e.clientY, start: box };
  };
  const onMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d || !sig || !width || !height) return;
    const dx = (e.clientX - d.sx) / width;
    const dy = (e.clientY - d.sy) / height;
    if (d.mode === 'move') {
      const h = (d.start.width * width) / sig.ratio / height;
      onBox({
        ...d.start,
        x: Math.min(1 - d.start.width, Math.max(0, d.start.x + dx)),
        y: Math.min(1 - h, Math.max(0, d.start.y + dy)),
      });
    } else {
      const w = Math.min(1 - d.start.x, Math.max(0.06, d.start.width + dx));
      const h = (w * width) / sig.ratio / height;
      if (d.start.y + h <= 1) onBox({ ...d.start, width: w });
    }
  };
  const nudge = (e: React.KeyboardEvent) => {
    if (!box) return;
    const step = e.shiftKey ? 0.05 : 0.01;
    const moves: Record<string, [number, number]> = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] };
    const m = moves[e.key];
    if (!m) return;
    e.preventDefault();
    onBox({ ...box, x: Math.min(1 - box.width, Math.max(0, box.x + m[0])), y: Math.min(1 - boxH, Math.max(0, box.y + m[1])) });
  };

  return (
    <Sheet className="bg-sunk/60 p-3 sm:p-5">
      <div ref={ref} className="relative mx-auto w-full max-w-[640px] select-none" style={{ height: height || undefined, minHeight: height ? undefined : 320 }}>
        {img ? (
          <img src={img.url} alt={`Page ${page + 1}`} draggable={false} className="absolute inset-0 size-full rounded-[3px] bg-white shadow-sheet" />
        ) : (
          <div className="absolute inset-0 animate-pulse rounded bg-sunk" />
        )}
        {box && sig && height > 0 && (
          <div
            role="button"
            tabIndex={0}
            aria-label="Signature. Drag to move, or use the arrow keys."
            onPointerDown={onDown('move')}
            onPointerMove={onMove}
            onPointerUp={() => (drag.current = null)}
            onPointerCancel={() => (drag.current = null)}
            onKeyDown={nudge}
            className="group absolute cursor-move touch-none rounded-sm outline-1 outline-accent outline-dashed hover:outline-2 focus-visible:outline-2"
            style={{ left: `${box.x * 100}%`, top: `${box.y * 100}%`, width: `${box.width * 100}%`, height: `${boxH * 100}%` }}
          >
            <img src={sig.dataUrl} alt="" draggable={false} className="pointer-events-none size-full" />
            <button
              aria-label="Remove from this page"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={onRemove}
              className="absolute -top-4 -right-4 flex size-8 items-center justify-center rounded-full"
            >
              <span className="flex size-6 items-center justify-center rounded-full bg-ink text-paper shadow">
                <X className="size-3.5" />
              </span>
            </button>
            <span
              aria-hidden
              onPointerDown={onDown('resize')}
              onPointerMove={onMove}
              onPointerUp={() => (drag.current = null)}
              onPointerCancel={() => (drag.current = null)}
              className="absolute -right-4 -bottom-4 flex size-8 cursor-nwse-resize touch-none items-center justify-center"
            >
              <span className="size-5 rounded-full border-2 border-sheet bg-accent shadow" />
            </span>
          </div>
        )}
      </div>
    </Sheet>
  );
}
