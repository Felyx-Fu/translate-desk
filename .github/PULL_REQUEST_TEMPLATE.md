## Summary

- 

## Verification

- [ ] `npm run build`
- [ ] `node --check electron\main.cjs`
- [ ] `node --check electron\preload.cjs`
- [ ] `npx electron . --smoke-test`

## Release Impact

- [ ] No user-facing change
- [ ] User-facing change is documented in `CHANGELOG.md`
- [ ] Release packaging impact was considered

## Desktop/Security Checklist

- [ ] Electron renderer keeps `contextIsolation: true` and `nodeIntegration: false`
- [ ] Preload APIs remain narrow and explicit
- [ ] Clipboard, screenshot, OCR, and wordbook changes avoid committing private data
- [ ] Generated artifacts are not committed unless intentionally part of the release
