import { Suspense, lazy, type ComponentType } from 'react';
import { ShieldCheck } from 'lucide-react';
import { SECTIONS, TOOLS, type Tool, type ToolId } from '../tools/registry';
import { Link } from '../components/Shell';
import { cx } from '../components/ui';
import { ToolIcon } from '../components/icons';
import { Loading } from '../components/Workspace';

const OrganizeTool = () => import('../tools/OrganizeTool');
const RotateTool = lazy(async () => {
  const m = await OrganizeTool();
  return { default: () => <m.default variant="rotate" /> };
});

// Each tool is its own chunk, so the home screen never loads pdf.js.
const COMPONENTS: Record<ToolId, ComponentType> = {
  merge: lazy(() => import('../tools/MergeTool')),
  split: lazy(() => import('../tools/SplitTool')),
  compress: lazy(() => import('../tools/CompressTool')),
  organize: lazy(OrganizeTool),
  rotate: RotateTool,
  'jpg-to-pdf': lazy(() => import('../tools/ImagesTool')),
  'pdf-to-jpg': lazy(() => import('../tools/PdfToImagesTool')),
  'text-to-pdf': lazy(() => import('../tools/TextTool')),
  sign: lazy(() => import('../tools/SignTool')),
  watermark: lazy(() => import('../tools/WatermarkTool')),
  'page-numbers': lazy(() => import('../tools/PageNumbersTool')),
  'pdf-to-text': lazy(() => import('../tools/PdfToTextTool')),
  metadata: lazy(() => import('../tools/MetadataTool')),
};

export default function ToolPage({ tool, web = false }: { tool: Tool; web?: boolean }) {
  const Component = COMPONENTS[tool.id];
  // Website only; the Android build (--mode android) leaves this code out entirely.
  if (web && import.meta.env.MODE !== 'android') return <WebToolPage tool={tool} Component={Component} />;

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6">
      <header className="pt-4 pb-5">
        <div className="flex items-start gap-4">
          <span className="hidden size-12 shrink-0 items-center justify-center rounded-2xl bg-ink text-paper sm:flex">
            <ToolIcon name={tool.icon} className="size-6" />
          </span>
          <div className="min-w-0 space-y-1.5">
            <h1 className="text-2xl font-semibold tracking-tight">{tool.name}</h1>
            <p className="flex items-center gap-1.5 text-sm text-ink-2">
              <ShieldCheck className="size-4 shrink-0 text-accent" aria-hidden />
              {tool.blurb}. Nothing is uploaded.
            </p>
          </div>
        </div>
      </header>

      <Suspense fallback={<Loading label="Getting the tool ready…" />}>
        <Component key={tool.id} />
      </Suspense>

      <ToolHelp tool={tool} />
    </div>
  );
}

/** How-to and common questions, folded away so the tool stays simple. */
function ToolHelp({ tool }: { tool: Tool }) {
  return (
    <details className="group mt-10 mb-40 rounded-[20px] border border-rule bg-sheet lg:mb-16 [&_summary::-webkit-details-marker]:hidden">
      <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-4 px-5 text-sm font-semibold">
        How it works and questions
        <span className="num text-ink-3 transition-transform duration-200 group-open:rotate-45" aria-hidden>
          +
        </span>
      </summary>
      <div className="space-y-6 border-t border-rule px-5 py-5">
        <ol className="space-y-3">
          {tool.steps.map((s, i) => (
            <li key={s} className="flex gap-3 text-sm">
              <span className="num flex size-6 shrink-0 items-center justify-center rounded-full border border-rule-strong text-[10px]">{i + 1}</span>
              <span className="pt-0.5 leading-relaxed text-ink-2">{s}</span>
            </li>
          ))}
        </ol>
        <dl className="space-y-4">
          {tool.faq.map((f) => (
            <div key={f.q} className="space-y-1">
              <dt className="text-sm font-semibold">{f.q}</dt>
              <dd className="text-sm leading-relaxed text-ink-2">{f.a}</dd>
            </div>
          ))}
        </dl>
      </div>
    </details>
  );
}

