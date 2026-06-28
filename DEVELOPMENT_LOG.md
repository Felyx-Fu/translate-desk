# Development Log

## 2026-06-28

### feat: add settings storage service

- Change type: feature / refactor
- Change summary: moved settings load/save persistence into `src/services/settings` and kept the renderer using a narrow settings service boundary.
- Affected modules: settings center, translation defaults, renderer startup.
- Verification: `npm run build` passed; `node --check dist-electron/main.cjs` and `node --check dist-electron/preload.cjs` passed; local preview loaded at `http://127.0.0.1:5173/`.
- GitHub: pending push/PR.

### refactor: extract translation service module

- Change type: refactor / documentation
- Change summary: moved translation settings types, local fallback translation, API translation calls, and unified translation entry into `src/services/translation`.
- Affected modules: renderer translation workbench, settings center, OCR translation, clipboard translation, floating translation.
- Verification: `npm run build` passed; `node --check dist-electron/main.cjs` and `node --check dist-electron/preload.cjs` passed; local preview loaded at `http://127.0.0.1:5173/`.
- GitHub: PR #6 is open and not merged at the time of this update.

### docs: add project planning records

- Change type: documentation
- Change summary: added `PROJECT_PLAN.md`, `ROADMAP.md`, and `DEVELOPMENT_LOG.md` to preserve the execution plan and development trace.
- Affected modules: project documentation.
- Verification: `npm run build` passed; local preview loaded in the in-app browser.
- GitHub: pending push/PR update.
