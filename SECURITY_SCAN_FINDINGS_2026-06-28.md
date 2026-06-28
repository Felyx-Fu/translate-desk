# Security Review: translator-prototype

## Scope

Deep repository security scan of translator-prototype at git revision 0824777a9f2a7d9cdcc06266b9c48a807b1dbe9c.

- Scan mode: deep_repository
- Target kind: git_revision
- Target ID: target_sha256_4ac55807eee10bed4f5100e2761ad74dbf0cee454a573c4d6b94dce20bd57545
- Revision: 0824777a9f2a7d9cdcc06266b9c48a807b1dbe9c
- Inventory strategy: repository
- Included paths: .
- Excluded paths: none
- Runtime or test status: Electron build passed, production npm audit returned zero vulnerabilities, and dynamic Electron smoke validation reproduced the dev-server bridge issue.
- Artifacts reviewed: Electron main/preload code, Renderer build and packaged Electron output, OCR dependency behavior, Windows release packaging scripts, package and lock files, historical checked-in release artifacts
- Scan context: User requested a comprehensive security scan and PR containing findings only, with fixes deferred.

Limitations and exclusions:
- The repository HEAD moved to 9507469d57333fe9b46af4eb951381004afec8dd after the scan target was selected; findings are sealed against the scanned revision.
- OCR CDN behavior and release dependency compromise were validated statically rather than with live malicious infrastructure.

### Scan Summary

| Field | Value |
| --- | --- |
| Reportable findings | 3 |
| Severity mix | medium: 2, low: 1 |
| Confidence mix | high: 1, medium: 2 |
| Coverage | complete |
| Validation mode | Mixed static review and targeted dynamic Electron validation. |

Canonical artifacts: `scan-manifest.json`, `findings.json`, and `coverage.json`. This report is a deterministic projection of those files.

## Threat Model

Translate Desk is a local Electron desktop translation/OCR application. Security-sensitive boundaries include renderer-to-main IPC, local desktop data access, OCR asset loading, and release artifact construction.

### Assets

- Clipboard and selected text
- Screen captures and OCR images
- Local wordbook data
- Packaged release artifacts
- Dependency integrity

### Trust Boundaries

- Renderer content to Electron main process
- Local desktop APIs exposed through preload IPC
- Application runtime to public package/CDN infrastructure
- Release staging directory to published artifacts

### Attacker Capabilities

- Influence local launch arguments or shortcuts
- Serve renderer content when selected by a dev-server URL
- Influence package or CDN content at dependency/model resolution time
- Trigger user OCR workflows

### Security Objectives

- Expose desktop capabilities only to trusted renderer code
- Keep OCR local and reproducible unless explicit remote fetches are pinned and trusted
- Build release artifacts from locked dependency inputs

### Assumptions

- Normal browser web content cannot directly set Electron process arguments.
- The reviewed scope is the scanned git revision, not later commits on main.
- No unrelated fixes were applied during this scan.

## Findings

