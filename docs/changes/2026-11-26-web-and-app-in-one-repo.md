# 2026-11-26: the website and the Android app in one repo, web first

## What changed and why

The owner deleted the old Android repo (`srn-n/Simply-PDF`) and asked for one clean project: the website as the primary edition, and the Android app built from the same code by a GitHub workflow. The app's screens, animations and behaviour had to stay exactly as they were.

- **One codebase.** `src/` is the Android app's latest code (including the launch-screen and status-bar fixes and the PDF to images and Organize fixes from 2026-11-23). Where the website said something different, the text or behaviour now picks the edition at runtime with `isNative` (`src/lib/platform.ts`):
  - save and share (Documents and the Android share sheet, or a browser download and the Web Share API),
  - wording on Privacy, Settings, Recent, the tool FAQs, the four promises and the large-file note,
  - the launch animation (once per launch in the app, once per browser tab on the web),
  - the last-resort error message, and the "too old to run" message in `public/compat.js`,
  - the service worker, registered on the website only.
- **Two builds.** `npm run build` makes the website (`dist/`). `npm run build:android` makes the app's copy (`dist-android/`) with the app's own page policy (`APP_POLICY` in `csp.config.ts`, unchanged), no service worker, and no website-only `<head>` tags or files, then runs `cap sync`.
- **One workflow.** `.github/workflows/android.yml` builds a debug APK and an unsigned release AAB, with checksums, as the artifact `simply-pdf-android`. It runs by hand or on a `v*` tag, never on ordinary pushes. The old CI workflow, the emulator device test and the branch-publishing steps are gone, to save Actions minutes.
- **Cleaned up:**
  - Testing scripts the owner no longer wants run: the Playwright smoke test, the output QA script, the emulator device test and its ANR dump script.
  - Generated Android build files.
  - The Play store screenshot script. Store assets now live in the release folder `SimplyPDFApp\store`.
- **Website changes from the merge** (small, from the app's fixes):
  - PDF to images: each image card shows its name and a Share button, and the duplicate file list is gone.
  - Organize: the per-page buttons now name their page for screen readers.
  - `theme-init.js` paints the theme colour before the stylesheet loads.

## How it was checked

- `npm run check`: 111 unit tests pass (the website's security tests plus the app's Android and theme-colour tests).
- `npm run build`: the CSP check passes.
- `npm run build:android`: the app's `index.html`, file list and stylesheet match the previous app build. The only differences are hashed file names, one extra loader chunk that Vite now splits out, and one CSS rule used only by the "too old" message.
- The debug APK and the release AAB build from `android/` (`./gradlew assembleDebug bundleRelease`).
- On a phone: by the owner.

## Files touched

All of them: this is a new repo. Main additions to the old website code: `android/`, `capacitor.config.ts`, `src/lib/native-theme.ts`, `APP_POLICY` in `csp.config.ts`, the `android` mode in `vite.config.ts`, `.github/workflows/android.yml`.

## Website, app or both?

Both. The app should look and behave exactly as before.
