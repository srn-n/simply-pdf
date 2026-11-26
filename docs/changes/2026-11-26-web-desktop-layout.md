# 2026-11-26: a real website layout for desktops (website only)

## What changed and why

The owner asked for the website to look like a website, not a phone screen in the middle of a desktop browser. The Android app must not change.

- **The website has its own layout** (`src/web/WebLayout.tsx`). `App.tsx` uses it only when `import.meta.env.MODE !== 'android' && !isNative`. The MODE check is replaced at build time, so the Android build leaves the website layout out entirely, and the app renders exactly the layout it had.
- **Header** (from 1024 px): Tools, Recent, Privacy and Settings links, plus the theme button. Phone browsers keep the app's floating tab bar.
- **Home** (`src/web/WebHome.tsx`):
  - The hero is the headline "PDF tools that never upload your files." with the four promises as large struck-out words. Their red lines draw across once, one after another, on the first visit; with Motion off, or on a later visit, they're simply drawn. The large drop zone sits on the right.
  - Below the hero, all 13 tools appear in a grid by section, instead of one long list.
  - On a phone the order is: headline, drop zone, promises.
- **Tool pages** (`ToolPage` with `web`):
  - Desktop: a sticky list of every tool on the left, a larger title, and the steps and questions shown open below the tool.
  - Phone browsers: as before.
- **Footer** (desktop): studio credit, version, and the six themes as swatches.
- **Styles:** `.strike-word` was added at the end of `styles.css`, in a website-only section.

## How it was checked

- `npm run check`: 111 unit tests pass. `npm run build`: CSP check ok.
- Screenshots at 1440 × 900 (Paper and Carbon; home, Merge, Compress with a PDF open) and 390 × 844 (home, tool list).
- **The Android build is unchanged in effect.** Compared with the build from before this change:
  - `index.html` and the file list are identical.
  - All 752 existing CSS rules are unchanged. The only additions are utility classes the app never uses (Tailwind scans every source file).
  - The JS differs only in minified names, module order, and the unused `web` parameter on `ToolPage`.

## Files touched

- New: `src/web/WebLayout.tsx`, `src/web/WebHome.tsx`.
- `src/App.tsx`: the website/app switch, and `NotFound` exported.
- `src/pages/ToolPage.tsx`: the `web` variant (tool list and open help).
- `src/components/Shell.tsx`: `ThemeToggle` exported, no other change.
- `src/styles.css`: the website-only section at the end.

## Website, app or both?

Website only. The APK from **Android build** behaves and looks exactly as before.
