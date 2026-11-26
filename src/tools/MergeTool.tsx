import { useCallback, useEffect, useRef, useState } from 'react';
import { Reorder, useDragControls } from 'motion/react';
import { ArrowDownAZ, GripVertical, X } from 'lucide-react';
import { mergePdfs, baseName } from '../lib/pdf/engine';
import { closePdf, openForRender, type PdfProxy } from '../lib/pdf/render';
import { toBlob, type Saveable } from '../lib/platform';
import { formatBytes, plural } from '../lib/format';
import { DropZone } from '../components/DropZone';
import { PageThumb } from '../components/PageThumb';
import { ResultView } from '../components/ResultView';
import { Workspace } from '../components/Workspace';
import { readBytes } from '../components/files';
import { useHandOff, useJob } from '../components/hooks';
import { Button, IconButton, Notice, Sheet } from '../components/ui';

interface Item {
  id: string;
  file: File;
}

let seq = 0;
const toItems = (files: File[]) => files.map((file) => ({ id: `f${++seq}`, file }));

export default function MergeTool() {
  const [items, setItems] = useState<Item[]>([]);
  const [pages, setPages] = useState<Record<string, number | 'error'>>({});
  const job = useJob<Saveable & { pages: number }>();

  const add = useCallback((files: File[]) => setItems((prev) => [...prev, ...toItems(files)]), []);
  useHandOff(add);

  if (job.state.status === 'done') {
    return (
      <ResultView
        tool="merge"
        outputs={[job.state.result]}
        headline={`${plural(items.length, 'file')} merged into one`}
        summary={
          <span className="num text-xs">
            {plural(job.state.result.pages, 'page')} ·{' '}
            {formatBytes(job.state.result.blob.size)}
          </span>
        }
        onReset={() => {
          setItems([]);
          job.reset();
        }}
        resetLabel="Merge other files"
      />
    );
  }

  if (items.length === 0) {
    return <DropZone kind="pdf" multiple onFiles={add} title="Choose PDFs to merge" />;
  }

  const broken = items.filter((i) => pages[i.id] === 'error');
  // Only files still in the list count; a removed file's page count lingers in `pages`.
  const totalPages = items.reduce((n, i) => n + (typeof pages[i.id] === 'number' ? (pages[i.id] as number) : 0), 0);
  const stillLoading = items.some((i) => pages[i.id] === undefined);
  const totalSize = items.reduce((n, i) => n + i.file.size, 0);

  const merge = () =>
    job.run(async (progress) => {
      const inputs = await Promise.all(items.map(async (i) => ({ name: i.file.name, bytes: await readBytes(i.file) })));
      const merged = await mergePdfs(inputs, (d, t, label) => progress(d, t, label ? `Adding ${label}` : 'Saving'));
      return { name: `${baseName(items[0].file.name)} (merged).pdf`, blob: toBlob(merged.bytes), pages: merged.pages };
    });

  return (
    <Workspace
      job={job.state}
      main={
        <>
          <div className="flex items-center justify-between gap-3 px-1">
            <p className="text-sm text-ink-2">
              <span className="num text-ink">{items.length}</span> files · drag to reorder
            </p>
            <Button
              variant="ghost"
              size="sm"
              icon={<ArrowDownAZ className="size-4" aria-hidden />}
              onClick={() => setItems((prev) => [...prev].sort((a, b) => a.file.name.localeCompare(b.file.name, undefined, { numeric: true })))}
            >
              Sort by name
            </Button>
          </div>
          <Reorder.Group axis="y" values={items} onReorder={setItems} className="space-y-2.5">
            {items.map((item, index) => (
              <MergeRow
                key={item.id}
                item={item}
                index={index}
                pages={pages[item.id]}
                onPages={(n) => setPages((p) => ({ ...p, [item.id]: n }))}
                onRemove={() => {
                  setItems((prev) => prev.filter((i) => i.id !== item.id));
                  setPages((p) => {
                    const next = { ...p };
                    delete next[item.id];
                    return next;
                  });
                }}
                onMove={(dir) =>
                  setItems((prev) => {
                    const next = [...prev];
                    const j = index + dir;
                    if (j < 0 || j >= next.length) return prev;
                    [next[index], next[j]] = [next[j], next[index]];
                    return next;
                  })
                }
              />
            ))}
          </Reorder.Group>
          <DropZone kind="pdf" multiple compact onFiles={add} />
        </>
      }
      side={
        <div className="space-y-4">
          <div>
            <p className="eyebrow">The merged file</p>
            <dl className="mt-3 grid grid-cols-2 gap-3">
              <Stat label="Files" value={String(items.length)} />
              <Stat label="Pages" value={stillLoading ? '…' : String(totalPages)} />
              <Stat label="Size in" value={formatBytes(totalSize)} />
              <Stat label="Order" value="As listed" />
            </dl>
          </div>
          {items.length === 1 && <Notice tone="warn">Add at least one more PDF to merge.</Notice>}
          {broken.length > 0 && (
            <Notice tone="error">
              {broken.map((b) => b.file.name).join(', ')} can't be opened. Remove {broken.length === 1 ? 'it' : 'them'} to continue.
            </Notice>
          )}
        </div>
      }
      action={
        <Button variant="primary" size="lg" className="w-full" busy={job.busy} disabled={items.length < 2 || broken.length > 0} onClick={merge}>
          Merge {items.length} files
        </Button>
      }
    />
  );
}

