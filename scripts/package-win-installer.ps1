$ErrorActionPreference = "Stop"

$root = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$releaseRoot = Join-Path $root "release"

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

Write-Host "Building Windows installers (NSIS + Portable)..."
npx electron-builder --win nsis portable --x64 --publish never

Write-Host "Build complete! Installers are in: $releaseRoot"
Get-ChildItem -LiteralPath $releaseRoot -Filter "*.exe" | ForEach-Object {
  Write-Host "  - $($_.Name)"
}
