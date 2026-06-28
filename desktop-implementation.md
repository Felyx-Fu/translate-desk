**Translate Desk Desktop Build Status**

**Run Commands**
- Web prototype: `npm run dev`
- Desktop development: `npm run desktop`
- Desktop preview from built files: `npm run desktop:preview`
- Desktop smoke test: `npx electron . --smoke-test`
- Build Windows installers (NSIS + Portable): `npm run dist:win`
- Build portable exe only: `npm run dist:win:portable`
- Build portable zip only: `npm run dist:win:zip`

**Implemented**
- Electron Windows desktop shell with a main workbench window.
- TypeScript renderer, preload, and main-process source with strict checks in the build pipeline.
- Secure preload bridge with controlled APIs for clipboard, wordbook persistence, screen capture, shortcuts, and floating window control.
- Ctrl+Space global shortcut opens a compact floating translation window using the current clipboard text.
- Ctrl+Space and the selection translation action can read selected text from other Windows applications by temporarily copying the selection, translating it, and restoring the user's original clipboard.
- Clipboard listener polls local clipboard changes and pushes copied text into the clipboard page.
- Wordbook entries persist through Electron `app.getPath("userData")/wordbook.json`; browser preview falls back to `localStorage`.
- Source and target copy actions write to the system clipboard in desktop mode.
- Web Speech API powers the current reading controls when available.
- Screenshot OCR now opens a fullscreen region selector, crops the selected screen region in the Electron main process, runs English recognition through `tesseract.js`, shows recognized text/confidence, translates the recognized text, and can return the result to the main translation workbench.
- Windows installer packaging with NSIS for standard installation experience, including custom installation directory selection, desktop shortcuts, and start menu shortcuts.
- Error handling in main process and React component error boundaries for better diagnostics and recovery.

**Still Mocked / Next Engine Work**
- Translation is still the current local sample translator, not a production model. Next step: plug in a real local dictionary/model or configurable API provider.
- OCR accuracy is first-pass English recognition through `tesseract.js`. Next step: evaluate PaddleOCR or Windows OCR for stronger small-text recognition.
- OCR region selection currently targets the primary display. Next step: support multi-display selection.
- Selected-text translation uses Windows SendKeys to copy the active external selection. Next step: evaluate a lower-level native hook if SendKeys proves unreliable in some applications.
- Rust/Tauri migration is not started yet. Next step: evaluate it after OCR, shortcuts, clipboard, and packaging requirements are stable enough to avoid rewriting them twice.

**Verified**
- `npm run build` passes.
- `node --check dist-electron/main.cjs` passes.
- `node --check dist-electron/preload.cjs` passes.
- `npx electron . --smoke-test` starts Electron from `dist`, loads the app, prints `electron-smoke-ok`, and exits.
