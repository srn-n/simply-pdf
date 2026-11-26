/**
 * The website's layout. The Android app never renders this (see App.tsx): it
 * keeps its own phone layout. On a phone browser the website looks much like
 * the app (the same tab bar); from 1024 px wide it becomes a desktop site with
 * header navigation, a wide home page and a footer.
 */
import { Suspense, lazy, type ReactNode } from 'react';
import { ArrowLeft } from 'lucide-react';
import { goBack, type Route } from '../lib/router';
import { THEMES, resolvedTheme, updateSettings, useSettings } from '../lib/store';
import { APP } from '../tools/registry';
import { ErrorBoundary, Link, TabBar, ThemeToggle, Toasts } from '../components/Shell';
import { Splash } from '../components/Splash';
import { Logo } from '../components/icons';
import { cx } from '../components/ui';
import ToolPage from '../pages/ToolPage';
import WebHome from './WebHome';

const Recent = lazy(() => import('../pages/Recent'));
const Settings = lazy(() => import('../pages/Settings'));
const Privacy = lazy(() => import('../pages/Privacy'));

export function WebLayout({
  route,
  screen,
  back,
  splash,
  onSplashDone,
  notFound,
}: {
  route: Route;
  screen: string;
  back: boolean;
  splash: boolean;
  onSplashDone: () => void;
  notFound: ReactNode;
}) {
  const showTabs = route.name === 'home' || route.name === 'recent' || route.name === 'settings';
  return (
    <>
      <div className="ambient" aria-hidden>
        <i />
        <i />
        <i />
      </div>
      <WebHeader route={route} />
      <main id="main" key={screen} className={`${back ? '' : 'enter '}relative min-h-[70vh]`}>
        <ErrorBoundary key={screen}>
          <Suspense fallback={<div className="min-h-[60vh]" />}>
            {route.name === 'home' && <WebHome />}
            {route.name === 'tool' && <ToolPage tool={route.tool} web />}
            {route.name === 'recent' && <Recent />}
            {route.name === 'settings' && <Settings />}
            {route.name === 'privacy' && <Privacy />}
            {route.name === 'not-found' && notFound}
          </Suspense>
        </ErrorBoundary>
      </main>
      <WebFooter />
      {/* Phone browsers keep the app's tab bar; desktops use the header. */}
      <div className="lg:hidden">
        <TabBar route={route} hidden={!showTabs} />
      </div>
      <Toasts />
      {splash && <Splash onDone={onSplashDone} />}
    </>
  );
}

const NAV = [
  { to: '/', label: 'Tools', match: (r: Route) => r.name === 'home' || r.name === 'tool' },
  { to: '/recent', label: 'Recent', match: (r: Route) => r.name === 'recent' },
  { to: '/privacy', label: 'Privacy', match: (r: Route) => r.name === 'privacy' },
  { to: '/settings', label: 'Settings', match: (r: Route) => r.name === 'settings' },
];

function WebHeader({ route }: { route: Route }) {
  const sub = route.name === 'tool' || route.name === 'privacy' || route.name === 'not-found';
  return (
    <header className="glass safe-top sticky top-0 z-40 rounded-none border-x-0 border-t-0">
      <div className="mx-auto flex h-14 max-w-[1240px] items-center gap-2 px-4 sm:px-6 lg:h-16 lg:px-10">
        {sub && (
          <button aria-label="Back" onClick={() => goBack('/')} className="press -ml-2 flex size-10 items-center justify-center rounded-full hover:bg-sunk lg:hidden">
            <ArrowLeft className="size-5" />
          </button>
        )}
        <Link to="/" className="group flex items-center gap-2.5 rounded-lg pr-2" aria-label="Simply PDF home">
          <Logo className="size-7 text-ink transition-transform duration-300 ease-out-soft group-hover:-rotate-6" />
          <span className="text-[17px] font-bold tracking-tight">Simply PDF</span>
        </Link>
        <nav aria-label="Main" className="ml-auto hidden items-center gap-1 lg:flex">
          {NAV.map((n) => {
            const on = n.match(route);
            return (
              <Link
                key={n.to}
                to={n.to}
                aria-current={on ? 'page' : undefined}
                className={cx(
                  'press rounded-full px-4 py-2 text-[14px] font-semibold transition-colors',
                  on ? 'bg-ink text-paper' : 'text-ink-2 hover:bg-sunk hover:text-ink',
                )}
              >
                {n.label}
              </Link>
            );
          })}
          <span className="mx-2 h-6 w-px bg-rule" aria-hidden />
          <ThemeToggle />
        </nav>
        <div className="ml-auto lg:hidden">
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}

function WebFooter() {
  useSettings(); // re-render when the theme changes
  const current = resolvedTheme();
  return (
    <footer className="mt-8 hidden border-t border-rule lg:block">
      <div className="mx-auto grid max-w-[1240px] grid-cols-[1fr_auto] items-start gap-10 px-10 py-10">
        <div className="space-y-3">
          <div className="flex items-center gap-2.5">
            <Logo className="size-6" />
            <span className="font-bold tracking-tight">Simply PDF</span>
            <span className="num text-[11px] text-ink-3">{__APP_VERSION__}</span>
          </div>
          <p className="max-w-md text-sm leading-relaxed text-ink-2">
            Every tool runs in this browser tab. Your files are never uploaded, and nothing on this site tracks you.
          </p>
          <p className="text-sm text-ink-3">
            Made by{' '}
            <a href={APP.studioUrl} target="_blank" rel="noopener noreferrer" className="font-semibold text-ink-2 underline-offset-4 hover:text-ink hover:underline">
              {APP.studio}
            </a>
          </p>
        </div>
        <div className="space-y-3 text-right">
          <p className="text-sm font-semibold">Theme</p>
          <div className="flex justify-end gap-2" role="radiogroup" aria-label="Theme">
            {THEMES.map((t) => {
              const on = t.id === current;
              return (
                <button
                  key={t.id}
                  role="radio"
                  aria-checked={on}
                  aria-label={t.name}
                  title={t.name}
                  onClick={() => updateSettings({ theme: t.id })}
                  className={cx(
                    'press relative size-8 overflow-hidden rounded-full border transition-[box-shadow]',
                    on ? 'border-ink shadow-[0_0_0_2px_var(--paper),0_0_0_3.5px_var(--ink)]' : 'border-rule-strong',
                  )}
                  style={{ background: t.swatch[0] }}
                >
                  <span className="absolute inset-x-0 bottom-0 h-1/2" style={{ background: t.swatch[2] }} aria-hidden />
                </button>
              );
            })}
          </div>
          <p className="text-xs text-ink-3">{THEMES.find((t) => t.id === current)?.name}</p>
        </div>
      </div>
    </footer>
  );
}
