import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource-variable/hanken-grotesk';
import '@fontsource/martian-mono/400.css';
import '@fontsource/martian-mono/500.css';
import '@fontsource/caveat/600.css';
import './styles.css';
import App from './App';
import { applyTheme } from './lib/store';
import { canGoBack, goBack, resetDepth } from './lib/router';
import { isNative } from './lib/platform';

applyTheme();

// public/compat.js has already explained the problem on browsers and WebViews too old to run the app.
if (!(window as unknown as { __simplyPdfUnsupported?: boolean }).__simplyPdfUnsupported) mount();

/**
 * React removes the whole app when an error escapes every error boundary,
 * which leaves a blank screen. That can happen while a screen is being torn
 * down (Back to home), because the screen's own boundary is torn down with
 * it. Never leave the person staring at nothing: start the app again on the
 * home screen. If it keeps failing straight away, stop and say so instead of
 * looping.
 */
function mount() {
  const container = document.getElementById('root')!;
  const failures: number[] = [];
  let generation = 0;
  const root = createRoot(container, {
    onUncaughtError(error) {
      console.error('Simply PDF recovered from an error:', error);
      const now = Date.now();
      failures.push(now);
      while (failures.length && now - failures[0] > 10_000) failures.shift();
      if (failures.length > 3) {
        showFatal(container);
        return;
      }
      // Land on home, outside whatever screen broke, then draw a fresh app.
      if (location.pathname !== '/') history.replaceState(null, '', '/');
      resetDepth();
      queueMicrotask(() => render(++generation));
    },
  });
  const render = (key: number) =>
    root.render(
      <StrictMode>
        <App key={key} />
      </StrictMode>,
    );
  render(generation);
}

/** The last-resort message when the app keeps failing. */
function showFatal(container: HTMLElement) {
  if (isNative) {
    // The Android app's page policy allows these inline styles.
    container.innerHTML =
      '<div style="padding:96px 24px;text-align:center;font:16px/1.5 system-ui,sans-serif">' +
      '<p style="font-weight:600">Simply PDF hit a problem it could not recover from.</p>' +
      '<p>Close the app and open it again. Nothing was uploaded.</p></div>';
    return;
  }
  // The website's policy forbids inline styles: DOM methods and a stylesheet class.
  const box = document.createElement('div');
  box.className = 'fallback-msg';
  const h = document.createElement('h1');
  h.textContent = 'Simply PDF hit a problem it could not recover from.';
  const p = document.createElement('p');
  p.textContent = 'Reload the page to start again. Nothing was uploaded.';
  box.append(h, p);
  container.replaceChildren(box);
}

// Dropping a file anywhere outside a drop zone must never make the browser or WebView
// navigate away to it and lose the work on screen.
for (const type of ['dragover', 'drop'] as const) {
  window.addEventListener(type, (e) => {
    if (!(e.target as HTMLElement | null)?.closest?.('[data-dropzone]')) e.preventDefault();
  });
}

if (isNative) {
  // Android's back button closes a dialog first, then walks back through the
  // app, then leaves it from the home screen.
  import('@capacitor/app').then(({ App: CapApp }) => {
    CapApp.addListener('backButton', () => {
      if (document.querySelector('.splash')) {
        window.dispatchEvent(new Event('splash-skip'));
      } else if (document.querySelector('[role="dialog"]')) {
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
      } else if (canGoBack()) {
        goBack();
      } else if (location.pathname !== '/') {
        goBack('/');
      } else {
        CapApp.exitApp();
      }
    });
  });
}

// Website only. Offline support: the service worker (built by vite.config.ts)
// keeps a copy of the app so it opens and works with no connection. It only
// ever caches the app's own files; documents never pass through it. The
// Android app already has every file on the phone and has no service worker.
if (import.meta.env.PROD && 'serviceWorker' in navigator && !isNative) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(() => {
      /* private mode or blocked: the app still works online */
    });
  });
}
