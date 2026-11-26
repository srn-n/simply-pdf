import { useEffect, useState } from 'react';
import { Eraser } from 'lucide-react';
import { baseName, readMetadata, stripMetadata, writeMetadata, type MetadataEdit, type PdfMetadata } from '../lib/pdf/engine';
import { toBlob, type Saveable } from '../lib/platform';
import { PdfGate } from '../components/PdfGate';
import { ResultView } from '../components/ResultView';
import { FileHeader, Workspace } from '../components/Workspace';
import { messageFor, useJob, type LoadedPdf } from '../components/hooks';
import { Button, Field, Notice, Sheet, inputClass } from '../components/ui';

export default function MetadataTool() {
  const [file, setFile] = useState<File | null>(null);
  return (
    <PdfGate file={file} setFile={setFile} title="Choose a PDF to inspect">
      {(doc) => <Inspector key={doc.file.name + doc.file.size} doc={doc} onClear={() => setFile(null)} />}
    </PdfGate>
  );
}

function fmtDate(iso?: string) {
  if (!iso) return '—';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleString();
}

function Inspector({ doc, onClear }: { doc: LoadedPdf; onClear: () => void }) {
  const [meta, setMeta] = useState<PdfMetadata | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [edit, setEdit] = useState<MetadataEdit>({ title: '', author: '', subject: '', keywords: '' });
  const job = useJob<Saveable & { stripped: boolean }>();

  useEffect(() => {
    readMetadata(doc.bytes)
      .then((m) => {
        setMeta(m);
        setEdit({ title: m.title, author: m.author, subject: m.subject, keywords: m.keywords });
      })
      .catch((e) => setError(messageFor(e)));
  }, [doc.bytes]);

  if (job.state.status === 'done') {
    const r = job.state.result;
    return (
      <ResultView
        tool="metadata"
        outputs={[r]}
        headline={r.stripped ? 'Hidden details removed' : 'Details updated'}
        summary={r.stripped ? 'Author, app, dates and XMP data are gone. The pages are unchanged.' : undefined}
        onReset={job.reset}
        resetLabel="Back to the details"
      />
    );
  }

  if (error) return <Notice tone="error">{error}</Notice>;

  const rows: [string, string][] = meta
    ? [
        ['Title', meta.title || '—'],
        ['Author', meta.author || '—'],
        ['Subject', meta.subject || '—'],
        ['Keywords', meta.keywords || '—'],
        ['Made with', meta.creator || '—'],
        ['Produced by', meta.producer || '—'],
        ['Created', fmtDate(meta.created)],
        ['Modified', fmtDate(meta.modified)],
        ['XMP metadata', meta.hasXmp ? 'Present' : 'None'],
      ]
    : [];
  const found = rows.filter(([k, v]) => v !== '—' && v !== 'None' && k !== 'Modified').length;

  const set = (k: keyof MetadataEdit, v: string) => setEdit((e) => ({ ...e, [k]: v }));

  return (
    <Workspace
      job={job.state}
      main={
        <>
          <FileHeader file={doc.file} pages={doc.pages} onClear={onClear} />
          <Sheet className="overflow-hidden">
            <div className="border-b border-rule px-5 py-3">
              <p className="eyebrow">Hidden inside this file</p>
              {meta && (
                <p className="mt-1 text-sm text-ink-2">
                  {found === 0 ? 'Nothing much. This file is already quite clean.' : `${found} details anyone you send it to can read.`}
                </p>
              )}
            </div>
            <dl className="divide-y divide-rule">
              {rows.map(([k, v]) => (
                <div key={k} className="grid grid-cols-[8.5rem_1fr] gap-3 px-5 py-2.5 text-[13px]">
                  <dt className="text-ink-3">{k}</dt>
                  <dd className="num min-w-0 text-xs break-words text-ink">{v}</dd>
                </div>
              ))}
            </dl>
          </Sheet>
        </>
      }
      side={
        <>
          <p className="eyebrow">Edit</p>
          <Field label="Title" htmlFor="m-title">
            <input id="m-title" value={edit.title} onChange={(e) => set('title', e.target.value)} className={inputClass} />
          </Field>
          <Field label="Author" htmlFor="m-author">
            <input id="m-author" value={edit.author} onChange={(e) => set('author', e.target.value)} className={inputClass} />
          </Field>
          <Field label="Subject" htmlFor="m-subject">
            <input id="m-subject" value={edit.subject} onChange={(e) => set('subject', e.target.value)} className={inputClass} />
          </Field>
          <Field label="Keywords" htmlFor="m-kw" hint="Separate with commas.">
            <input id="m-kw" value={edit.keywords} onChange={(e) => set('keywords', e.target.value)} className={inputClass} />
          </Field>
          <Button
            className="w-full"
            busy={job.busy}
            onClick={() =>
              job.run(async () => ({ name: `${baseName(doc.file.name)}.pdf`, blob: toBlob(await writeMetadata(doc.bytes, edit)), stripped: false }))
            }
          >
            Save these details
          </Button>
        </>
      }
      action={
        <Button
          variant="primary"
          size="lg"
          className="w-full"
          busy={job.busy}
          icon={<Eraser className="size-4" aria-hidden />}
          onClick={() => job.run(async () => ({ name: `${baseName(doc.file.name)} (clean).pdf`, blob: toBlob(await stripMetadata(doc.bytes)), stripped: true }))}
        >
          Remove all hidden details
        </Button>
      }
    />
  );
}
