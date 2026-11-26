import { useEffect, useState } from 'react';
import { FolderOpen } from 'lucide-react';
import { textToPdf, type TextPdfOptions } from '../lib/pdf/engine';
import { toBlob, type Saveable } from '../lib/platform';
import { plural } from '../lib/format';
import { ResultView } from '../components/ResultView';
import { Workspace } from '../components/Workspace';
import { ACCEPT_ATTR } from '../components/files';
import { useJob } from '../components/hooks';
import { toast } from '../lib/store';
import { Button, Field, Notice, Segmented, Sheet, Switch, cx, inputClass } from '../components/ui';

const DRAFT_KEY = 'simply-pdf:text-draft';

const SAMPLE = `# A heading
Plain paragraphs wrap to the page width. Leave a blank line between them.

## A smaller heading
- Lines starting with a dash become bullet points
- Like this one`;

function loadDraft(): { title: string; body: string } {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    const d = raw ? JSON.parse(raw) : null;
    if (d && typeof d === 'object') return { title: String(d.title ?? ''), body: String(d.body ?? '') };
  } catch {
    /* ignore */
  }
  return { title: '', body: '' };
}

export default function TextTool() {
  const [draft] = useState(loadDraft);
  const [title, setTitle] = useState(draft.title);
  const [body, setBody] = useState(draft.body);
  const [opts, setOpts] = useState<TextPdfOptions>({ font: 'sans', size: 11, pageSize: 'a4', margin: 56, pageNumbers: true });
  const job = useJob<Saveable & { replaced: number; pages: number }>();

  // Keep an unsent draft on this device so a refresh doesn't lose it.
  useEffect(() => {
    const t = setTimeout(() => {
      try {
        localStorage.setItem(DRAFT_KEY, JSON.stringify({ title, body }));
      } catch {
        /* ignore */
      }
    }, 400);
    return () => clearTimeout(t);
  }, [title, body]);

  const set = <K extends keyof TextPdfOptions>(k: K, v: TextPdfOptions[K]) => setOpts((o) => ({ ...o, [k]: v }));

  if (job.state.status === 'done') {
    const r = job.state.result;
    return (
      <ResultView
        tool="text-to-pdf"
        outputs={[r]}
        headline={`${plural(r.pages, 'page')}, laid out`}
        summary={
          r.replaced > 0 ? (
            <Notice tone="warn" className="mt-2">
              {plural(r.replaced, 'character')} couldn't be drawn by the built-in PDF fonts and {r.replaced === 1 ? 'was' : 'were'} replaced with “?”.
              Emoji and non-Latin scripts aren't supported here.
            </Notice>
          ) : undefined
        }
        onReset={job.reset}
        resetLabel="Back to the text"
      />
    );
  }

  const openFile = async (f: File | undefined) => {
    if (!f) return;
    if (f.size > 5 * 1024 * 1024) {
      toast(`${f.name} is too big for Text to PDF (5 MB at most).`, 'error');
      return;
    }
    try {
      const text = await f.text();
      setBody(text);
      if (!title) setTitle(f.name.replace(/\.[^.]+$/, ''));
    } catch {
      toast(`${f.name} could not be read.`, 'error');
    }
  };

  const run = () =>
    job.run(async () => {
      const r = await textToPdf(title, body, opts);
      return { name: `${(title.trim() || 'Notes').replace(/[\\/:*?"<>|]+/g, '-').slice(0, 80)}.pdf`, blob: toBlob(r.bytes), replaced: r.replaced, pages: r.pages };
    });

  const words = body.trim() ? body.trim().split(/\s+/).length : 0;

  return (
    <Workspace
      job={job.state}
      main={
        <Sheet className="overflow-hidden">
          <input
            aria-label="Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Title (optional)"
            className="w-full border-b border-rule bg-transparent px-5 py-4 text-xl font-semibold tracking-tight placeholder:text-ink-3 focus:outline-none sm:px-6"
          />
          <textarea
            aria-label="Text"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder={SAMPLE}
            className="block min-h-[50vh] w-full resize-y bg-transparent px-5 py-4 text-[15px] leading-relaxed placeholder:text-ink-3/80 focus:outline-none sm:px-6"
          />
          <div className="flex items-center justify-between gap-3 border-t border-rule px-4 py-2">
            <span className="num text-[11px] text-ink-3">{plural(words, 'word')}</span>
            <label className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-full px-3 text-[13px] font-semibold text-ink-2 hover:bg-sunk hover:text-ink">
              <FolderOpen className="size-4" aria-hidden /> Open .txt or .md
              <input
                type="file"
                accept={ACCEPT_ATTR.text}
                className="sr-only"
                onChange={(e) => {
                  openFile(e.target.files?.[0]);
                  e.target.value = '';
                }}
              />
            </label>
          </div>
        </Sheet>
      }
      side={
        <>
          <div className="space-y-2">
            <p className="text-[13px] font-semibold">Font</p>
            <Segmented
              label="Font"
              value={opts.font}
              onChange={(v) => set('font', v)}
              options={[
                { value: 'sans', label: 'Sans' },
                { value: 'serif', label: 'Serif' },
                { value: 'mono', label: 'Mono' },
              ]}
            />
          </div>
          <Field label="Text size" htmlFor="text-size">
            <select id="text-size" value={opts.size} onChange={(e) => set('size', Number(e.target.value))} className={cx(inputClass, 'text-sm')}>
              {[9, 10, 11, 12, 14, 16].map((s) => (
                <option key={s} value={s}>
                  {s} pt
                </option>
              ))}
            </select>
          </Field>
          <div className="space-y-2">
            <p className="text-[13px] font-semibold">Page size</p>
            <Segmented
              label="Page size"
              value={opts.pageSize}
              onChange={(v) => set('pageSize', v)}
              options={[
                { value: 'a4', label: 'A4' },
                { value: 'letter', label: 'Letter' },
              ]}
            />
          </div>
          <Switch checked={opts.pageNumbers} onChange={(v) => set('pageNumbers', v)} label="Page numbers" />
          <p className="text-xs leading-relaxed text-ink-3">
            Use <span className="num">#</span> for headings and <span className="num">-</span> for bullets. Your draft is kept on this device until you clear it.
          </p>
        </>
      }
      action={
        <Button variant="primary" size="lg" className="w-full" busy={job.busy} disabled={!title.trim() && !body.trim()} onClick={run}>
          Make PDF
        </Button>
      }
    />
  );
}
