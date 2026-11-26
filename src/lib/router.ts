/**
 * A very small History-API router. Each screen has its own path (/merge-pdf),
 * so Android's Back button, the browser's Back button and the in-app back
 * arrow all walk through history.
 */
import { useSyncExternalStore } from 'react';
import { TOOL_BY_SLUG, type Tool } from '../tools/registry';

export type Route =
  | { name: 'home' }
  | { name: 'tool'; tool: Tool }
  | { name: 'recent' }
  | { name: 'settings' }
  | { name: 'privacy' }
  | { name: 'not-found' };

const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());

// How many screens deep we are, so Back never leaves the app by surprise.
let depth = 0;

/** How the current screen was reached. Back ('pop') shows the previous screen
 *  as it was, instantly and at its old scroll position, like a native app;
 *  only going forward plays the entrance animation. */
export type NavKind = 'push' | 'replace' | 'pop';
let lastNav: NavKind = 'push';
export const navKind = (): NavKind => lastNav;

// Scroll position per history entry, restored on Back.
const scrolls = new Map<string, number>();
let entryKey = '';
function keyOf(state: unknown): string {
  return (state as { k?: string } | null)?.k ?? 'root';
}
function saveScroll() {
  scrolls.set(entryKey || keyOf(history.state), window.scrollY);
}
export function savedScroll(): number {
  return scrolls.get(entryKey) ?? 0;
}

const ALIVE_KEY = 'simplypdf.alive';

/** Notes the last moment the app was in use (see Splash: a restart moments
 *  later, e.g. after Android recovered the WebView, or a reload or restored
 *  tab on the web, skips the launch screen). */
export function markAlive() {
  try {
    localStorage.setItem(ALIVE_KEY, String(Date.now()));
  } catch {
    /* storage unavailable: the launch screen simply plays */
  }
}

export function aliveRecently(ms: number): boolean {
  try {
    const t = Number(localStorage.getItem(ALIVE_KEY));
    return t > 0 && Date.now() - t < ms;
  } catch {
    return false;
  }
}

if (typeof window !== 'undefined') {
  // We restore scroll ourselves, after the previous screen has rendered.
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  entryKey = keyOf(history.state);
  window.addEventListener('popstate', (e) => {
    saveScroll();
    depth = Math.max(0, depth - 1);
    lastNav = 'pop';
    entryKey = keyOf(e.state);
    notify();
    markAlive();
  });
}

function currentPath(): string {
  const base = import.meta.env.BASE_URL.replace(/\/$/, '');
  let p = window.location.pathname;
  if (base && p.startsWith(base)) p = p.slice(base.length);
  return p.replace(/\/index\.html$/, '/').replace(/\/+$/, '') || '/';
}

export function parse(path: string): Route {
  const slug = path.replace(/^\/+/, '');
  if (slug === '') return { name: 'home' };
  if (slug === 'recent') return { name: 'recent' };
  if (slug === 'settings') return { name: 'settings' };
  if (slug === 'privacy') return { name: 'privacy' };
  const tool = TOOL_BY_SLUG[slug];
  return tool ? { name: 'tool', tool } : { name: 'not-found' };
}

let cachedPath = '';
let cachedRoute: Route = { name: 'home' };

function snapshot(): Route {
  const p = currentPath();
  if (p !== cachedPath) {
    cachedPath = p;
    cachedRoute = parse(p);
  }
  return cachedRoute;
}

export function useRoute(): Route {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    snapshot,
    snapshot,
  );
}

export function href(path: string): string {
  return `${import.meta.env.BASE_URL.replace(/\/$/, '')}${path}`;
}

export function navigate(path: string, opts: { replace?: boolean; back?: boolean } = {}) {
  const url = href(path);
  if (url === window.location.pathname) return;
  saveScroll();
  const k = Math.random().toString(36).slice(2, 10);
  if (opts.replace) {
    scrolls.delete(entryKey);
    history.replaceState({ k }, '', url);
    lastNav = opts.back ? 'pop' : 'replace';
  } else {
    history.pushState({ k }, '', url);
    depth++;
    lastNav = 'push';
  }
  entryKey = k;
  notify();
  markAlive();
  if (!opts.back) window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
}

/** After the app restarts itself on home, Back should leave from there. */
export function resetDepth() {
  depth = 0;
}

export function canGoBack(): boolean {
  return depth > 0;
}

export function goBack(fallback = '/') {
  if (depth > 0) history.back();
  else navigate(fallback, { replace: true, back: true });
}
