# Security Policy

## Supported Versions

Only the latest released version is supported while the app is in early development.

## Reporting

Do not put secrets, API keys, private OCR samples, or sensitive screenshots into issues or commits. Report security concerns privately to the repository owner until a formal disclosure channel is configured.

## Current Security Notes

- Electron renderer runs with `contextIsolation: true` and `nodeIntegration: false`.
- The preload layer exposes only narrow desktop APIs.
- Clipboard and screenshot data are processed locally by default.
- Git ignores local environment files, dependency directories, build output, and logs.

