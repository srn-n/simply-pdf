/**
 * The privacy promise, checked on every test run: the app has no code that
 * talks to other servers, the page policy (meta tag and Vercel header) allows
 * only the site itself, the offline copy only ever caches the app, and the
 * Android app has no permission to use the network at all.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { APP_POLICY, HEADER_POLICY, PAGE_POLICY } from '../csp.config';

const root = resolve(import.meta.dirname, '..');
const walk = (dir: string): string[] =>
  readdirSync(dir).flatMap((f) => (statSync(join(dir, f)).isDirectory() ? walk(join(dir, f)) : [join(dir, f)]));
const sources = walk(resolve(root, 'src')).filter((f) => /\.(tsx?|css)$/.test(f));
const read = (f: string) => readFileSync(f, 'utf8');

// The only outside addresses the app may mention are plain links a person can click.
const ALLOWED_URLS = [
  /^https:\/\/www\.simplymadestudio\.net$/,
  // The SVG XML namespace inside the inline paper-grain texture: an identifier, never fetched.
  /^http:\/\/www\.w3\.org\/2000\/svg$/,
];

describe('no network code', () => {
  it('never calls fetch, XHR, beacons, WebSockets or EventSource', () => {
    for (const f of sources) {
      const code = read(f);
      expect(code, f).not.toMatch(/\bfetch\s*\(/);
      expect(code, f).not.toMatch(/XMLHttpRequest|sendBeacon|new WebSocket|EventSource/);
    }
  });

  it('contains no analytics or ad scripts', () => {
    for (const f of sources) {
      expect(read(f), f).not.toMatch(/google-analytics|googletagmanager|gtag\(|plausible|posthog|mixpanel|segment\.com|hotjar|doubleclick|adsbygoogle/i);
    }
  });

  it('only mentions outside URLs that are plain links', () => {
    for (const f of sources) {
      for (const m of read(f).matchAll(/https?:\/\/[^\s'"`)<>]+/g)) {
        const url = m[0].replace(/[.,;]+$/, '');
        expect(ALLOWED_URLS.some((re) => re.test(url)), `${f}: ${url}`).toBe(true);
      }
    }
  });

  it('loads no fonts or styles from other servers', () => {
    const html = read(resolve(root, 'index.html'));
    expect(html).not.toMatch(/<link[^>]+href="https?:/);
    expect(html).not.toMatch(/<script[^>]+src="https?:/);
  });
});

describe('content security policy', () => {
  const vercel = JSON.parse(read(resolve(root, 'vercel.json')));
  const all = vercel.headers.find((h: { source: string }) => h.source === '/(.*)').headers as { key: string; value: string }[];
  const header = (k: string) => all.find((h) => h.key === k)?.value;

  it('lets the page load and contact only itself', () => {
    for (const d of ["default-src 'self'", "connect-src 'self' blob: data:", "object-src 'none'", "base-uri 'none'", "form-action 'none'"]) {
      expect(PAGE_POLICY.split('; ')).toContain(d);
    }
    expect(PAGE_POLICY).not.toMatch(/https?:|\*|'unsafe-inline'|'unsafe-eval'/);
  });

  it('forbids inline scripts and inline styles', () => {
    expect(PAGE_POLICY).toContain("script-src 'self' 'wasm-unsafe-eval'");
    expect(PAGE_POLICY).toContain("style-src 'self'");
    expect(read(resolve(root, 'index.html'))).not.toMatch(/<script>(?!\s*<\/script>)|<style|\sstyle=/);
  });

  it('sends the same policy from Vercel, plus frame and https rules', () => {
    expect(header('Content-Security-Policy')).toBe(HEADER_POLICY);
    expect(HEADER_POLICY.startsWith(PAGE_POLICY)).toBe(true);
    expect(HEADER_POLICY).toContain("frame-ancestors 'none'");
  });

  it('sends the other hardening headers', () => {
    expect(header('X-Content-Type-Options')).toBe('nosniff');
    expect(header('Referrer-Policy')).toBe('no-referrer');
    expect(header('X-Frame-Options')).toBe('DENY');
    expect(header('Strict-Transport-Security')).toMatch(/max-age=\d{8}/);
    expect(header('Permissions-Policy')).toMatch(/camera=\(\).*microphone=\(\).*geolocation=\(\)/);
  });
});

describe('offline copy (service worker)', () => {
  const sw = read(resolve(root, 'scripts/sw.template.js'));

  it('only handles requests to this site, never other servers', () => {
    expect(sw).toContain('if (url.origin !== self.location.origin) return;');
  });

  it('never caches anything but GET requests for the app itself', () => {
    expect(sw).toContain("if (req.method !== 'GET') return;");
    expect(sw).not.toMatch(/\bpost\b|IndexedDB|indexedDB/i);
  });

  it('is registered only in production builds', () => {
    expect(read(resolve(root, 'src/main.tsx'))).toMatch(/import\.meta\.env\.PROD && 'serviceWorker' in navigator/);
  });
});

describe('Android app', () => {
  const manifest = read(resolve(root, 'android/app/src/main/AndroidManifest.xml'));
  const permissions = [...manifest.matchAll(/<uses-permission[^>]*android:name="([^"]+)"[^>]*>/g)].map((m) => m[0]);

  it('has no INTERNET or network-state permission, so Android blocks all network use', () => {
    expect(manifest).not.toMatch(/android\.permission\.(INTERNET|ACCESS_NETWORK_STATE|ACCESS_WIFI_STATE)/);
  });

  it('asks for storage only on Android 10 and older, and nothing else', () => {
    for (const p of permissions) {
      expect(p).toMatch(/(WRITE|READ)_EXTERNAL_STORAGE/);
      expect(p).toContain('android:maxSdkVersion="29"');
    }
  });

  it('receives the Back button on Android 16 instead of letting the system close the app', () => {
    expect(manifest).toContain('android:enableOnBackInvokedCallback="false"');
  });

  it('keeps app data out of cloud backups', () => {
    expect(manifest).toContain('android:allowBackup="false"');
  });

  it("keeps the app's own page policy: only the app itself, nothing from other servers", () => {
    for (const d of ["default-src 'self'", "connect-src 'self' blob: data:", "object-src 'none'", "form-action 'none'"]) {
      expect(APP_POLICY.split('; ')).toContain(d);
    }
    expect(APP_POLICY).not.toMatch(/https?:|\*|'unsafe-eval'/);
  });

  it('never forces WebView remote debugging on (release builds keep it off), and blocks mixed content', () => {
    const cap = read(resolve(root, 'capacitor.config.ts'));
    expect(cap).not.toMatch(/webContentsDebuggingEnabled:\s*true/);
    expect(cap).toMatch(/allowMixedContent:\s*false/);
  });
});