export function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-sunk/70 px-3 py-2.5">
      <dt className="text-[11px] text-ink-3">{label}</dt>
      <dd className="num mt-0.5 truncate text-sm text-ink">{value}</dd>
    </div>
  );
}

function MergeRow({
  item,
  index,
  pages,
  onPages,
  onRemove,
  onMove,
}: {
  item: Item;
  index: number;
  pages: number | 'error' | undefined;
  onPages: (n: number | 'error') => void;
  onRemove: () => void;
  onMove: (dir: -1 | 1) => void;
}) {
  const controls = useDragControls();
  const [pdf, setPdf] = useState<PdfProxy | null>(null);
  const onPagesRef = useRef(onPages);
  onPagesRef.current = onPages;

  useEffect(() => {
    let proxy: PdfProxy | null = null;
    let cancelled = false;
    readBytes(item.file)
      .then(openForRender)
      .then((p) => {
        proxy = p;
        if (cancelled) return closePdf(p);
        setPdf(p);
        onPagesRef.current(p.numPages);
      })
      .catch(() => !cancelled && onPagesRef.current('error'));
    return () => {
      cancelled = true;
      closePdf(proxy);
    };
  }, [item.file]);

  return (
    <Reorder.Item
      value={item}
      dragListener={false}
      dragControls={controls}
      className="relative"
      whileDrag={{ scale: 1.02, zIndex: 10, boxShadow: 'var(--shadow)' }}
    >
      <Sheet className="flex items-center gap-2 py-2 pr-2 pl-1 sm:gap-3">
        <button
          type="button"
          aria-label={`Drag ${item.file.name} to reorder. Use arrow keys to move.`}
          className="flex h-14 w-8 shrink-0 cursor-grab touch-none items-center justify-center rounded-lg text-ink-3 hover:text-ink active:cursor-grabbing"
          onPointerDown={(e) => controls.start(e)}
          onKeyDown={(e) => {
            if (e.key === 'ArrowUp') {
              e.preventDefault();
              onMove(-1);
            } else if (e.key === 'ArrowDown') {
              e.preventDefault();
              onMove(1);
            }
          }}
        >
          <GripVertical className="size-4" />
        </button>
        <span className="num w-5 shrink-0 text-center text-xs text-ink-3">{index + 1}</span>
        <PageThumb pdf={pdf} page={1} width={64} className="h-14 w-11 shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium" title={item.file.name}>
            {item.file.name}
          </p>
          <p className="num mt-0.5 text-[11px] text-ink-3">
            {formatBytes(item.file.size)}
            {typeof pages === 'number' && ` · ${plural(pages, 'page')}`}
            {pages === 'error' && <span className="text-danger"> · can't be opened</span>}
          </p>
        </div>
        <IconButton label={`Remove ${item.file.name}`} tone="danger" onClick={onRemove}>
          <X className="size-4" />
        </IconButton>
      </Sheet>
    </Reorder.Item>
  );
}
