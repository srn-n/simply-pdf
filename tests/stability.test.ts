/**
 * Edge cases that used to crash or misbehave on phones and in browsers: odd input values,
 * signatures copied onto pages of another shape, locked files and file names
 * Android refuses.
 */
import { PDFDocument, PDFName } from 'pdf-lib';
import { describe, expect, it } from 'vitest';
import { PdfError, addPageNumbers, imagesToPdf, loadPdf, stampImage, watermarkPdf } from '../src/lib/pdf/engine';
import { safeFileName } from '../src/lib/format';
import { makePdf, open, TINY_PNG } from './helpers';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

/** A PDF that claims to be encrypted, like one with an owner password. */
async function lockedPdf() {
  const doc = await PDFDocument.load(await makePdf(1));
  doc.context.trailerInfo.Encrypt = doc.context.obj({ Filter: 'Standard', V: 1, R: 2, O: '', U: '', P: -4 });
  return doc.save({ useObjectStreams: false });
}

describe('locked PDFs', () => {
  it('explains the lock instead of producing a broken file', async () => {
    const bytes = await lockedPdf();
    const err = await loadPdf(bytes, 'contract.pdf').catch((e) => e);
    expect(err).toBeInstanceOf(PdfError);
    expect(err.message).toMatch(/contract\.pdf is locked/);
    expect(err.message).toMatch(/PDF to images/);
  });
});

describe('signature placement stays on the page', () => {
  it('pulls a box that hangs off the bottom back onto the page', async () => {
    const out = await stampImage(await makePdf(1), TINY_PNG, [{ page: 0, x: 0.9, y: 0.98, width: 0.5 }]);
    const doc = await open(out);
    expect(doc.getPageCount()).toBe(1);
  });

  it('copies a portrait placement onto a landscape page without failing', async () => {
    const a4 = await makePdf(1);
    const wide = await makePdf(1, { size: [842, 200] });
    const merged = await PDFDocument.create();
    for (const src of [a4, wide]) {
      const d = await PDFDocument.load(src);
      const [p] = await merged.copyPages(d, [0]);
      merged.addPage(p);
    }
    const bytes = await merged.save();
    const tall = 0.9; // a square stamp 90% of the page width is far taller than a 200pt page
    const out = await stampImage(bytes, TINY_PNG, [
      { page: 0, x: 0.05, y: 0.05, width: tall },
      { page: 1, x: 0.05, y: 0.05, width: tall },
    ]);
    expect((await open(out)).getPageCount()).toBe(2);
  });

  it('rejects a page that does not exist', async () => {
    await expect(stampImage(await makePdf(1), TINY_PNG, [{ page: 4, x: 0, y: 0, width: 0.2 }])).rejects.toThrow(/Page 5 does not exist/);
  });
});

describe('out-of-range options are clamped, not obeyed', () => {
  it('a 1pt tiled watermark finishes quickly instead of drawing thousands of copies', async () => {
    const start = Date.now();
    const { bytes } = await watermarkPdf(await makePdf(1), { text: 'X', opacity: 0.2, size: 1, angle: 0, color: '#000', layout: 'tile' });
    expect(Date.now() - start).toBeLessThan(4000);
    expect(bytes.length).toBeLessThan(400_000);
  });

  it('page numbers survive a zero or negative size and margin', async () => {
    const out = await addPageNumbers(await makePdf(2), {
      position: 'bottom-centre',
      format: '{n}',
      startAt: 1.7,
      skipFirst: false,
      size: 0,
      margin: -20,
      color: '#000',
    });
    expect((await open(out)).getPageCount()).toBe(2);
  });

  it('a margin bigger than the page still leaves room for the image', async () => {
    const out = await imagesToPdf([{ bytes: TINY_PNG, format: 'png', width: 1, height: 1 }], { pageSize: 'a4', orientation: 'auto', margin: 5000 });
    const doc = await open(out);
    expect(doc.getPageCount()).toBe(1);
    expect(doc.catalog.has(PDFName.of('Pages'))).toBe(true);
  });
});

describe('safeFileName', () => {
  it('replaces characters Android and share targets refuse', () => {
    expect(safeFileName('a/b:c*d?"e<f>g|h.pdf')).toBe('a-b-c-d-e-f-g-h.pdf');
  });

  it('keeps the extension when shortening a very long name', () => {
    const name = safeFileName(`${'pages 1-2, '.repeat(40)}.pdf`);
    expect(name.endsWith('.pdf')).toBe(true);
    expect(name.length).toBeLessThanOrEqual(130);
  });

  it('never returns an empty or hidden name', () => {
    expect(safeFileName('...')).toBe('document.pdf');
    expect(safeFileName('.pdf', 'x.pdf')).toBe('x.pdf');
    expect(safeFileName('  .hidden report.pdf')).toBe('hidden report.pdf');
  });

  it('leaves ordinary names alone', () => {
    expect(safeFileName('Invoice (merged).pdf')).toBe('Invoice (merged).pdf');
    expect(safeFileName('Scan 01.jpg')).toBe('Scan 01.jpg');
  });
});

