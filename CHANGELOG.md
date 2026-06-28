# Changelog

## Unreleased

### Changed

- Moved settings persistence into `src/services/settings` to prepare the v0.6.0 settings center work.

## 0.5.0 - 2026-06-28

### Added

- Added configurable online translation with a free API mode, user API key mode, and offline fallback mode.
- Added a settings center for translation provider, API endpoint, API key, default direction, history, privacy, and shortcut settings.
- Added desktop shortcut registration status so users can see when a global shortcut is occupied.
- Added editable OCR source/translation comparison with copy, retranslate, and save-to-wordbook actions.
- Added `PRIVACY.md` documenting local data storage and online translation boundaries.

### Changed

- Extracted translation engine code into `src/services/translation` so API translation, local fallback, and translation settings are easier to maintain.
- Updated package metadata and browser title to the formal Translate Desk product name.
- Improved the floating translator with pin, source/translation toggle, copy, speech, and wordbook actions.
- Replaced developer-style crash UI with a Chinese user-facing reload prompt.

### Documentation

- Added `PROJECT_PLAN.md`, `ROADMAP.md`, and `DEVELOPMENT_LOG.md` to preserve the project plan and development trace.

## 0.4.2 - 2026-06-28

### Added

- NSIS Windows installer with standard installation wizard experience.
- Installation directory selection during setup.
- Desktop shortcuts and Start menu shortcuts creation options.
- React error boundary component for graceful error handling.
- Detailed error logging in Electron main process for diagnostics.

### Fixed

- Fixed page loading failures by adding error handlers to all window types (main, floating, capture).
- Improved error recovery with error boundary showing user-friendly error messages.

### Changed

- Updated package.json to include `dist:win` command for building both NSIS and portable installers.
- Added repository metadata to package.json.
- Enhanced error handling in Electron windows with `did-fail-load` event listeners.

## 0.4.1 - 2026-06-27

### Fixed

- Changed the default Windows release artifact from a portable ZIP to a portable `.exe`.
- Added `electron-builder` packaging for `Translate.Desk-0.4.1-win-x64-portable.exe`.

### Changed

- Improved the GitHub README structure and presentation for the Windows desktop translator project.

## 0.4.0 - 2026-06-27

### Changed

- Migrated the React renderer from JavaScript/JSX to TypeScript/TSX.
- Migrated the Electron main and preload entry points to TypeScript `.cts` sources that compile to `dist-electron/*.cjs`.
- Added strict TypeScript checks for renderer, preload, and main-process code.
- Updated Windows packaging so releases use compiled Electron output instead of source main-process files.

### Notes

- Rust/Tauri is still a later architecture step because it affects OCR, global shortcuts, clipboard access, and Windows packaging.

## 0.3.0 - 2026-06-27

### Added

- Added Windows external selected-text translation for Ctrl+Space and the workbench selection-translation action.
- Preserves and restores the user's clipboard while reading selected text from other applications.
- Suppresses clipboard history updates during internal selected-text capture so the clipboard page is not polluted by implementation details.
- Added Dependabot configuration for npm and GitHub Actions updates.
- Added issue and pull request templates for bug, feature, release-impact, and desktop-security tracking.
- Expanded CI with manual dispatch, concurrency, Electron smoke test, and production dependency audit.

## 0.2.1 - 2026-06-27

### Added

- Added Windows portable application packaging.
- Added `npm run dist:win` to produce a downloadable x64 ZIP containing `Translate Desk.exe`.
- Updated release documentation so GitHub releases include installable application files, not only source tags.

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
