import { Suspense, lazy, type ComponentType } from 'react';
import { ShieldCheck } from 'lucide-react';
import { type Tool, type ToolId } from '../tools/registry';
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

export default function ToolPage({ tool }: { tool: Tool }) {
  const Component = COMPONENTS[tool.id];


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
