import { useCallback, useState } from 'react';
import { Reorder, useDragControls } from 'motion/react';
import { GripVertical, X } from 'lucide-react';
import { baseName, imagesToPdf, type ImagePageOptions } from '../lib/pdf/engine';
import { prepareImage } from '../lib/images';
import { toBlob, type Saveable } from '../lib/platform';
import { formatBytes, plural } from '../lib/format';
import { DropZone } from '../components/DropZone';
import { ResultView } from '../components/ResultView';
import { Workspace } from '../components/Workspace';
import { useHandOff, useJob, useObjectUrl } from '../components/hooks';
import { Button, IconButton, Segmented, Sheet } from '../components/ui';

interface Item {
  id: string;
  file: File;
}
let seq = 0;

export default function ImagesTool() {
  const [items, setItems] = useState<Item[]>([]);
  const [pageSize, setPageSize] = useState<ImagePageOptions['pageSize']>('a4');
  const [orientation, setOrientation] = useState<ImagePageOptions['orientation']>('auto');
  const [margin, setMargin] = useState<'0' | '18' | '36'>('18');
  const job = useJob<Saveable>();

  const add = useCallback((files: File[]) => setItems((p) => [...p, ...files.map((file) => ({ id: `i${++seq}`, file }))]), []);
  useHandOff(add);

  if (job.state.status === 'done') {
    return (
      <ResultView
        tool="jpg-to-pdf"
        outputs={[job.state.result]}
        headline={`${plural(items.length, 'image')} in one PDF`}
        summary={<span className="num text-xs">{formatBytes(job.state.result.blob.size)}</span>}
        onReset={() => {
          setItems([]);
          job.reset();
        }}
        resetLabel="Convert other images"
      />
    );
  }

  if (items.length === 0) {
    return <DropZone kind="images" multiple camera onFiles={add} title="Choose photos or images" hint="JPG, PNG, WebP · stays on this device" />;
  }

  const run = () =>
    job.run(async (progress) => {
      const prepared = [];
      for (let i = 0; i < items.length; i++) {
        progress(i, items.length * 2, `Reading ${items[i].file.name}`);
        prepared.push(await prepareImage(items[i].file));
      }
      const bytes = await imagesToPdf(prepared, { pageSize, orientation, margin: Number(margin) }, (d, t) =>
        progress(items.length + d, items.length + t, 'Building the PDF'),
      );
      return { name: `${items.length === 1 ? baseName(items[0].file.name) : 'Images'}.pdf`, blob: toBlob(bytes) };
    });

  return (
    <Workspace
      job={job.state}
      main={
        <>
          <p className="px-1 text-sm text-ink-2">
            <span className="num text-ink">{items.length}</span> images · one per page · drag to reorder
          </p>
          <Reorder.Group axis="y" values={items} onReorder={setItems} className="space-y-2.5">
            {items.map((item, i) => (
              <ImageRow key={item.id} item={item} index={i} onRemove={() => setItems((p) => p.filter((x) => x.id !== item.id))} />
            ))}
          </Reorder.Group>
          <DropZone kind="images" multiple compact onFiles={add} title="Add more images" />
        </>
      }
      side={
        <>
          <div className="space-y-2">
            <p className="text-[13px] font-semibold">Page size</p>
            <Segmented
              label="Page size"
              value={pageSize}
              onChange={setPageSize}
              options={[
                { value: 'a4', label: 'A4' },
                { value: 'letter', label: 'Letter' },
                { value: 'fit', label: 'Fit image' },
              ]}
            />
          </div>
          {pageSize !== 'fit' && (
            <div className="space-y-2">
              <p className="text-[13px] font-semibold">Orientation</p>
              <Segmented
                label="Orientation"
                value={orientation}
                onChange={setOrientation}
                options={[
                  { value: 'auto', label: 'Auto' },
                  { value: 'portrait', label: 'Portrait' },
                  { value: 'landscape', label: 'Landscape' },
                ]}
              />
            </div>
          )}
          <div className="space-y-2">
            <p className="text-[13px] font-semibold">Margin</p>
            <Segmented
              label="Margin"
              value={margin}
              onChange={setMargin}
              options={[
                { value: '0', label: 'None' },
                { value: '18', label: 'Small' },
                { value: '36', label: 'Large' },
              ]}
            />
          </div>
          <p className="text-xs leading-relaxed text-ink-3">Phone photos are turned upright automatically.</p>
        </>
      }
      action={
        <Button variant="primary" size="lg" className="w-full" busy={job.busy} onClick={run}>
          Make PDF
        </Button>
      }
    />
  );
}

function ImageRow({ item, index, onRemove }: { item: Item; index: number; onRemove: () => void }) {
  const controls = useDragControls();
  const url = useObjectUrl(item.file);
  return (
    <Reorder.Item value={item} dragListener={false} dragControls={controls} whileDrag={{ scale: 1.02, zIndex: 10 }} className="relative">
      <Sheet className="flex items-center gap-2 py-2 pr-2 pl-1 sm:gap-3">
        <button
          type="button"
          aria-label={`Drag ${item.file.name} to reorder`}
          className="flex h-14 w-8 shrink-0 cursor-grab touch-none items-center justify-center text-ink-3 hover:text-ink"
          onPointerDown={(e) => controls.start(e)}
        >
          <GripVertical className="size-4" />
        </button>
        <span className="num w-5 shrink-0 text-center text-xs text-ink-3">{index + 1}</span>
        <img src={url} alt="" className="size-14 shrink-0 rounded-lg bg-sunk object-cover" draggable={false} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{item.file.name}</p>
          <p className="num mt-0.5 text-[11px] text-ink-3">{formatBytes(item.file.size)}</p>
        </div>
        <IconButton label={`Remove ${item.file.name}`} tone="danger" onClick={onRemove}>
          <X className="size-4" />
        </IconButton>
      </Sheet>
    </Reorder.Item>
  );
}
