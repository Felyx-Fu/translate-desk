# Translate Desk

Translate Desk is a Windows-focused English-Chinese translation desktop app built from the current prototype direction. It uses React + Vite for the interface and Electron for local desktop capabilities.

## Current Capabilities

- English-Chinese and Chinese-English translation workspace.
- Direction detection for edited source text.
- Clipboard monitoring in desktop mode.
- Ctrl+Space floating translation window.
- Wordbook persistence through Electron user data.
- Reading through the Web Speech API when available.
- Screenshot region OCR first pass through `tesseract.js` for English text.
- Minimal, quiet office-tool interface matching the approved prototype direction.

## Run Locally

```powershell
npm install
npm run dev
```

Desktop development:

```powershell
npm run desktop
```

Desktop preview from built files:

```powershell
npm run desktop:preview
```

Build Windows release artifacts:

```powershell
npm run dist:win
```

Release output is written to `release/` and should be uploaded to the matching GitHub Release.
The current artifact is a portable x64 ZIP. Extract it and run `Translate Desk.exe`.

## Verify

```powershell
npm run build
node --check electron\main.cjs
node --check electron\preload.cjs
npx electron . --smoke-test
```

## Release Policy

This project follows semantic versioning:

- Minor release: completed user-facing feature or meaningful app milestone.
- Patch release: bug fix, OCR/translation correction, packaging fix, or small polish.
- Security patch release: dependency or code change that reduces security risk.

Every release should update `CHANGELOG.md`, pass verification, create a Git tag, and publish a GitHub Release.
