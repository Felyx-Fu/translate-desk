# Changelog

## 0.2.0 - 2026-06-27

### Added

- Added a fullscreen screenshot region selector for desktop OCR.
- Added main-process crop-and-recognize flow for selected screen regions.
- Added a dedicated `#capture` renderer surface for drag selection and cancel handling.

## 0.1.1 - 2026-06-27

### Fixed

- Updated GitHub Actions workflow dependencies to remove the Node 20 deprecation warning on CI.

## 0.1.0 - 2026-06-27

### Added

- Electron desktop shell for Windows-oriented local usage.
- Main translation workbench based on the approved quiet office-tool prototype.
- Clipboard monitoring and clipboard history page.
- Ctrl+Space floating translation window.
- Persistent wordbook storage in Electron user data.
- Reading controls using the Web Speech API when available.
- Screenshot OCR first pass using `tesseract.js` English recognition on primary screen capture.
- Build and smoke-test commands for desktop verification.

### Security

- Updated Vite to `6.4.3` to address Windows development server advisories reported by `npm audit`.

### Known Gaps

- OCR currently recognizes the primary screen capture; draggable region selection is the next implementation step.
- Translation still uses local prototype logic; production translation engine integration is pending.
- Windows installer packaging is not configured yet.