/**
 * Website only: on a desktop the tool sits next to a list of every tool, and
 * its help is shown open below it. On a phone browser it looks like the app.
 */
function WebToolPage({ tool, Component }: { tool: Tool; Component: ComponentType }) {
  return (
    <div className="mx-auto max-w-[1240px] px-4 sm:px-6 lg:grid lg:grid-cols-[13.5rem_minmax(0,1fr)] lg:gap-12 lg:px-10">
      <ToolRail current={tool.id} />
      <div className="min-w-0">
        <header className="pt-4 pb-5 lg:pt-10 lg:pb-8">
          <div className="flex items-start gap-4">
            <span className="hidden size-12 shrink-0 items-center justify-center rounded-2xl bg-ink text-paper sm:flex lg:size-14">
              <ToolIcon name={tool.icon} className="size-6 lg:size-7" />
            </span>
            <div className="min-w-0 space-y-1.5">
              <h1 className="text-2xl font-semibold tracking-tight lg:text-[2.5rem] lg:leading-tight lg:tracking-[-0.03em]">{tool.name}</h1>
              <p className="flex items-center gap-1.5 text-sm text-ink-2 lg:text-base">
                <ShieldCheck className="size-4 shrink-0 text-accent" aria-hidden />
                {tool.blurb}. Nothing is uploaded.
              </p>
            </div>
          </div>
        </header>

        <Suspense fallback={<Loading label="Getting the tool ready…" />}>
          <Component key={tool.id} />
        </Suspense>

        <div className="lg:hidden">
          <ToolHelp tool={tool} />
        </div>
        <WebToolHelp tool={tool} />
      </div>
    </div>
  );
}

/** Every tool, grouped, so switching tools on a desktop is one click. */
function ToolRail({ current }: { current: ToolId }) {
  return (
    <nav aria-label="All tools" className="hidden lg:block">
      <div className="sticky top-16 max-h-[calc(100svh-4rem)] space-y-5 overflow-y-auto py-10 pr-2">
        {SECTIONS.map((s) => (
          <div key={s.id}>
            <p className="px-3 pb-1.5 text-[12px] font-semibold text-ink-3">{s.label}</p>
            <ul>
              {TOOLS.filter((t) => t.section === s.id).map((t) => {
                const on = t.id === current;
                return (
                  <li key={t.id}>
                    <Link
                      to={`/${t.slug}`}
                      aria-current={on ? 'page' : undefined}
                      className={cx(
                        'flex items-center gap-2.5 rounded-xl px-3 py-2 text-[14px] transition-colors',
                        on ? 'bg-ink font-semibold text-paper' : 'text-ink-2 hover:bg-sunk hover:text-ink',
                      )}
                    >
                      <ToolIcon name={t.icon} className="size-4 shrink-0" />
                      <span className="truncate">{t.name}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
    </nav>
  );
}

/** Website, desktop: the steps and questions laid out open, side by side. */
function WebToolHelp({ tool }: { tool: Tool }) {
  return (
    <section aria-labelledby="tool-help" className="mt-16 mb-12 hidden border-t border-rule pt-10 lg:block">
      <h2 id="tool-help" className="mb-8 text-2xl font-semibold tracking-tight">
        How {tool.name} works
      </h2>
      <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] gap-14">
        <ol className="space-y-5">
          {tool.steps.map((s, i) => (
            <li key={s} className="flex gap-4">
              <span className="num flex size-7 shrink-0 items-center justify-center rounded-full border border-rule-strong text-[11px]">{i + 1}</span>
              <span className="pt-0.5 leading-relaxed text-ink-2">{s}</span>
            </li>
          ))}
        </ol>
        <dl className="space-y-6">
          {tool.faq.map((f) => (
            <div key={f.q} className="space-y-1.5">
              <dt className="font-semibold">{f.q}</dt>
              <dd className="leading-relaxed text-ink-2">{f.a}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
