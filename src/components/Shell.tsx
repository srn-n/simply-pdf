import { Component, useRef, useState, type ReactNode } from 'react';
import { ArrowLeft, Clock, LayoutGrid, Settings as SettingsIcon } from 'lucide-react';
import { href, navigate, goBack, type Route } from '../lib/router';
import { THEMES, resolvedTheme, updateSettings, useSettings, useToasts } from '../lib/store';
import { Logo } from './icons';
import { cx } from './ui';

/** An <a> that navigates in-app. */
export function Link({ to, className, children, ...rest }: { to: string; className?: string; children: ReactNode } & React.AnchorHTMLAttributes<HTMLAnchorElement>) {
  return (
    <a
      href={href(to)}
      className={className}
      onClick={(e) => {
        if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
        e.preventDefault();
        navigate(to);
      }}
      {...rest}
    >
      {children}
    </a>
  );
}

/** Taps through the four stationery themes; the swatch hops each time. */
function ThemeToggle() {
  useSettings(); // re-render when the theme changes
  const [hop, setHop] = useState(0);
  const current = THEMES.findIndex((t) => t.id === resolvedTheme());
  const next = THEMES[(current + 1) % THEMES.length];
  const [bg, ink, accent] = THEMES[current].swatch;
  return (
    <button
      aria-label={`Theme: ${THEMES[current].name}. Switch to ${next.name}`}
      title={`Switch to ${next.name}`}
      onClick={() => {
        updateSettings({ theme: next.id });
        setHop((h) => h + 1);
      }}
      className="press flex size-10 items-center justify-center rounded-full hover:bg-sunk"
    >
      <span key={hop} className={hop ? 'hop' : undefined} aria-hidden>
        <svg viewBox="0 0 24 24" className="size-[22px]">
          <rect x="4" y="3" width="14" height="18" rx="2.5" fill={bg} stroke={ink} strokeWidth="1.5" />
          <rect x="7" y="8" width="8" height="3" rx="1.2" fill={accent} />
          <rect x="7" y="13.5" width="5.5" height="1.6" rx=".8" fill={ink} opacity=".45" />
        </svg>
      </span>
    </button>
  );
}

export function TopBar({ route }: { route: Route }) {
  return (
    <header className="glass safe-top sticky top-0 z-40 rounded-none border-x-0 border-t-0">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-2 px-4 sm:px-6">
        {route.name !== 'home' && route.name !== 'recent' && route.name !== 'settings' && (
          <button aria-label="Back" onClick={() => goBack('/')} className="press -ml-2 flex size-10 items-center justify-center rounded-full hover:bg-sunk">
            <ArrowLeft className="size-5" />
          </button>
        )}
        <Link to="/" className="group flex items-center gap-2.5 rounded-lg pr-2" aria-label="Simply PDF home">
          <Logo className="size-7 text-ink transition-transform duration-300 ease-out-soft group-hover:-rotate-6" />
          <span className="text-[17px] font-bold tracking-tight">Simply PDF</span>
        </Link>
        <nav aria-label="Main" className="ml-auto flex items-center gap-1">
          <ThemeToggle />
        </nav>
      </div>
    </header>
  );
}

/** The three home destinations, on a floating glass bar. The active blob
 *  slides between them with a spring and stretches like a drop of liquid. */
export function TabBar({ route, hidden = false }: { route: Route; hidden?: boolean }) {
  // While hidden on a tool screen, keep showing the tab it was left on, so
  // nothing changes (or re-bounces) when it slides back.
  const last = useRef<Route['name']>('home');
  if (!hidden) last.current = route.name;
  const on = hidden ? last.current : route.name;
  const tabs = [
    { to: '/', label: 'Tools', icon: LayoutGrid, active: on === 'home' },
    { to: '/recent', label: 'Recent', icon: Clock, active: on === 'recent' },
    { to: '/settings', label: 'Settings', icon: SettingsIcon, active: on === 'settings' },
  ];
  const index = Math.max(0, tabs.findIndex((t) => t.active));
  return (
    // Stays mounted on tool screens and just slides away, so coming back home
    // doesn't rebuild it and replay its bounce.
    <nav
      aria-label="Sections"
      aria-hidden={hidden || undefined}
      inert={hidden || undefined}
      className={cx(
        'safe-bottom pointer-events-none fixed inset-x-0 bottom-0 z-40 px-5 transition-[translate,opacity] duration-300 ease-out-soft',
        hidden && 'translate-y-[140%] opacity-0',
      )}
    >
      <div className="glass glass-strong pointer-events-auto relative mx-auto grid max-w-sm grid-cols-3 rounded-full p-1.5">
        <span
          aria-hidden
          className="tab-blob pointer-events-none absolute inset-y-1.5 left-1.5 w-[calc((100%-0.75rem)/3)]"
          style={{ transform: `translateX(${index * 100}%)` }}
        >
          <span key={index} className="block size-full rounded-full bg-ink shadow-[inset_0_1px_0_rgb(255_255_255/0.2)]" />
        </span>
        {tabs.map((t) => (
          <Link
            key={t.to}
            to={t.to}
            aria-current={t.active ? 'page' : undefined}
            onClick={(e) => {
              e.preventDefault();
              navigate(t.to, { replace: true });
            }}
            className="press relative z-10 flex h-12 flex-col items-center justify-center gap-0.5 rounded-full"
          >
            <t.icon key={t.active ? 'on' : 'off'} className={cx('size-[18px] transition-colors', t.active ? 'hop text-paper' : 'text-ink-2')} />
            <span className={cx('text-[10.5px] font-semibold transition-colors', t.active ? 'text-paper' : 'text-ink-3')}>{t.label}</span>
          </Link>
        ))}
      </div>
    </nav>
  );
}

export function Toasts() {
  const toasts = useToasts();
  return (
    <div aria-live="polite" className="safe-bottom pointer-events-none fixed inset-x-0 bottom-28 z-[60] flex flex-col items-center gap-2 px-4 lg:bottom-6">
      {toasts.map((t) => (
        <div
          key={t.id}
          role={t.tone === 'error' ? 'alert' : 'status'}
          className={cx(
            'toast-in pointer-events-auto max-w-md rounded-full px-5 py-3 text-[13px] font-semibold',
            t.tone === 'error' ? 'bg-danger text-white shadow-sheet' : 'glass glass-strong text-ink',
          )}
        >
          {t.message}
        </div>
      ))}
    </div>
  );
}

export class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error: unknown) {
    console.error(error);
  }
  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div className="mx-auto max-w-md space-y-4 px-6 py-24 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">That didn't work</h1>
        <p className="text-sm leading-relaxed text-ink-2">
          Something on this screen broke. Your files were never uploaded, so nothing has gone anywhere. Starting the screen again usually fixes it.
        </p>
        <div className="flex justify-center gap-2">
          <button className="h-11 rounded-full bg-ink px-6 text-sm font-semibold text-paper" onClick={() => this.setState({ failed: false })}>
            Try again
          </button>
          <button className="h-11 rounded-full border border-rule px-6 text-sm font-semibold" onClick={() => location.assign('/')}>
            Home
          </button>
        </div>
      </div>
    );
  }
}
