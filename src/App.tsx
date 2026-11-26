import { Suspense, lazy, useEffect, useLayoutEffect, useState } from 'react';
import { navKind, savedScroll, useRoute, type Route } from './lib/router';
import { APP } from './tools/registry';
import { ErrorBoundary, Link, TabBar, Toasts, TopBar } from './components/Shell';
import { Splash, shouldShowSplash } from './components/Splash';
import { signalFirstFrame } from './lib/native-theme';
import Home from './pages/Home';
import ToolPage from './pages/ToolPage';

const loadRecent = () => import('./pages/Recent');
const loadSettings = () => import('./pages/Settings');
const loadPrivacy = () => import('./pages/Privacy');
const Recent = lazy(loadRecent);
const Settings = lazy(loadSettings);
const Privacy = lazy(loadPrivacy);

// Fetch the other tabs' code once the app is idle, so switching to them never
// shows an empty frame while it loads.
if (typeof window !== 'undefined') {
  const warm = () => void Promise.all([loadRecent(), loadSettings(), loadPrivacy()]).catch(() => {});
  if ('requestIdleCallback' in window) requestIdleCallback(warm, { timeout: 4000 });
  else setTimeout(warm, 2500);
}

function titleFor(route: Route): string {
  switch (route.name) {
    case 'tool':
      return `${route.tool.name} | ${APP.name}`;
    case 'recent':
      return `Recent | ${APP.name}`;
    case 'settings':
      return `Settings | ${APP.name}`;
    case 'privacy':
      return `Privacy | ${APP.name}`;
    default:
      return APP.name;
  }
}

export default function App() {
  const route = useRoute();
  const [splash, setSplash] = useState(shouldShowSplash);

  // First render is on screen (the launch animation or home): let Android drop
  // its launch screen now, so there's never a blank or black frame between the
  // two. A timer, not requestAnimationFrame: while Android holds its launch
  // screen the WebView may not be producing frames at all.
  useEffect(() => {
    const t = window.setTimeout(signalFirstFrame, 60);
    return () => window.clearTimeout(t);
  }, []);

  useEffect(() => {
    document.title = titleFor(route);
  }, [route]);

  const showTabs = route.name === 'home' || route.name === 'recent' || route.name === 'settings';

  const screen = route.name === 'tool' ? route.tool.id : route.name;
  // Back returns to the previous screen as it was: no entrance animation, and
  // the same scroll position, set before the first paint so nothing jumps.
  const back = navKind() === 'pop';
  useLayoutEffect(() => {
    if (back) window.scrollTo(0, savedScroll());
  }, [screen, back]);

  return (
    <>
      {/* Ink blots behind everything, so the glass has colour to bend. */}
      <div className="ambient" aria-hidden>
        <i />
        <i />
        <i />
      </div>
      <TopBar route={route} />
      <main id="main" key={screen} className={`${back ? '' : 'enter '}relative min-h-[70vh]`}>
        <ErrorBoundary key={screen}>
          <Suspense fallback={<div className="min-h-[60vh]" />}>
            {route.name === 'home' && <Home />}
            {route.name === 'tool' && <ToolPage tool={route.tool} />}
            {route.name === 'recent' && <Recent />}
            {route.name === 'settings' && <Settings />}
            {route.name === 'privacy' && <Privacy />}
            {route.name === 'not-found' && <NotFound />}
          </Suspense>
        </ErrorBoundary>
      </main>
      <TabBar route={route} hidden={!showTabs} />
      <Toasts />
      {splash && <Splash onDone={() => setSplash(false)} />}
    </>
  );
}

function NotFound() {
  return (
    <div className="mx-auto max-w-md space-y-4 px-6 py-24 text-center">
      <h1 className="text-3xl font-semibold tracking-tight">This screen isn't here</h1>
      <p className="text-ink-2">Every tool is on the home screen.</p>
      <Link to="/" className="inline-flex h-11 items-center rounded-full bg-ink px-6 text-sm font-semibold text-paper">
        See all tools
      </Link>
    </div>
  );
}