describe('effects never return a value by accident', () => {
  // Whatever an effect returns, React calls as its clean-up when the screen
  // closes. `useEffect(() => window.scrollTo(0, 0))` returned a Promise on
  // current Chrome/WebView, so leaving any tool blanked and crashed the app.
  // Effects must use a block body.
  it('no expression-bodied useEffect / useLayoutEffect in src', () => {
    const offenders: string[] = [];
    const walk = (dir: string) => {
      for (const name of readdirSync(dir)) {
        const path = join(dir, name);
        if (statSync(path).isDirectory()) walk(path);
        else if (/\.(tsx?|jsx?)$/.test(name)) {
          readFileSync(path, 'utf8')
            .split('\n')
            .forEach((line, i) => {
              if (/use(Layout)?Effect\(\s*(async\s*)?\(\)\s*=>\s*[^{\s]/.test(line)) offenders.push(`${path}:${i + 1}`);
            });
        }
      }
    };
    walk(join(__dirname, '..', 'src'));
    expect(offenders).toEqual([]);
  });
});

describe('theme colours agree everywhere Android or the page paints before React', () => {
  // The launch screen, window, status bar and the pre-stylesheet page paint
  // all use the theme background. If one copy drifts, a wrong-coloured frame
  // flashes at launch (the "black screen before the animation" bug).
  const root = join(__dirname, '..');
  const res = join(root, 'android/app/src/main/res');
  const css = readFileSync(join(root, 'src/styles.css'), 'utf8');
  const init = readFileSync(join(root, 'public/theme-init.js'), 'utf8');
  const splash = readFileSync(join(res, 'values-v33/splash_themes.xml'), 'utf8');

  it('styles.css, THEMES, theme-init.js and the Android launch themes all match', async () => {
    const { THEMES } = await import('../src/lib/store');
    for (const t of THEMES) {
      const bg = t.swatch[0].toLowerCase();
      const block = css.match(new RegExp(`\\[data-theme='${t.id}'\\]\\s*\\{[^}]*--paper:\\s*(#[0-9a-f]{6})`, 'i'));
      expect(block?.[1].toLowerCase(), `${t.id} in styles.css`).toBe(bg);
      expect(init, `${t.id} in theme-init.js`).toContain(`${t.id}: '${bg}'`);
      const xml = splash.match(new RegExp(`SplashTheme\\.${t.id}"[^>]*>\\s*<item name="android:windowSplashScreenBackground">(#[0-9A-F]{6})`, 'i'));
      expect(xml?.[1].toLowerCase(), `${t.id} launch theme`).toBe(bg);
    }
  });

  it('the default (no theme saved yet) is Paper on light phones and Carbon on dark ones', () => {
    expect(readFileSync(join(res, 'values/launch.xml'), 'utf8')).toMatch(/launch_bg">#F2EFE8</i);
    expect(readFileSync(join(res, 'values-night/launch.xml'), 'utf8')).toMatch(/launch_bg">#0B0C12</i);
    const java = readFileSync(join(root, 'android/app/src/main/java/net/simplymadestudio/simplypdf/MainActivity.java'), 'utf8');
    expect(java).toContain('phoneDark ? 0xFF0B0C12 : 0xFFF2EFE8');
  });

  it('the native AppTheme plugin is registered and matches the web side', () => {
    const java = readFileSync(join(root, 'android/app/src/main/java/net/simplymadestudio/simplypdf/MainActivity.java'), 'utf8');
    const plugin = readFileSync(join(root, 'android/app/src/main/java/net/simplymadestudio/simplypdf/AppThemePlugin.java'), 'utf8');
    const ts = readFileSync(join(root, 'src/lib/native-theme.ts'), 'utf8');
    expect(java).toMatch(/registerPlugin\(AppThemePlugin\.class\);\s*[\s\S]*super\.onCreate/);
    expect(java).toMatch(/installSplashScreen\(this\)[\s\S]*super\.onCreate/);
    expect(plugin).toContain('@CapacitorPlugin(name = "AppTheme")');
    expect(ts).toContain("registerPlugin<AppThemePlugin>('AppTheme')");
    for (const m of ['apply', 'ready']) expect(plugin).toMatch(new RegExp(`public void ${m}\\(PluginCall call\\)`));
  });
});
