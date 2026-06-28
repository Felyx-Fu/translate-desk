# Translate Desk Privacy Notes

Translate Desk follows a local-first model for desktop workflows. This document explains what stays on the device and when text may leave the device.

## Local Data

- Clipboard monitoring reads copied text locally and uses it only inside the app.
- Screenshot OCR runs in the desktop app through `tesseract.js`.
- Wordbook entries are saved in the Electron `userData` directory as `wordbook.json`.
- Translation settings, including the selected provider and optional API key, are stored in local browser storage.

## Online Translation

When the translation provider is set to `免费翻译 API`, the app sends the source text to the default online translation API.

When the provider is set to `用户 API Key`, the app sends the source text, language pair, and configured API key to the configured LibreTranslate-compatible endpoint.

When the provider is set to `离线规则`, the app does not call an online translation service and uses the built-in local fallback rules.

## OCR Images

The current OCR flow recognizes screenshots locally. Captured images are not uploaded by the OCR feature.

## Clearing Data

- Delete wordbook data by removing `wordbook.json` from the app's Electron `userData` directory.
- Clear settings by clearing the app's local browser storage for `translate-desk-settings`.

## Accounts

Translate Desk does not include an account system or cloud sync.
