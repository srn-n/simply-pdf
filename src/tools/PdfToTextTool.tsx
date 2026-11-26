import { useState } from 'react';
import { ClipboardCopy } from 'lucide-react';
import { baseName } from '../lib/pdf/engine';
import { extractText } from '../lib/pdf/render';
import type { Saveable } from '../lib/platform';
import { plural } from '../lib/format';
import { toast } from '../lib/store';
import { PdfGate } from '../components/PdfGate';
import { ResultView } from '../components/ResultView';
import { FileHeader, Workspace } from '../components/Workspace';
import { useJob, type LoadedPdf } from '../components/hooks';
import { Button, Notice, Sheet } from '../components/ui';

export default function PdfToTextTool() {
  const [file, setFile] = useState<File | null>(null);
  return (
    <PdfGate file={file} setFile={setFile} title="Choose a PDF to read">
      {(doc) => <Extractor key={doc.file.name + doc.file.size} doc={doc} onClear={() => setFile(null)} />}
    </PdfGate>
  );
}

function Extractor({ doc, onClear }: { doc: LoadedPdf; onClear: () => void }) {
  const job = useJob<Saveable & { text: string; pagesWithText: number }>();

  if (job.state.status === 'done') {
    const r = job.state.result;
    const empty = r.pagesWithText === 0;
    return (
      <ResultView
        tool="pdf-to-text"
        outputs={empty ? [] : [r]}
        record={!empty}
        headline={empty ? 'No text found' : `Text from ${plural(r.pagesWithText, 'page')}`}
        summary={
          empty
            ? 'This PDF looks like a scan: its pages are pictures of text. Simply PDF does not do OCR, so there is nothing to copy.'
            : r.pagesWithText < doc.pages
              ? `${plural(doc.pages - r.pagesWithText, 'page')} had no text, probably scanned.`
              : undefined
        }
        onReset={onClear}
        resetLabel="Read another PDF"
      >
        {!empty && (
          <Sheet className="overflow-hidden">
            <div className="flex items-center justify-between border-b border-rule px-4 py-2">
              <span className="num text-[11px] text-ink-3">{r.text.length.toLocaleString()} characters</span>
              <Button
                size="sm"
                variant="ghost"
                icon={<ClipboardCopy className="size-4" aria-hidden />}
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(r.text);
                    toast('Copied');
                  } catch {
                    toast('Copying is blocked here. Select the text instead.', 'error');
                  }
                }}
              >
                Copy all
              </Button>
            </div>
            <textarea readOnly value={r.text} aria-label="Extracted text" className="num block h-[50vh] w-full resize-y bg-transparent p-4 text-xs leading-relaxed focus:outline-none" />
          </Sheet>
        )}
      </ResultView>
    );
  }

  const run = () =>
    job.run(async (progress) => {
      const r = await extractText(doc.bytes, progress);
      return { name: `${baseName(doc.file.name)}.txt`, blob: new Blob([r.text], { type: 'text/plain;charset=utf-8' }), text: r.text, pagesWithText: r.pagesWithText };
    });

  return (
    <Workspace
      job={job.state}
      main={<FileHeader file={doc.file} pages={doc.pages} onClear={onClear} />}
      side={<Notice tone="info">Reads the text layer of each page. Scanned pages have no text layer, and this tool will tell you if so.</Notice>}
      action={
        <Button variant="primary" size="lg" className="w-full" busy={job.busy} onClick={run}>
          Extract text
        </Button>
      }
    />
  );
}
