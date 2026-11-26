# Simply PDF

Free PDF tools that run entirely on your device: merge, split, compress, organize, rotate, convert to and from images, text to PDF, sign, watermark, page numbers, extract text and clean metadata. Your files never leave your device.

Made by [Simply Made Studio](https://www.simplymadestudio.net). One codebase, two editions:

- **Website** (primary): runs in any modern browser, works offline after one visit, and can be installed as an app. Hosted on Vercel.
- **Android app**: the same web code inside a Capacitor shell, for Google Play (`net.simplymadestudio.simplypdf`).

## The four promises

| Promise | Website | Android app |
|---|---|---|
| **No accounts** | No sign-up or login code at all. Settings stay in your browser. | Same. Settings stay on the phone. |
| **No ads** | None, ever. | None, ever. |
| **No tracking** | No analytics, no cookies. The Content Security Policy only lets the page talk to itself. | No analytics, and no INTERNET permission: Android itself blocks all network use. |
| **No guesswork** | Real before-and-after sizes, clear messages, nothing that pretends to work. | Same. |

## Develop

```bash
npm ci
npm run dev            # website at http://localhost:3000
npm run check          # type-check + unit tests
npm run build          # website build (dist/) + security policy check
npm run preview        # serve the website build with the same headers as production
```

## Android app

```bash
npm run build:android  # the app's copy of the web build (dist-android/), copied into android/
npm run apk            # debug APK on a machine with the Android SDK
npm run cap:open       # open android/ in Android Studio
```

The code works out at runtime whether it's in the app or a browser (`isNative` in `src/lib/platform.ts`). The app saves to Documents › Simply PDF and uses Android's share sheet; the website downloads files and uses the browser's share sheet. `npm run build:android` keeps the app's own page policy and leaves out the website-only parts (service worker, install manifest, link-preview tags).

**Builds on GitHub:** Actions → **Android build** → Run workflow (or push a `v*` tag). The run's artifact `simply-pdf-android` holds a debug APK for testing on a phone, an **unsigned** release AAB, and `SHA256SUMS.txt`. Sign the AAB with the upload key on your own PC before uploading it to Google Play. The key is never stored in GitHub.

## Deploy the website

Vercel builds `main` automatically using `vercel.json` (build command, output folder, security headers, caching). Keep Vercel Web Analytics and Speed Insights switched off.

## For contributors and AI agents

Agents and contributors work from an `AGENTS.md` hand-off file (house rules, architecture, security model, release steps). It's kept on the owner's machine only and isn't part of this repository. Every change also gets a Markdown record in `docs/releases/` or `docs/changes/`.
