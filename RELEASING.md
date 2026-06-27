# Releasing

## Version Rules

- Use `minor` for completed user-facing feature groups.
- Use `patch` for bug fixes, security fixes, dependency hardening, and small production corrections.
- Prefer one release per coherent finished unit. Do not release half-wired work unless it is a deliberate pre-release.

## Required Checks

Run before each tag:

```powershell
npm run build
node --check electron\main.cjs
node --check electron\preload.cjs
npx electron . --smoke-test
npm audit --audit-level=moderate
npm run dist:win
```

## Release Steps

```powershell
npm version <major|minor|patch> --no-git-tag-version
```

Update `CHANGELOG.md`, commit, then tag and push:

```powershell
git add package.json package-lock.json CHANGELOG.md
git commit -m "release vX.Y.Z"
git tag vX.Y.Z
git push
git push origin vX.Y.Z
gh release create vX.Y.Z --title "vX.Y.Z" --notes-file CHANGELOG.md release\*.zip
```

For security fixes, include a short security note in the release notes without exposing exploit details that are not already public.

Do not publish a normal release without application artifacts. If packaging fails, use a pre-release or fix packaging first.
