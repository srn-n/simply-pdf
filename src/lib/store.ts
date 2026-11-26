/**
 * Tiny external stores (no state library). Settings and the recent list live
 * in localStorage on this device only; every read and write is guarded so a
 * private window or full storage never breaks the app.
 */
import { useSyncExternalStore } from 'react';
import type { ToolId } from '../tools/registry';
import { paintSystemChrome } from './native-theme';

function createStore<T>(initial: T) {
  let value = initial;
  const listeners = new Set<() => void>();
  return {
    get: () => value,
    set(next: T | ((prev: T) => T)) {
      value = typeof next === 'function' ? (next as (p: T) => T)(value) : next;
      listeners.forEach((l) => l());
    },
    subscribe(l: () => void) {
      listeners.add(l);
      return () => listeners.delete(l);
    },
  };
}

function useStore<T>(store: ReturnType<typeof createStore<T>>): T {
  return useSyncExternalStore(store.subscribe, store.get, store.get);
}

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? { ...fallback, ...JSON.parse(raw) } : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown) {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage unavailable: settings simply won't persist */
  }
}

// ---------------------------------------------------------------------------
// Settings
// ---------------------------------------------------------------------------

/** Themes are named after real stationery, like the studio's other apps. */
export type ThemeName = 'paper' | 'legal' | 'tracing' | 'carbon' | 'darkroom' | 'slate';
export type ThemeChoice = 'system' | ThemeName;
export type MotionChoice = 'full' | 'gentle' | 'off';

export const THEMES: { id: ThemeName; name: string; scheme: 'light' | 'dark'; note: string; swatch: [string, string, string] }[] = [
  { id: 'paper', name: 'Paper', scheme: 'light', note: 'Warm sheet, highlighter', swatch: ['#f2efe8', '#15161a', '#e4f066'] },
  { id: 'legal', name: 'Legal Pad', scheme: 'light', note: 'Yellow pad, red margin', swatch: ['#fbf3c4', '#1d2433', '#c8322b'] },
  { id: 'tracing', name: 'Tracing Paper', scheme: 'light', note: 'Cool, frosted, see-through', swatch: ['#edf1f3', '#172028', '#2b55d1'] },
  { id: 'carbon', name: 'Carbon', scheme: 'dark', note: 'Carbon copy, after hours', swatch: ['#0b0c12', '#eceef4', '#9aa5ff'] },
  { id: 'darkroom', name: 'Darkroom', scheme: 'dark', note: 'Red safelight, amber prints', swatch: ['#120c0c', '#f1e6e1', '#ff5a4e'] },
  { id: 'slate', name: 'Slate', scheme: 'dark', note: 'Chalkboard, chalk marks', swatch: ['#0f1714', '#e8efe9', '#7fe0b0'] },
];

export interface Settings {
  theme: ThemeChoice;
  motion: MotionChoice;
  rememberRecent: boolean;
}

const SETTINGS_KEY = 'simply-pdf:settings';

function readSettings(): Settings {
  const s = read<Settings & { theme: string }>(SETTINGS_KEY, { theme: 'system', motion: 'full', rememberRecent: true });
  // Older versions stored 'light' and 'dark'.
  const legacy: Record<string, ThemeChoice> = { light: 'paper', dark: 'carbon', manila: 'paper' };
  const theme = (legacy[s.theme] ?? s.theme) as ThemeChoice;
  const valid = theme === 'system' || THEMES.some((t) => t.id === theme);
  const motion = ['full', 'gentle', 'off'].includes(s.motion) ? s.motion : 'full';
  return { theme: valid ? theme : 'system', motion, rememberRecent: s.rememberRecent !== false };
}

const settingsStore = createStore<Settings>(readSettings());

export const useSettings = () => useStore(settingsStore);

export function updateSettings(patch: Partial<Settings>) {
  settingsStore.set((s) => ({ ...s, ...patch }));
  write(SETTINGS_KEY, settingsStore.get());
  applyTheme();
  if (patch.rememberRecent === false) clearRecent();
}

const darkQuery = typeof window !== 'undefined' ? window.matchMedia('(prefers-color-scheme: dark)') : null;
const reduceQuery = typeof window !== 'undefined' ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;

export function resolvedTheme(): ThemeName {
  const t = settingsStore.get().theme;
  return t === 'system' ? (darkQuery?.matches ? 'carbon' : 'paper') : t;
}

/** Off when chosen, or when the phone asks for reduced motion and nothing else was picked. */
export function resolvedMotion(): MotionChoice {
  const m = settingsStore.get().motion;
  return m === 'full' && reduceQuery?.matches ? 'off' : m;
}

export function applyTheme() {
  const theme = THEMES.find((t) => t.id === resolvedTheme())!;
  const root = document.documentElement;
  root.dataset.theme = theme.id;
  root.dataset.scheme = theme.scheme;
  root.dataset.motion = resolvedMotion();
  // Paint the page itself at once, before the stylesheet has loaded.
  root.style.backgroundColor = theme.swatch[0];
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme.swatch[0]);
  // And the parts Android draws: window, status bar, navigation bar, launch screen.
  paintSystemChrome(theme.swatch[0], theme.scheme === 'dark', settingsStore.get().theme);
}

darkQuery?.addEventListener('change', () => settingsStore.get().theme === 'system' && applyTheme());
reduceQuery?.addEventListener('change', applyTheme);

// ---------------------------------------------------------------------------
// Recent activity: names and sizes only, never file contents
// ---------------------------------------------------------------------------

export interface RecentItem {
  id: string;
  tool: ToolId;
  name: string;
  size: number;
  detail?: string;
  at: number;
}

const RECENT_KEY = 'simply-pdf:recent';
const MAX_RECENT = 30;

function readRecent(): RecentItem[] {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

const recentStore = createStore<RecentItem[]>(readRecent());
export const useRecent = () => useStore(recentStore);

export function addRecent(item: Omit<RecentItem, 'id' | 'at'>) {
  if (!settingsStore.get().rememberRecent) return;
  const entry: RecentItem = { ...item, id: `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`, at: Date.now() };
  recentStore.set((list) => [entry, ...list].slice(0, MAX_RECENT));
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify(recentStore.get()));
  } catch {
    /* ignore */
  }
}

export function removeRecent(id: string) {
  recentStore.set((list) => list.filter((i) => i.id !== id));
  write(RECENT_KEY, recentStore.get());
}

export function clearRecent() {
  recentStore.set([]);
  write(RECENT_KEY, null);
}

// ---------------------------------------------------------------------------
// Toasts
// ---------------------------------------------------------------------------

export interface Toast {
  id: number;
  message: string;
  tone: 'ok' | 'error';
}

const toastStore = createStore<Toast[]>([]);
export const useToasts = () => useStore(toastStore);
let toastId = 0;

export function toast(message: string, tone: Toast['tone'] = 'ok') {
  if (!message) return;
  const id = ++toastId;
  toastStore.set((t) => [...t.slice(-2), { id, message, tone }]);
  setTimeout(() => toastStore.set((t) => t.filter((x) => x.id !== id)), tone === 'error' ? 6000 : 3200);
}

// ---------------------------------------------------------------------------
// Hand-off: carry files from one screen to the next tool
// ---------------------------------------------------------------------------

let pending: File[] | null = null;

export function handOff(files: File[]) {
  pending = files;
}

export function takeHandOff(): File[] | null {
  const files = pending;
  pending = null;
  return files;
}
