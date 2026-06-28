# Roadmap

## v0.5.0 - Real Translation

- [x] Add online translation mode with free API fallback.
- [x] Add user API key mode.
- [x] Keep offline rule-based translation as fallback.
- [x] Show clear translation failure/fallback status.
- [x] Extract translation logic into `src/services/translation`.
- [ ] Merge PR #6 into `main`.
- [ ] Create GitHub Release `v0.5.0`.

## v0.6.0 - Settings Center

- [x] Add settings center UI.
- [x] Persist basic settings locally.
- [x] Configure translation provider, endpoint, API key, direction, history, and shortcut.
- [ ] Move settings persistence into a dedicated settings service.
- [ ] Validate shortcut input before applying it.

## v0.7.0 - OCR Workflow

- [x] Add screenshot region selection.
- [x] Add editable OCR source and translation comparison.
- [x] Add retranslate, copy source, copy translation, and save-to-wordbook actions.
- [ ] Improve OCR language configuration.
- [ ] Preserve paragraphs more reliably for multiline captures.

## v0.8.0 - Wordbook

- [x] Persist wordbook entries locally.
- [ ] Add source tracking.
- [ ] Add tags and search.
- [ ] Add favorite/review status.
- [ ] Add CSV export and JSON import.

## v0.9.0 - Product Packaging

- [x] Add README screenshots and install/build instructions.
- [x] Add `PRIVACY.md`.
- [x] Add `PROJECT_PLAN.md`, `ROADMAP.md`, and `DEVELOPMENT_LOG.md`.
- [ ] Add user guide and troubleshooting documentation.
- [ ] Refresh screenshots after final UI changes.

## v1.0.0 - Stable Release

- [ ] Run full typecheck and build.
- [ ] Run Electron smoke test.
- [ ] Build Windows installer and portable artifacts.
- [ ] Update changelog and version metadata.
- [ ] Tag and publish `v1.0.0`.
