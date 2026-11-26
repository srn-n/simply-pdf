# 2026-11-23: AGENTS.md is local-only

## What changed and why

- `AGENTS.md` is now in `.gitignore`. It stays in `C:\Working Projects\SimplyPDFWeb` and is kept up to date there, but it's never committed. This is the owner's choice, from the Notion task "Remove agents.md from repo and save it only to local files, keeping it up to date also".
- `README.md` no longer links to it. It says the hand-off file is kept on the owner's machine.
- `AGENTS.md` §9 and `docs/PROJECT-NOTES.md` record the change.

## How it was checked

- The folder isn't a git repository yet, so nothing needed untracking. Once the owner runs `git init` and `git add -A`, `AGENTS.md` is skipped automatically.

## Files touched

- `.gitignore`, `README.md`, `docs/PROJECT-NOTES.md`, `docs/changes/2026-11-23-agents-md-local-only.md`, plus `AGENTS.md` itself (local only).

## Does the Android app need this too?

It's already done there, in the same session: `srn-n/Simply-PDF` PR #3 stops tracking `AGENTS.md`.
