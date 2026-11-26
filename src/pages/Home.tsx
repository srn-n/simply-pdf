import { useState } from 'react';
import { ArrowRight, ArrowUpRight } from 'lucide-react';
import { PROMISES, SECTIONS, TOOLS } from '../tools/registry';
import { Link } from '../components/Shell';
import { QuickStart } from '../components/QuickStart';
import { ToolIcon } from '../components/icons';

// The tool list cascades in on the first visit; coming back to home is instant.
let visited = false;

export default function Home() {
  const [seen] = useState(() => {
    const was = visited;
    visited = true;
    return was;
  });
  return (
    <div className={`mx-auto max-w-2xl space-y-8 px-4 pt-5 pb-32${seen ? ' seen' : ''}`}>
      <h1 className="sr-only">Simply PDF tools</h1>
      <QuickStart compact />
      <ToolIndex />
      <Promises />
    </div>
  );
}

export function ToolIndex() {
  let n = 0;
  return (
    <div className="space-y-6">
      {SECTIONS.map((s) => {
        const tools = TOOLS.filter((t) => t.section === s.id);
        return (
          <section key={s.id} className="min-w-0">
            <h2 className="eyebrow mb-2 px-1">{s.label}</h2>
            <ul className="divide-y divide-rule overflow-hidden rounded-[22px] border border-rule bg-sheet shadow-sheet">
              {tools.map((t) => {
                n++;
                return (
                  <li key={t.id} className="rise" style={{ '--i': n } as React.CSSProperties}>
                    <Link to={`/${t.slug}`} className="row-pop group flex min-h-16 items-center gap-3.5 px-3.5 py-3 transition-colors active:bg-sunk/60">
                      <span className="tile flex size-11 shrink-0 items-center justify-center rounded-[14px] bg-tile text-ink shadow-[inset_0_1px_0_rgb(255_255_255/0.35)]">
                        <ToolIcon name={t.icon} className="size-5" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-[15px] font-semibold tracking-tight">{t.name}</span>
                        <span className="block truncate text-[13px] text-ink-3">{t.blurb}</span>
                      </span>
                      <ArrowRight className="size-4 shrink-0 text-ink-3 transition-transform duration-300 ease-spring group-active:translate-x-1" aria-hidden />
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </div>
  );
}

/** The four Simply Made Studio promises, in short. */
function Promises() {
  return (
    <section aria-labelledby="promises" className="space-y-3 border-t border-rule pt-6">
      <div className="flex items-baseline justify-between gap-3">
        <h2 id="promises" className="eyebrow">
          What you won't find here
        </h2>
        <Link to="/privacy" className="inline-flex items-center gap-1 text-xs font-semibold text-ink-2 hover:text-ink">
          Check it yourself <ArrowUpRight className="size-3.5" aria-hidden />
        </Link>
      </div>
      <ul className="grid grid-cols-2 gap-2">
        {PROMISES.map((p) => (
          <li key={p.word} className="glass rounded-[20px] px-3.5 py-3">
            <p className="text-[15px] font-semibold">
              <s className="decoration-danger decoration-2">{p.word}</s>
            </p>
            <p className="mt-1 text-xs leading-relaxed text-ink-2">{p.line}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
