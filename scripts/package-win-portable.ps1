$ErrorActionPreference = "Stop"

$root = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$package = Get-Content -Raw (Join-Path $root "package.json") | ConvertFrom-Json
$version = $package.version
$releaseRoot = Join-Path $root "release"
$appFolderName = "Translate Desk-$version-win-x64"
$staging = Join-Path $releaseRoot $appFolderName
$appContent = Join-Path $staging "resources\app"
$zipPath = Join-Path $releaseRoot "$appFolderName-portable.zip"
$electronDist = Join-Path $root "node_modules\electron\dist"

function Remove-WithinWorkspace($path) {
  if (-not (Test-Path -LiteralPath $path)) {
    return
  }

  $resolved = (Resolve-Path -LiteralPath $path).Path
  if (-not $resolved.StartsWith($root)) {
    throw "Refusing to remove path outside workspace: $resolved"
  }

  Remove-Item -LiteralPath $resolved -Recurse -Force
}

if (-not (Test-Path -LiteralPath $electronDist)) {
  throw "Electron runtime not found. Run npm install first."
}

New-Item -ItemType Directory -Force -Path $releaseRoot | Out-Null
Remove-WithinWorkspace $staging
Remove-WithinWorkspace (Join-Path $releaseRoot "win-unpacked.tmp")
Remove-WithinWorkspace (Join-Path $releaseRoot "win-unpacked")
if (Test-Path -LiteralPath $zipPath) {
  Remove-Item -LiteralPath $zipPath -Force
}

Copy-Item -LiteralPath $electronDist -Destination $staging -Recurse -Force
Move-Item -LiteralPath (Join-Path $staging "electron.exe") -Destination (Join-Path $staging "Translate Desk.exe") -Force

$defaultApp = Join-Path $staging "resources\default_app.asar"
if (Test-Path -LiteralPath $defaultApp) {
  Remove-Item -LiteralPath $defaultApp -Force
}

New-Item -ItemType Directory -Force -Path $appContent | Out-Null
Copy-Item -LiteralPath (Join-Path $root "dist") -Destination (Join-Path $appContent "dist") -Recurse -Force
Copy-Item -LiteralPath (Join-Path $root "dist-electron") -Destination (Join-Path $appContent "dist-electron") -Recurse -Force

$appPackage = [ordered]@{
  name = "translate-desk"
  version = $version
  productName = "Translate Desk"
  main = "dist-electron/main.cjs"
  dependencies = [ordered]@{
    "tesseract.js" = $package.dependencies."tesseract.js"
  }
}

$appPackage | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath (Join-Path $appContent "package.json") -Encoding UTF8

npm install --prefix $appContent --omit=dev --ignore-scripts --no-audit --no-fund

Compress-Archive -Path $staging -DestinationPath $zipPath -Force

Write-Host "Portable app folder: $staging"
Write-Host "Portable app zip: $zipPath"
