/**
 * The website's home page. A desktop layout from 1024 px: the promise and a
 * large drop zone side by side, then every tool in a grid by section. On a
 * phone browser it stacks into one column.
 */
import { useState, type CSSProperties } from 'react';
import { ArrowUpRight } from 'lucide-react';
import { PROMISES, SECTIONS, TOOLS } from '../tools/registry';
import { Link } from '../components/Shell';
import { QuickStart } from '../components/QuickStart';
import { ToolIcon } from '../components/icons';

// The promises draw their strike lines on the first visit only; coming back is instant.
let visited = false;

export default function WebHome() {
  const [seen] = useState(() => {
    const was = visited;
    visited = true;
    return was;
  });
  return (
    <div className={`mx-auto max-w-[1240px] px-4 pb-32 sm:px-6 lg:px-10 lg:pb-12${seen ? ' seen' : ''}`}>
      <Hero />
      <Tools />
    </div>
  );
}

function Hero() {
  // Three blocks. Phone: headline, drop zone, then the promises. Desktop: the
  // drop zone in its own column on the right, beside the other two.
  return (
    <section className="grid gap-x-16 gap-y-7 pt-6 pb-10 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] lg:grid-rows-[auto_auto] lg:gap-y-9 lg:pt-20 lg:pb-24">
      <h1 className="self-end text-[2.15rem] leading-[1.02] font-semibold tracking-[-0.035em] text-balance sm:text-5xl lg:text-[4.25rem]">
        PDF tools that never upload your files.
      </h1>
      <div className="lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:self-center lg:pl-4">
        <QuickStart />
      </div>
      <div className="space-y-7 lg:space-y-9">
        <p className="max-w-[34rem] text-[17px] leading-relaxed text-ink-2 lg:text-lg">
          Merge, split, compress, sign and convert PDFs right here in your browser. Every file is opened and changed on this device, and the site keeps
          working with the internet switched off.
        </p>
        <div className="space-y-3">
          <ul
            className="flex flex-wrap gap-x-4 gap-y-1 text-[1.2rem] leading-tight font-semibold tracking-tight sm:text-3xl lg:gap-x-6 lg:text-[2.15rem]"
            aria-label="What you won't find here"
          >
            {PROMISES.map((p, i) => (
              <li key={p.word}>
                <span className="strike-word" style={{ '--i': i } as CSSProperties}>
                  {p.word}
                </span>
                <span className="sr-only">: none.</span>
              </li>
            ))}
          </ul>
          <Link to="/privacy" className="inline-flex items-center gap-1 text-sm font-semibold text-ink-2 underline-offset-4 hover:text-ink hover:underline">
            How you can check this yourself <ArrowUpRight className="size-3.5" aria-hidden />
          </Link>
        </div>
      </div>
    </section>
  );
}

function Tools() {
  return (
    <section aria-labelledby="all-tools" className="border-t border-rule pt-8 lg:pt-14">
      <div className="mb-6 flex items-baseline justify-between gap-4 lg:mb-10">
        <h2 id="all-tools" className="text-2xl font-semibold tracking-tight lg:text-[2rem]">
          All {TOOLS.length} tools
        </h2>
        <p className="hidden text-sm text-ink-3 sm:block">Free, with no limits on files or pages.</p>
      </div>
      <div className="divide-y divide-rule">
        {SECTIONS.map((s) => {
          const tools = TOOLS.filter((t) => t.section === s.id);
          return (
            <div key={s.id} className="grid gap-3 py-5 first:pt-0 lg:grid-cols-[13rem_minmax(0,1fr)] lg:gap-10 lg:py-7">
              <h3 className="pt-1 text-[15px] font-semibold text-ink-3 lg:pt-3">{s.label}</h3>
              <ul className="-mx-3 grid gap-1 sm:grid-cols-2 lg:mx-0 xl:grid-cols-3">
                {tools.map((t) => (
                  <li key={t.id}>
                    <Link
                      to={`/${t.slug}`}
                      className="press-soft group flex items-start gap-3.5 rounded-2xl p-3 transition-colors hover:bg-sheet focus-visible:bg-sheet"
                    >
                      <span className="tile flex size-11 shrink-0 items-center justify-center rounded-[14px] bg-tile text-ink shadow-[inset_0_1px_0_rgb(255_255_255/0.35)] transition-transform duration-300 ease-spring group-hover:-rotate-3">
                        <ToolIcon name={t.icon} className="size-5" />
                      </span>
                      <span className="min-w-0 pt-0.5">
                        <span className="block text-[15px] font-semibold tracking-tight">{t.name}</span>
                        <span className="mt-0.5 block text-[13px] leading-snug text-ink-3">{t.blurb}</span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </section>
  );
}
