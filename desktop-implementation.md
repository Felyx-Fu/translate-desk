**Translate Desk Desktop Build Status**

**Run Commands**
- Web prototype: `npm run dev`
- Desktop development: `npm run desktop`
- Desktop preview from built files: `npm run desktop:preview`
- Desktop smoke test: `npx electron . --smoke-test`

**Implemented**
- Electron Windows desktop shell with a main workbench window.
- Secure preload bridge with controlled APIs for clipboard, wordbook persistence, screen capture, shortcuts, and floating window control.
- Ctrl+Space global shortcut opens a compact floating translation window using the current clipboard text.
- Clipboard listener polls local clipboard changes and pushes copied text into the clipboard page.
- Wordbook entries persist through Electron `app.getPath("userData")/wordbook.json`; browser preview falls back to `localStorage`.
- Source and target copy actions write to the system clipboard in desktop mode.
- Web Speech API powers the current reading controls when available.
- Screenshot OCR now opens a fullscreen region selector, crops the selected screen region in the Electron main process, runs English recognition through `tesseract.js`, shows recognized text/confidence, translates the recognized text, and can return the result to the main translation workbench.

**Still Mocked / Next Engine Work**
- Translation is still the current local sample translator, not a production model. Next step: plug in a real local dictionary/model or configurable API provider.
- OCR accuracy is first-pass English recognition through `tesseract.js`. Next step: evaluate PaddleOCR or Windows OCR for stronger small-text recognition.
- OCR region selection currently targets the primary display. Next step: support multi-display selection.
- Selected-text translation currently uses selected text inside the app or clipboard text. Next step: implement the standard desktop flow that copies current external selection, restores clipboard, then translates.
- Windows installer packaging is not configured yet. Next step: add `electron-builder` or equivalent packaging after core features stabilize.

**Verified**
- `npm run build` passes.
- `node --check electron/main.cjs` passes.
- `node --check electron/preload.cjs` passes.
- `npx electron . --smoke-test` starts Electron from `dist`, loads the app, prints `electron-smoke-ok`, and exits.
