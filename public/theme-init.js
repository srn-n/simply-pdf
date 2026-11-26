// Sets the theme and motion before first paint so there is no flash. Mirrors src/lib/store.ts.
try {
  var s = JSON.parse(localStorage.getItem('simply-pdf:settings') || '{}');
  var legacy = { light: 'paper', dark: 'carbon', manila: 'paper' };
  var t = legacy[s.theme] || s.theme;
  if (['paper', 'legal', 'tracing', 'carbon', 'darkroom', 'slate'].indexOf(t) < 0) t = matchMedia('(prefers-color-scheme: dark)').matches ? 'carbon' : 'paper';
  var m = s.motion || 'full';
  if (m === 'full' && matchMedia('(prefers-reduced-motion: reduce)').matches) m = 'off';
  var r = document.documentElement;
  r.dataset.theme = t;
  r.dataset.scheme = t === 'carbon' || t === 'darkroom' || t === 'slate' ? 'dark' : 'light';
  r.dataset.motion = m;
  // Paint the theme colour before the stylesheet arrives, so the very first
  // frame is never the wrong colour. Same values as THEMES in src/lib/store.ts.
  var bg = { paper: '#f2efe8', legal: '#fbf3c4', tracing: '#edf1f3', carbon: '#0b0c12', darkroom: '#120c0c', slate: '#0f1714' }[t];
  r.style.backgroundColor = bg;
  var meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', bg);
} catch (e) {}
