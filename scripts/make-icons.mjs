// Renders every icon from SVG/HTML using Chromium: the website's (favicon,
// install icons for phones and computers, Apple touch icon, social-share
// image) and the Android app's launcher icons.
// Run: npm run icons   (needs: npm install --no-save playwright)
import { createRequire } from 'node:module';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const root = resolve(import.meta.dirname, '..');
const pub = resolve(root, 'public');
const fontCss = (pkg, file) => readFileSync(resolve(root, 'node_modules', pkg, file)).toString('base64');

// The Simply PDF mark: a tilted sheet whose two lines are the studio's two
// offset capsules. The highlighter capsule breaks out past the paper's edge.
// Drawn on the 108-unit adaptive-icon canvas; the art stays inside the 66-unit
// safe zone so no launcher mask clips it.
const markArt = ({ sheet = '#f2efe8', ink = '#15161a', hl = '#e4f066' } = {}) => `
  <g transform="translate(54 54) scale(0.9) translate(-54 -54) rotate(-8 54 54)">
    <rect x="31" y="19" width="48" height="68" rx="10" fill="${sheet}"/>
    <rect x="41" y="34" width="28" height="11" rx="5.5" fill="${ink}"/>
    <rect x="23" y="55" width="40" height="12.5" rx="6.25" fill="#000" opacity=".16"/>
    <rect x="21" y="52.5" width="40" height="12.5" rx="6.25" fill="${hl}"/>
  </g>`;

const mark = (size, { bg = '#15161a', radius = 0.22, full = false } = {}) => `
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="${full ? '0 0 108 108' : '13 13 82 82'}">
  ${bg === 'transparent' ? '' : `<rect x="${full ? 0 : 13}" y="${full ? 0 : 13}" width="${full ? 108 : 82}" height="${full ? 108 : 82}" rx="${(full ? 108 : 82) * radius}" fill="${bg}"/>`}
  ${markArt()}
</svg>`;

const og = () => {
  const hanken = fontCss('@fontsource-variable/hanken-grotesk', 'files/hanken-grotesk-latin-wght-normal.woff2');
  const mono = fontCss('@fontsource/martian-mono', 'files/martian-mono-latin-400-normal.woff2');
  return `<!doctype html><html><head><style>
  @font-face{font-family:H;src:url(data:font/woff2;base64,${hanken}) format('woff2');font-weight:100 900}
  @font-face{font-family:M;src:url(data:font/woff2;base64,${mono}) format('woff2')}
  *{margin:0;box-sizing:border-box}
  body{width:1200px;height:630px;background:#f2efe8;color:#15161a;font-family:H;padding:72px 80px;position:relative;overflow:hidden}
  .eyebrow{font-family:M;font-size:20px;letter-spacing:.08em;text-transform:uppercase;color:#7d7f87;display:flex;gap:14px;align-items:center}
  h1{font-size:84px;line-height:1;letter-spacing:-.035em;font-weight:620;margin-top:44px;max-width:820px}
  .m{background:linear-gradient(104deg,transparent .4em,#e4f066 .5em,#e4f066 calc(100% - .3em),transparent calc(100% - .2em));background-size:100% .62em;background-position:0 88%;background-repeat:no-repeat}
  .row{position:absolute;left:80px;bottom:64px;font-family:M;font-size:20px;color:#4b4d55;display:flex;gap:36px}
  .row b{color:#15161a;font-weight:400}
  .sheet{position:absolute;right:-40px;top:120px;width:330px;height:430px;background:#fbfaf6;border:2px solid #dbd6ca;border-radius:10px;transform:rotate(6deg);box-shadow:0 30px 60px -30px rgba(21,22,26,.35)}
  .sheet.b{right:40px;top:150px;transform:rotate(-4deg)}
  .line{height:12px;border-radius:6px;background:#e8e4da;margin:0 34px 18px}
  .hl{background:#e4f066}
  .stamp{position:absolute;right:120px;bottom:120px;font-family:M;font-size:26px;letter-spacing:.12em;color:#0b4a40;border:3px solid #0b4a40;border-radius:8px;padding:8px 16px;transform:rotate(-8deg)}
  </style></head><body>
  <div class="sheet"></div>
  <div class="sheet b"><div style="height:54px"></div>${'<div class="line"></div>'.repeat(3)}<div class="line hl" style="width:60%"></div>${'<div class="line"></div>'.repeat(5)}<div class="line" style="width:40%"></div></div>
  <div class="stamp">DONE</div>
  <div class="eyebrow">${mark(44, { radius: 0.24 })}<span>Simply PDF</span></div>
  <h1>PDF tools that <span class="m">never</span> upload your files.</h1>
  <div class="row"><span><b>0</b> accounts</span><span><b>0</b> ads</span><span><b>0</b> tracking</span><span><b>0</b> guesswork</span></div>
  </body></html>`;
};

const browser = await chromium.launch();
const page = await browser.newPage({ deviceScaleFactor: 1 });

async function png(out, html, w, h) {
  mkdirSync(dirname(out), { recursive: true });
  await page.setViewportSize({ width: w, height: h });
  await page.setContent(`<style>*{margin:0}body{width:${w}px;height:${h}px;overflow:hidden;background:transparent}</style>${html}`);
  await page.screenshot({ path: out, omitBackground: true, clip: { x: 0, y: 0, width: w, height: h } });
  console.log('wrote', out.replace(root + '/', ''));
}

// The favicon (browser tabs).
writeFileSync(resolve(pub, 'favicon.svg'), mark(64).trim() + '\n');
console.log('wrote public/favicon.svg');

// Install icons (manifest.webmanifest). "any": the rounded mark; "maskable":
// full-bleed background with the art inside the safe zone, so Android's
// circle/squircle masks never clip it. Apple ignores transparency and rounds
// the corners itself, so its icon is a plain square.
await png(resolve(pub, 'icons/icon-192.png'), mark(192, { radius: 0.22 }), 192, 192);
await png(resolve(pub, 'icons/icon-512.png'), mark(512, { radius: 0.22 }), 512, 512);
await png(resolve(pub, 'icons/maskable-512.png'), mark(512, { full: true, radius: 0 }), 512, 512);
await png(resolve(pub, 'icons/apple-touch-icon.png'), mark(180, { radius: 0 }), 180, 180);

// Link previews (Open Graph / Twitter): 1200 × 630.
{
  const ctx = await browser.newContext({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  await p.setContent(og());
  await p.waitForTimeout(150);
  await p.screenshot({ path: resolve(pub, 'og-image.png') });
  await ctx.close();
  console.log('wrote public/og-image.png');
}

// Android launcher icons, if the Capacitor project exists.
const res = resolve(root, 'android/app/src/main/res');
if (existsSync(res)) {
  const densities = { mdpi: 1, hdpi: 1.5, xhdpi: 2, xxhdpi: 3, xxxhdpi: 4 };
  for (const [d, k] of Object.entries(densities)) {
    const legacy = Math.round(48 * k);
    const fg = Math.round(108 * k);
    await png(resolve(res, `mipmap-${d}/ic_launcher.png`), mark(legacy, { radius: 0.2 }), legacy, legacy);
    await png(resolve(res, `mipmap-${d}/ic_launcher_round.png`), mark(legacy, { radius: 0.5 }), legacy, legacy);
    // Adaptive foreground: the sheet inside the 66dp safe zone, on a transparent canvas.
    await png(resolve(res, `mipmap-${d}/ic_launcher_foreground.png`), mark(fg, { bg: 'transparent', full: true }), fg, fg);
  }
}

await browser.close();
