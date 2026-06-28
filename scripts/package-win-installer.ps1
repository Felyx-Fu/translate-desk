$ErrorActionPreference = "Stop"

$root = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$releaseRoot = Join-Path $root "release"
$package = Get-Content -Raw (Join-Path $root "package.json") | ConvertFrom-Json
$version = $package.version
$installerArtifact = Join-Path $releaseRoot "Translate.Desk-$version-win-x64.exe"
$setupArtifact = Join-Path $releaseRoot "Translate.Desk-$version-win-x64-setup.exe"

function Remove-WithinRoot($path, $allowedRoot) {
  if (-not (Test-Path -LiteralPath $path)) {
    return
  }

  $resolved = (Resolve-Path -LiteralPath $path).Path
  if (-not $resolved.StartsWith($allowedRoot)) {
    throw "Refusing to remove path outside expected root: $resolved"
  }

  Remove-Item -LiteralPath $resolved -Recurse -Force
}

New-Item -ItemType Directory -Force -Path $releaseRoot | Out-Null
Remove-WithinRoot $installerArtifact $root
Remove-WithinRoot $setupArtifact $root

Write-Host "Building Windows installer (NSIS)..."
npx electron-builder --win nsis --x64 --publish never

if (-not (Test-Path -LiteralPath $installerArtifact)) {
  throw "Expected Windows installer artifact was not produced: $installerArtifact"
}

Move-Item -LiteralPath $installerArtifact -Destination $setupArtifact -Force
Remove-WithinRoot (Join-Path $releaseRoot "win-unpacked") $root

Write-Host "Building Windows portable executable..."
powershell -NoProfile -ExecutionPolicy Bypass -File (Join-Path $PSScriptRoot "package-win-exe.ps1")

Write-Host "Build complete! Installers are in: $releaseRoot"
Get-ChildItem -LiteralPath $releaseRoot -Filter "*.exe" | ForEach-Object {
  Write-Host "  - $($_.Name)"
}
