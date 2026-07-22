[CmdletBinding()]
param(
  [string]$FontPath
)

$ErrorActionPreference = "Stop"

$repoRoot = Resolve-Path -LiteralPath (Join-Path $PSScriptRoot "..")
$scriptPath = Join-Path $repoRoot "scripts\create-logo-assets.mjs"
$arguments = @($scriptPath)

if ($FontPath) {
  $arguments += @("--font", $FontPath)
}

& node @arguments

if ($LASTEXITCODE -ne 0) {
  throw "Logo asset generation failed with exit code $LASTEXITCODE."
}
