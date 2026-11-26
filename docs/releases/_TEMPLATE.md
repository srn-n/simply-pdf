# Simply PDF <version>

- Date: YYYY-MM-DD
- Previous version: <x.y.z>

## Earlier releases (one line each, newest first)

- <x.y.z>: <one-line summary>
- 1.0.0: First release. Website: 13 tools in the browser, offline PWA, strict CSP and Vercel headers. Android app (versionCode 1): the same tools, launch screen and status bar in the app theme.

## What changed and why

- <change>: <why, in a sentence>

## How it was checked

- `npm run check`: <n> unit tests pass
- `npm run build`: CSP check ok; `npm run build:android`: ok
- Samiur, on his phone: <website and/or APK, what was looked at>

## Files touched

- `<path>`: <what>

## Website, app or both?

<Which edition this changes. Android: did versionCode go up (+1) in android/app/build.gradle?>

## Commands for Samiur

```
git add -A
git commit -m "Simply PDF Web <version>: <summary>"
git push
```

Vercel deploys `main` automatically. After it's live, check that Settings shows <version>.
For the app: Actions → Android build → Run workflow, then sign the AAB on your PC.