| Finding | Severity | Confidence |
| --- | --- | --- |
| [Portable ZIP release packaging bypasses the root dependency lockfile](#finding-1) | medium | medium |
| [Unrestricted dev-server URL receives privileged Electron desktop bridge](#finding-2) | medium | high |
| [OCR runtime can fetch unpinned Tesseract language data from the public CDN](#finding-3) | low | medium |

### Confidence Scale

| Label | Meaning |
| --- | --- |
| high | Direct evidence supports the finding with no material unresolved blocker. |
| medium | Evidence supports a plausible issue, but material runtime or reachability proof remains. |
| low | Evidence is incomplete and the item is retained only for explicit follow-up. |

<a id="finding-1"></a>

### [1] Portable ZIP release packaging bypasses the root dependency lockfile

| Field | Value |
| --- | --- |
| Severity | medium |
| Confidence | medium |
| Confidence rationale | The packaging script clearly bypasses the root lockfile, but no malicious registry package or release run was executed. |
| Category | supply-chain |
| CWE | CWE-494, CWE-1104 |
| Affected lines | scripts/package-win-portable.ps1:50-62, package.json:49-50, package-lock.json:5681-5701 |

#### Summary

The portable ZIP packager creates a fresh staging package with the semver dependency range and runs `npm install` there, so release artifacts can resolve different production dependencies than the locked repository install.

#### Root Cause

Release artifacts should be built from the audited lockfile-resolved dependency graph. The ZIP packager creates a separate dependency resolution environment and installs from a semver range.

**Staging install resolves copied dependency range** — `scripts/package-win-portable.ps1:50-62`

The release script creates a new manifest containing the dependency range and performs a fresh install in staging without the root lockfile.

```powershell
"tesseract.js" = $package.dependencies."tesseract.js"
...
npm install --prefix $appContent --omit=dev --ignore-scripts --no-audit --no-fund
```

**Root dependency uses semver range** — `package.json:49-50`

The copied dependency is a semver range, so a later compatible version can be selected by the staging install.

```json
"dependencies": {
  "tesseract.js": "^7.0.0"
}
```

**Root lockfile pins reviewed version** — `package-lock.json:5681-5701`

The repository lockfile pins the version and integrity, but the portable staging install does not enforce it.

```json
"node_modules/tesseract.js": {
  "version": "7.0.0",
  "integrity": "sha512-exPBkd+z+wM1BuMkx/Bjv43OeLBxhL5kKWsz/9JY+DXcXdiBjiAch0V49QR3oAJqCaL5qURE0vx9Eo+G5YE7mA=="
}
```

#### Validation

Review traced `dist:win:zip` to the PowerShell packager and confirmed it writes a fresh manifest and runs `npm install` outside the root lockfile.

Validation method: static release workflow trace

**Staging install resolves copied dependency range** — `scripts/package-win-portable.ps1:50-62`

The release script creates a new manifest containing the dependency range and performs a fresh install in staging without the root lockfile.

```powershell
"tesseract.js" = $package.dependencies."tesseract.js"
...
npm install --prefix $appContent --omit=dev --ignore-scripts --no-audit --no-fund
```

**Root dependency uses semver range** — `package.json:49-50`

The copied dependency is a semver range, so a later compatible version can be selected by the staging install.

```json
"dependencies": {
  "tesseract.js": "^7.0.0"
}
```

**Root lockfile pins reviewed version** — `package-lock.json:5681-5701`

The repository lockfile pins the version and integrity, but the portable staging install does not enforce it.

```json
"node_modules/tesseract.js": {
  "version": "7.0.0",
  "integrity": "sha512-exPBkd+z+wM1BuMkx/Bjv43OeLBxhL5kKWsz/9JY+DXcXdiBjiAch0V49QR3oAJqCaL5qURE0vx9Eo+G5YE7mA=="
}
```

#### Dataflow

The canonical finding records the affected path at scripts/package-win-portable.ps1:50-62, package.json:49-50, package-lock.json:5681-5701, but no expanded source-to-sink narrative was recorded.

- **Source:** npm registry resolution at packaging time

- **Sink:** distributed portable ZIP dependency tree

- **Outcome:** release artifact may include dependency code not represented by the reviewed lockfile

**Staging install resolves copied dependency range** — `scripts/package-win-portable.ps1:50-62`

The release script creates a new manifest containing the dependency range and performs a fresh install in staging without the root lockfile.

```powershell
"tesseract.js" = $package.dependencies."tesseract.js"
...
npm install --prefix $appContent --omit=dev --ignore-scripts --no-audit --no-fund
```

**Root dependency uses semver range** — `package.json:49-50`

The copied dependency is a semver range, so a later compatible version can be selected by the staging install.

```json
"dependencies": {
  "tesseract.js": "^7.0.0"
}
```

**Root lockfile pins reviewed version** — `package-lock.json:5681-5701`

The repository lockfile pins the version and integrity, but the portable staging install does not enforce it.

```json
"node_modules/tesseract.js": {
  "version": "7.0.0",
  "integrity": "sha512-exPBkd+z+wM1BuMkx/Bjv43OeLBxhL5kKWsz/9JY+DXcXdiBjiAch0V49QR3oAJqCaL5qURE0vx9Eo+G5YE7mA=="
}
```

#### Reachability

Reachability was not recorded beyond the canonical finding summary and affected locations.

- **Attacker:** package publisher, compromised registry path, or release-time dependency source attacker

- **Entry point:** `npm run dist:win:zip`

- **Outcome:** portable release includes attacker-influenced production dependency code

#### Severity

**Medium** — This is a release workflow issue with operator-time preconditions, but successful exploitation can place attacker-controlled dependency code into shipped portable artifacts.

Additional runtime or deployment evidence could raise or lower this severity.

#### Remediation

Copy and enforce the root lockfile in staging with `npm ci --omit=dev`, or package from the already installed locked dependency tree. Preserve exact versions and integrity hashes in the release workflow.

<a id="finding-2"></a>

### [2] Unrestricted dev-server URL receives privileged Electron desktop bridge

| Field | Value |
| --- | --- |
| Severity | medium |
| Confidence | high |
| Confidence rationale | Static source review found the unrestricted argument and preload bridge, and dynamic validation confirmed `window.desktop` plus clipboard IPC access from a supplied dev-server URL. |
| Category | electron-security |
| CWE | CWE-829, CWE-346 |
| Affected lines | electron/main.cts:21-22, electron/main.cts:105-108, electron/preload.cts:11-48, electron/main.cts:418-432 |

#### Summary

The desktop process accepts any `--dev-server=` argument, loads that URL as the renderer, and still installs a preload bridge exposing clipboard, screen capture, OCR, selection, and wordbook IPC methods.

#### Root Cause

Privileged Electron IPC should only be exposed to trusted application renderer code. The launch-argument path changes the renderer origin but does not change or restrict the preload bridge.

**Unrestricted dev-server argument** — `electron/main.cts:21-22`

Any command-line value beginning with `--dev-server=` becomes the renderer origin without allowlist or production gating.

```typescript
const devServerArg = process.argv.find((arg) => arg.startsWith("--dev-server="));
const devServerUrl = devServerArg?.slice("--dev-server=".length) || null;
```

**Renderer loads supplied URL** — `electron/main.cts:105-108`

`loadRenderer()` sends windows to the supplied URL when the flag is present.

```typescript
function loadRenderer(browserWindow: BrowserWindowType, hash = ""): void {
  if (devServerUrl) {
    browserWindow.loadURL(`${devServerUrl}${hash}`);
    return;
  }
```

**Desktop bridge exposed to renderer** — `electron/preload.cts:11-18`

The preload grants the loaded renderer access to desktop IPC capabilities.

```typescript
contextBridge.exposeInMainWorld("desktop", {
  isDesktop: true,
  platform: process.platform,
  clipboard: {
    getText: () => ipcRenderer.invoke("clipboard:get-text"),
    writeText: (text: string) => ipcRenderer.invoke("clipboard:write-text", text),
```

#### Validation

Electron was launched with a controlled local dev-server URL. The test page observed `window.desktop`, listed bridge keys, and successfully wrote/read clipboard data through IPC.

Validation method: dynamic Electron smoke test plus static source trace

**Unrestricted dev-server argument** — `electron/main.cts:21-22`

Any command-line value beginning with `--dev-server=` becomes the renderer origin without allowlist or production gating.

```typescript
const devServerArg = process.argv.find((arg) => arg.startsWith("--dev-server="));
const devServerUrl = devServerArg?.slice("--dev-server=".length) || null;
```

**Renderer loads supplied URL** — `electron/main.cts:105-108`

`loadRenderer()` sends windows to the supplied URL when the flag is present.

```typescript
function loadRenderer(browserWindow: BrowserWindowType, hash = ""): void {
  if (devServerUrl) {
    browserWindow.loadURL(`${devServerUrl}${hash}`);
    return;
  }
```

**Desktop bridge exposed to renderer** — `electron/preload.cts:11-18`

The preload grants the loaded renderer access to desktop IPC capabilities.

```typescript
contextBridge.exposeInMainWorld("desktop", {
  isDesktop: true,
  platform: process.platform,
  clipboard: {
    getText: () => ipcRenderer.invoke("clipboard:get-text"),
    writeText: (text: string) => ipcRenderer.invoke("clipboard:write-text", text),
```

#### Dataflow

The canonical finding records the affected path at electron/main.cts:21-22, electron/main.cts:105-108, electron/preload.cts:11-48, electron/main.cts:418-432, but no expanded source-to-sink narrative was recorded.

- **Source:** local launch argument

- **Sink:** Electron main-process IPC handlers

- **Outcome:** untrusted renderer gains desktop bridge access

**Unrestricted dev-server argument** — `electron/main.cts:21-22`

Any command-line value beginning with `--dev-server=` becomes the renderer origin without allowlist or production gating.

```typescript
const devServerArg = process.argv.find((arg) => arg.startsWith("--dev-server="));
const devServerUrl = devServerArg?.slice("--dev-server=".length) || null;
```

**Renderer loads supplied URL** — `electron/main.cts:105-108`

`loadRenderer()` sends windows to the supplied URL when the flag is present.

```typescript
function loadRenderer(browserWindow: BrowserWindowType, hash = ""): void {
  if (devServerUrl) {
    browserWindow.loadURL(`${devServerUrl}${hash}`);
    return;
  }
```

**Desktop bridge exposed to renderer** — `electron/preload.cts:11-18`

The preload grants the loaded renderer access to desktop IPC capabilities.

```typescript
contextBridge.exposeInMainWorld("desktop", {
  isDesktop: true,
  platform: process.platform,
  clipboard: {
    getText: () => ipcRenderer.invoke("clipboard:get-text"),
    writeText: (text: string) => ipcRenderer.invoke("clipboard:write-text", text),
```

#### Reachability

Reachability was not recorded beyond the canonical finding summary and affected locations.

- **Attacker:** local process, shortcut author, or operator-controlled launch wrapper

- **Entry point:** `electron . --dev-server=<url>`

- **Outcome:** the selected renderer can call privileged desktop bridge methods

#### Severity

**Medium** — A renderer from an attacker-selected URL can reach privileged desktop IPC methods, including clipboard access. Exploitation requires control of the local launch command or equivalent shortcut/process invocation.

Additional runtime or deployment evidence could raise or lower this severity.

#### Remediation

Gate `--dev-server` behind development-only execution, allow only trusted loopback origins, and disable or narrow the desktop preload bridge whenever an external renderer URL is loaded.

<a id="finding-3"></a>

### [3] OCR runtime can fetch unpinned Tesseract language data from the public CDN

| Field | Value |
| --- | --- |
| Severity | low |
| Confidence | medium |
| Confidence rationale | The source and dependency trace show the default remote fetch path, but runtime network capture was not performed. |
| Category | supply-chain |
| CWE | CWE-494, CWE-829 |
| Affected lines | electron/main.cts:136-138, node_modules/tesseract.js/src/worker-script/index.js:127-142, package.json:49-50 |

#### Summary

The OCR path calls `Tesseract.recognize()` without an explicit `langPath` or integrity-pinned local model, so `tesseract.js` falls back to jsDelivr for language data.

#### Root Cause

Desktop OCR should use controlled and pinned recognition assets. The application relies on the library default instead of explicitly selecting a bundled or integrity-checked language-data source.

**OCR call omits language-data path** — `electron/main.cts:136-138`

The OCR call does not set `langPath`, `cachePath`, or an integrity-pinned local data source.

```typescript
const result = await Tesseract.recognize(dataUrl, "eng", {
  logger: () => {},
});
```

**Dependency default uses jsDelivr** — `node_modules/tesseract.js/src/worker-script/index.js:127-142`

When `langPath` is absent, the dependency constructs and fetches a public CDN URL for language data.

```javascript
// If `langPath` if not explicitly set by the user, the jsdelivr CDN is used.
const langPathDownload = langPath || (lstmOnly ? `https://cdn.jsdelivr.net/npm/@tesseract.js-data/${lang}/4.0.0_best_int` : `https://cdn.jsdelivr.net/npm/@tesseract.js-data/${lang}/4.0.0`);
const resp = await (env === 'webworker' ? fetch : adapter.fetch)(fetchUrl);
```

#### Validation

Review traced the OCR call into `tesseract.js` and confirmed the library uses jsDelivr when `langPath` is unset.

Validation method: static source and dependency trace

**OCR call omits language-data path** — `electron/main.cts:136-138`

The OCR call does not set `langPath`, `cachePath`, or an integrity-pinned local data source.

```typescript
const result = await Tesseract.recognize(dataUrl, "eng", {
  logger: () => {},
});
```

**Dependency default uses jsDelivr** — `node_modules/tesseract.js/src/worker-script/index.js:127-142`

When `langPath` is absent, the dependency constructs and fetches a public CDN URL for language data.

```javascript
// If `langPath` if not explicitly set by the user, the jsdelivr CDN is used.
const langPathDownload = langPath || (lstmOnly ? `https://cdn.jsdelivr.net/npm/@tesseract.js-data/${lang}/4.0.0_best_int` : `https://cdn.jsdelivr.net/npm/@tesseract.js-data/${lang}/4.0.0`);
const resp = await (env === 'webworker' ? fetch : adapter.fetch)(fetchUrl);
```

#### Dataflow

The canonical finding records the affected path at electron/main.cts:136-138, node_modules/tesseract.js/src/worker-script/index.js:127-142, package.json:49-50, but no expanded source-to-sink narrative was recorded.

- **Source:** public CDN language-data response

- **Sink:** OCR recognition result consumed by the app

- **Outcome:** remote data influences text extraction integrity

**OCR call omits language-data path** — `electron/main.cts:136-138`

The OCR call does not set `langPath`, `cachePath`, or an integrity-pinned local data source.

```typescript
const result = await Tesseract.recognize(dataUrl, "eng", {
  logger: () => {},
});
```

**Dependency default uses jsDelivr** — `node_modules/tesseract.js/src/worker-script/index.js:127-142`

When `langPath` is absent, the dependency constructs and fetches a public CDN URL for language data.

```javascript
// If `langPath` if not explicitly set by the user, the jsdelivr CDN is used.
const langPathDownload = langPath || (lstmOnly ? `https://cdn.jsdelivr.net/npm/@tesseract.js-data/${lang}/4.0.0_best_int` : `https://cdn.jsdelivr.net/npm/@tesseract.js-data/${lang}/4.0.0`);
const resp = await (env === 'webworker' ? fetch : adapter.fetch)(fetchUrl);
```

#### Reachability

Reachability was not recorded beyond the canonical finding summary and affected locations.

- **Attacker:** CDN, registry-data publisher, or network attacker capable of influencing the model-data response

- **Entry point:** OCR recognition path

- **Outcome:** OCR model data is supplied by an external source

#### Severity

**Low** — The issue introduces a remote runtime dependency in a privacy-sensitive desktop OCR feature, but no screenshot upload, code execution, or active interception path was demonstrated.

Additional runtime or deployment evidence could raise or lower this severity.

#### Remediation

Bundle the required traineddata with the app, configure `langPath` and cache behavior explicitly, and verify the asset with an integrity hash or signed update channel.

## Reviewed Surfaces

| Surface | Risk Area | Outcome | Notes |
| --- | --- | --- | --- |
| Electron renderer trust boundary and desktop IPC bridge | Desktop privilege boundary | Reported | Reviewed BrowserWindow creation, preload exposure, IPC handlers, and dynamic launch behavior. Evidence: artifacts/02_discovery/finding_discovery_report.md, artifacts/04_reconciliation/deduped_candidates.jsonl, artifacts/05_findings/DS-CAND-001/candidate_ledger.jsonl, artifacts/05_findings/DS-CAND-001/validation_report.md, artifacts/05_findings/DS-CAND-001/attack_path_analysis_report.md |
| OCR runtime asset loading and external dependency behavior | Runtime supply chain and privacy posture | Reported | Reviewed OCR call path and `tesseract.js` language-data resolution behavior. Evidence: artifacts/02_discovery/finding_discovery_report.md, artifacts/04_reconciliation/deduped_candidates.jsonl, artifacts/05_findings/DS-CAND-002/candidate_ledger.jsonl, artifacts/05_findings/DS-CAND-002/validation_report.md, artifacts/05_findings/DS-CAND-002/attack_path_analysis_report.md |
| Release packaging dependency resolution | Release supply chain | Reported | Reviewed Windows packaging scripts, package scripts, and lockfile interaction. Evidence: artifacts/02_discovery/finding_discovery_report.md, artifacts/04_reconciliation/deduped_candidates.jsonl, artifacts/05_findings/DS-CAND-003/candidate_ledger.jsonl, artifacts/05_findings/DS-CAND-003/validation_report.md, artifacts/05_findings/DS-CAND-003/attack_path_analysis_report.md |
| Repository-wide source and artifact inventory | General application security | No issue found | Three deep discovery rounds reviewed 21 ranked worklist rows. Round 03 produced no new canonical candidates, reaching saturation. Evidence: artifacts/02_discovery/rank_input.jsonl, artifacts/02_discovery/deep_review_input.jsonl, artifacts/deep_merge/terminal_state.md |
