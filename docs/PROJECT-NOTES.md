# Simply PDF: project notes

Short, long-lived notes. `AGENTS.md` (local only) is the full, authoritative hand-off. Keep this file in step with it.

## At a glance

- **What:** 13 PDF tools that run entirely on the device. One codebase with two editions: the **website** (primary; offline PWA on Vercel) and the **Android app** (the same web code in a Capacitor shell, on Google Play).
- **Who:** Simply Made Studio (Sydney). The owner, Samiur, commits and pushes himself.
- **Where:**
  - Repo folder: `C:\Working Projects\SimplyPDFWeb` (GitHub: `srn-n/simply-pdf`, private).
  - Release outputs, not a repo: `C:\Working Projects\SimplyPDFApp` (signed AAB/APK, store listing assets, upload notes, and the upload key in `.signing\`).
  - Hosting: Vercel deploys `main`. Live URL: _to be added after the first deploy_.
  - Google Play package: `net.simplymadestudio.simplypdf`.

## Promises (hard rules)

No accounts, no ads, no tracking, no guesswork:
- No analytics of any kind, Vercel's included.
- Nothing is loaded from other servers.
- Files are never uploaded.
- Website: the CSP allows `'self'` only. App: no INTERNET permission.

## Versions

| Version | Date | Summary |
|---|---|---|
| 1.0.0 | 2026-11-14 | First web release: offline PWA, strict CSP and headers, 13 tools |
| 1.0.0 (app) | 2026-11-26 | Android app (versionCode 1), now built from this repo; launch screen and status bar in the app theme |

## Notes

- 2026-11-23: `AGENTS.md` is local-only (git-ignored). It's the owner's choice, from a Notion task.
- 2026-11-26: the web and Android projects were merged into this one repo, web first. The app's screens, animations and behaviour are unchanged. See `docs/changes/2026-11-26-web-and-app-in-one-repo.md`.
- GitHub Actions minutes are limited on a private repo. The only workflow (`android.yml`) runs by hand or on a `v*` tag; the website is built by Vercel, not Actions.

## Open items

- After the first deploy, add the live URL here and in `AGENTS.md`, and set an absolute `og:image` URL in `index.html`.
- Add the web paragraph to the studio privacy policy. The draft is in `docs/releases/1.0.0.md`.
- Ideas: a wider desktop layout; "Open with" file handling for the installed desktop app; page-number "distance from edge" option (waits for the owner's OK).
