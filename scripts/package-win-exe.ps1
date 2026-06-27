$ErrorActionPreference = "Stop"

$root = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$tempRoot = (Resolve-Path $env:TEMP).Path
$builderOutput = Join-Path $tempRoot "translate-desk-builder-output"
$releaseRoot = Join-Path $root "release"
$package = Get-Content -Raw (Join-Path $root "package.json") | ConvertFrom-Json
$version = $package.version
$artifactName = "Translate.Desk-$version-win-x64-portable.exe"
$sourceArtifact = Join-Path $builderOutput $artifactName
$releaseArtifact = Join-Path $releaseRoot $artifactName

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
Remove-WithinRoot $builderOutput $tempRoot
Remove-WithinRoot $releaseArtifact $root

npx electron-builder --win portable --x64 --publish never --config.directories.output="$builderOutput"

if (-not (Test-Path -LiteralPath $sourceArtifact)) {
  throw "Expected Windows executable artifact was not produced: $sourceArtifact"
}

Copy-Item -LiteralPath $sourceArtifact -Destination $releaseArtifact -Force
Remove-WithinRoot $builderOutput $tempRoot

Write-Host "Portable app exe: $releaseArtifact"
