import { useMemo, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, ArrowLeftRight, GripVertical, RotateCcw, RotateCw, Trash, Undo2 } from 'lucide-react';
import { baseName, organizePdf, type PagePlan } from '../lib/pdf/engine';
import { toBlob, type Saveable } from '../lib/platform';
import { plural } from '../lib/format';
import { PdfGate } from '../components/PdfGate';
import { PageThumb } from '../components/PageThumb';
import { ResultView } from '../components/ResultView';
import { FileHeader, Workspace } from '../components/Workspace';
import { useJob, type LoadedPdf } from '../components/hooks';
import { Button, IconButton, Notice, cx } from '../components/ui';

interface Card {
  key: number;
  source: number;
  rotate: number;
  deleted: boolean;
}

export default function OrganizeTool({ variant = 'organize' }: { variant?: 'organize' | 'rotate' }) {
  const [file, setFile] = useState<File | null>(null);
  return (
    <PdfGate file={file} setFile={setFile} title={variant === 'rotate' ? 'Choose a PDF to rotate' : 'Choose a PDF to organize'}>
      {(doc) => <OrganizeWorkspace key={doc.file.name + doc.file.size} doc={doc} variant={variant} onClear={() => setFile(null)} />}
    </PdfGate>
  );
}

function OrganizeWorkspace({ doc, variant, onClear }: { doc: LoadedPdf; variant: 'organize' | 'rotate'; onClear: () => void }) {
  const initial = useMemo(() => Array.from({ length: doc.pages }, (_, i) => ({ key: i, source: i, rotate: 0, deleted: false })), [doc.pages]);
  const [cards, setCards] = useState<Card[]>(initial);
  const [dragKey, setDragKey] = useState<number | null>(null);
  const [overKey, setOverKey] = useState<number | null>(null);
  const job = useJob<Saveable>();
  const history = useRef<Card[][]>([]);

  // Every edit goes through here so Undo can step back. Kept outside the state
  // updater, which React may call twice.
  const change = (fn: (c: Card[]) => Card[]) => {
    const next = fn(cards);
    if (next === cards) return;
    history.current = [...history.current.slice(-30), cards];
    setCards(next);
  };
  const undo = () => {
    const prev = history.current.pop();
    if (prev) setCards(prev);
  };

  const kept = cards.filter((c) => !c.deleted);
  const touched = cards.some((c, i) => c.deleted || c.rotate % 360 !== 0 || c.source !== i);
  const rotateOne = (key: number, by: number) => change((cs) => cs.map((c) => (c.key === key ? { ...c, rotate: c.rotate + by } : c)));
  const rotateAll = (by: number) => change((cs) => cs.map((c) => (c.deleted ? c : { ...c, rotate: c.rotate + by })));
  const toggleDelete = (key: number) => change((cs) => cs.map((c) => (c.key === key ? { ...c, deleted: !c.deleted } : c)));
  const move = (from: number, to: number) =>
    change((cs) => {
      if (from < 0 || to < 0 || to >= cs.length || from === to) return cs;
      const next = [...cs];
      const [card] = next.splice(from, 1);
      next.splice(to, 0, card);
      return next;
    });

  // Pointer-based dragging: works with a finger on a touch screen as well as a mouse,
  // unlike HTML drag and drop, which touch screens never fire.
  const dragging = useRef(false);
  const endDrag = (commit: boolean) => {
    if (!dragging.current) return;
    dragging.current = false;
    if (commit && dragKey !== null && overKey !== null && overKey !== dragKey) {
      move(
        cards.findIndex((x) => x.key === dragKey),
        cards.findIndex((x) => x.key === overKey),
      );
    }
    setDragKey(null);
    setOverKey(null);
  };
  const dragHandle = (key: number) => ({
    onPointerDown: (e: React.PointerEvent<HTMLElement>) => {
      if (e.button !== 0) return;
      e.preventDefault();
      e.currentTarget.setPointerCapture(e.pointerId);
      dragging.current = true;
      setDragKey(key);
      setOverKey(key);
    },
    onPointerMove: (e: React.PointerEvent<HTMLElement>) => {
      if (dragKey === null) return;
      const el = document.elementFromPoint(e.clientX, e.clientY)?.closest<HTMLElement>('[data-card]');
      if (el) setOverKey(Number(el.dataset.card));
      // Scroll while dragging near the top or bottom edge of the screen.
      if (e.clientY < 90) window.scrollBy(0, -14);
      else if (e.clientY > window.innerHeight - 150) window.scrollBy(0, 14);
    },
    onPointerUp: () => endDrag(true),
    onPointerCancel: () => endDrag(false),
    onLostPointerCapture: () => endDrag(true),
  });

  if (job.state.status === 'done') {
    return (
      <ResultView
        tool={variant}
        outputs={[job.state.result]}
        headline={variant === 'rotate' ? 'Pages turned the right way' : `Saved with ${plural(kept.length, 'page')}`}
        onReset={job.reset}
        resetLabel="Keep editing"
        record
      />
    );
  }

  const run = () =>
    job.run(async (progress) => {
      const plan: PagePlan[] = kept.map((c) => ({ source: c.source, rotate: c.rotate }));
      const bytes = await organizePdf(doc.bytes, plan, progress);
      return { name: `${baseName(doc.file.name)} (${variant === 'rotate' ? 'rotated' : 'edited'}).pdf`, blob: toBlob(bytes) };
    });

  return (
    <Workspace
      job={job.state}
      main={
        <>
          <FileHeader file={doc.file} pages={doc.pages} onClear={onClear} />
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" icon={<RotateCcw className="size-4" aria-hidden />} onClick={() => rotateAll(-90)}>
              All left
            </Button>
            <Button size="sm" icon={<RotateCw className="size-4" aria-hidden />} onClick={() => rotateAll(90)}>
              All right
            </Button>
            {variant === 'organize' && (
              <Button size="sm" icon={<ArrowLeftRight className="size-4" aria-hidden />} onClick={() => change((cs) => [...cs].reverse())}>
                Reverse
              </Button>
            )}
            <Button size="sm" variant="ghost" disabled={history.current.length === 0} icon={<Undo2 className="size-4" aria-hidden />} onClick={undo}>
              Undo
            </Button>
          </div>
          <p className="px-1 text-xs text-ink-3">
            {variant === 'organize' ? 'Hold the grip to drag a page, or use the arrows. ' : 'Tap a page to turn it. '}
            Nothing changes until you save.
          </p>
          <ol className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
            {cards.map((c, i) => (
              <li
                key={c.key}
                data-card={c.key}
                className={cx(
                  'group relative rounded-2xl border bg-sheet p-2.5 transition-[border-color,opacity,transform] duration-150',
                  overKey === c.key && dragKey !== c.key ? 'scale-[1.03] border-ink border-2' : 'border-rule',
                  dragKey === c.key && 'opacity-40',
                )}
              >
                {variant === 'organize' && (
                  <span
                    role="button"
                    aria-label={`Drag page ${c.source + 1} to reorder`}
                    title="Drag to reorder"
                    {...dragHandle(c.key)}
                    className="absolute top-1.5 left-1.5 z-10 flex size-9 cursor-grab touch-none items-center justify-center rounded-full bg-paper/90 text-ink-2 shadow-sm active:cursor-grabbing"
                  >
                    <GripVertical className="size-4" aria-hidden />
                  </span>
                )}
                <button
                  className="block w-full"
                  aria-label={variant === 'rotate' ? `Rotate page ${c.source + 1} right` : `Page ${c.source + 1}`}
                  onClick={() => (variant === 'rotate' ? rotateOne(c.key, 90) : undefined)}
                  tabIndex={variant === 'rotate' ? 0 : -1}
                >
                  <PageThumb pdf={doc.pdf} page={c.source + 1} rotate={c.rotate} width={200} dim={c.deleted} />
                </button>
                {c.deleted && (
                  <span className="absolute inset-x-2.5 top-1/3 text-center text-xs font-semibold text-danger">Will be removed</span>
                )}
                <div className="mt-2 flex items-center justify-between gap-1">
                  <span className="num pl-1 text-[11px] text-ink-2">
                    {c.deleted ? '–' : kept.indexOf(c) + 1}
                    {c.source !== kept.indexOf(c) && !c.deleted && <span className="text-ink-3"> · was {c.source + 1}</span>}
                  </span>
                  <span className="flex">
                    {variant === 'organize' && (
                      <>
                        <IconButton label={`Move page ${c.source + 1} earlier`} className="size-8" disabled={i === 0} onClick={() => move(i, i - 1)}>
                          <ArrowLeft className="size-3.5" />
                        </IconButton>
                        <IconButton label={`Move page ${c.source + 1} later`} className="size-8" disabled={i === cards.length - 1} onClick={() => move(i, i + 1)}>
                          <ArrowRight className="size-3.5" />
                        </IconButton>
                      </>
                    )}
                    <IconButton label={`Rotate page ${c.source + 1}`} className="size-8" onClick={() => rotateOne(c.key, 90)}>
                      <RotateCw className="size-3.5" />
                    </IconButton>
                    {variant === 'organize' && (
                      <IconButton
                        label={c.deleted ? `Keep page ${c.source + 1}` : `Delete page ${c.source + 1}`}
                        tone={c.deleted ? 'default' : 'danger'}
                        className="size-8"
                        onClick={() => toggleDelete(c.key)}
                      >
                        {c.deleted ? <Undo2 className="size-3.5" /> : <Trash className="size-3.5" />}
                      </IconButton>
                    )}
                  </span>
                </div>
              </li>
            ))}
          </ol>
        </>
      }
      side={
        <div className="space-y-4">
          <p className="eyebrow">Summary</p>
          <ul className="num space-y-1.5 text-xs text-ink-2">
            <li>{plural(kept.length, 'page')} kept</li>
            <li>{cards.filter((c) => c.deleted).length} removed</li>
            <li>{cards.filter((c) => !c.deleted && c.rotate % 360 !== 0).length} rotated</li>
          </ul>
          {kept.length === 0 && <Notice tone="error">Keep at least one page.</Notice>}
        </div>
      }
      action={
        <Button variant="primary" size="lg" className="w-full" busy={job.busy} disabled={kept.length === 0 || !touched} onClick={run}>
          {touched ? 'Save changes' : 'Make a change first'}
        </Button>
      }
    />
  );
}
