# Contributing

Translate Desk is a Windows-focused Electron prototype. Keep changes small, verifiable, and aligned with the quiet desktop-tool direction in `AGENTS.md`.

## Branch and Pull Request Rules

- Work from a feature or fix branch; keep `main` releasable.
- Open a pull request for code changes.
- Require CI to pass before merging into `main`.
- Keep each pull request focused on one coherent user-facing change, bug fix, or maintenance task.
- Do not mix unrelated refactors, formatting churn, or generated output with functional changes.
- Update `CHANGELOG.md` for user-facing behavior, packaging, release, or security changes.

## Recommended GitHub Repository Settings

- Protect `main`.
- Require pull requests before merging.
- Require the `CI / verify` status check before merging.
- Require branches to be up to date before merging when GitHub offers the option.
- Allow squash merges for small focused changes; avoid merge commits for routine work.

## Required Verification

Run these checks before requesting review:

```powershell
npm run build
node --check dist-electron\main.cjs
node --check dist-electron\preload.cjs
npx electron . --smoke-test
```

For release or dependency-sensitive changes, also run:

```powershell
npm audit --audit-level=moderate --omit=dev
```

## Desktop Security Rules

- Keep Electron renderer settings locked down with `contextIsolation: true` and `nodeIntegration: false`.
- Expose desktop capabilities through narrow preload APIs only.
- Treat clipboard contents, screenshots, OCR samples, and wordbook data as private local data.
- Do not commit secrets, local logs, release ZIPs, build output, or captured user content.

## Release Rules

Follow `RELEASING.md` for versioning, packaging, tags, and GitHub Release uploads. A normal release should include a downloadable Windows artifact, not only a source tag.
