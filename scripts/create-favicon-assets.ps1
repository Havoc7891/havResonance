[CmdletBinding()]
param()

$ErrorActionPreference = "Stop"

$repoRoot = Resolve-Path -LiteralPath (Join-Path $PSScriptRoot "..")
$publicDir = Join-Path $repoRoot "public"
$sourceSvgs = @{
  dark = Join-Path $publicDir "havResonance-mark-dark.svg"
  light = Join-Path $publicDir "havResonance-mark-light.svg"
}

$magick = Get-Command magick -ErrorAction SilentlyContinue

if (-not $magick) {
  throw "ImageMagick 'magick' was not found in PATH. Install ImageMagick 7 or add magick.exe to PATH."
}

foreach ($sourceSvg in $sourceSvgs.Values) {
  if (-not (Test-Path -LiteralPath $sourceSvg)) {
    throw "Required source SVG not found: $sourceSvg"
  }
}

function Invoke-Magick {
  param(
    [Parameter(Mandatory = $true)]
    [string[]]$Arguments
  )

  & $magick.Source @Arguments

  if ($LASTEXITCODE -ne 0) {
    throw "magick failed with exit code $LASTEXITCODE while running: magick $($Arguments -join ' ')"
  }
}

function New-TransparentPng {
  param(
    [Parameter(Mandatory = $true)]
    [string]$SourcePath,

    [Parameter(Mandatory = $true)]
    [int]$Size,

    [Parameter(Mandatory = $true)]
    [string]$OutputPath
  )

  Invoke-Magick @(
    $SourcePath,
    "-resize", "$($Size)x$($Size)",
    "-depth", "8",
    "PNG32:$OutputPath"
  )
}

function New-TransparentBasePng {
  param(
    [Parameter(Mandatory = $true)]
    [string]$SourceSvg,

    [Parameter(Mandatory = $true)]
    [string]$OutputPath
  )

  Invoke-Magick @(
    "-background", "none",
    "-density", "1024",
    $SourceSvg,
    "-resize", "1024x1024",
    "-depth", "8",
    "PNG32:$OutputPath"
  )
}

function New-OpaquePng {
  param(
    [Parameter(Mandatory = $true)]
    [string]$SourcePath,

    [Parameter(Mandatory = $true)]
    [int]$Size,

    [Parameter(Mandatory = $true)]
    [string]$OutputPath
  )

  $transparentPath = Join-Path $tempDir "opaque-source-$Size.png"

  New-TransparentPng -SourcePath $SourcePath -Size $Size -OutputPath $transparentPath

  Invoke-Magick @(
    "-size", "$($Size)x$($Size)",
    "xc:#111111",
    $transparentPath,
    "-compose", "over",
    "-composite",
    "-depth", "8",
    "PNG24:$OutputPath"
  )
}

$tempDir = Join-Path ([System.IO.Path]::GetTempPath()) "havResonance-favicons-$([System.Guid]::NewGuid().ToString("N"))"
$themes = @("light", "dark")
$icoLayerSizes = @(16, 24, 32, 48, 64, 96, 128, 256)
$faviconPngSizes = @(16, 32, 96)
$generatedIconCleanupPatterns = @("favicon*.*", "apple-touch-icon.png", "android-chrome-*.png")
$defaultTheme = "dark"
$basePngs = @{}

New-Item -ItemType Directory -Path $tempDir | Out-Null

try {
  foreach ($pattern in $generatedIconCleanupPatterns) {
    $staleIcons = Get-ChildItem -Path (Join-Path $publicDir $pattern) -File -ErrorAction SilentlyContinue

    foreach ($staleIcon in $staleIcons) {
      Remove-Item -LiteralPath $staleIcon.FullName -Force
    }
  }

  foreach ($theme in $themes) {
    $sourceSvg = $sourceSvgs[$theme]
    $basePath = Join-Path $tempDir "favicon-$theme-base.png"
    $icoLayerPaths = @()

    New-TransparentBasePng -SourceSvg $sourceSvg -OutputPath $basePath

    $basePngs[$theme] = $basePath

    foreach ($size in $icoLayerSizes) {
      $layerPath = Join-Path $tempDir "favicon-$theme-$($size)x$($size).png"

      New-TransparentPng -SourcePath $basePath -Size $size -OutputPath $layerPath

      $icoLayerPaths += $layerPath

      if ($faviconPngSizes -contains $size) {
        $outputFileName = if ($size -eq 96) {
          "favicon-$theme.png"
        } else {
          "favicon-$theme-$($size)x$($size).png"
        }

        Copy-Item -LiteralPath $layerPath -Destination (Join-Path $publicDir $outputFileName) -Force
      }
    }

    Invoke-Magick ($icoLayerPaths + @((Join-Path $publicDir "favicon-$theme.ico")))
  }

  Copy-Item -LiteralPath (Join-Path $publicDir "favicon-$defaultTheme-16x16.png") -Destination (Join-Path $publicDir "favicon-16x16.png") -Force
  Copy-Item -LiteralPath (Join-Path $publicDir "favicon-$defaultTheme-32x32.png") -Destination (Join-Path $publicDir "favicon-32x32.png") -Force
  Copy-Item -LiteralPath (Join-Path $publicDir "favicon-$defaultTheme.png") -Destination (Join-Path $publicDir "favicon.png") -Force

  New-OpaquePng -SourcePath ($basePngs[$defaultTheme]) -Size 180 -OutputPath (Join-Path $publicDir "apple-touch-icon.png")
  New-OpaquePng -SourcePath ($basePngs[$defaultTheme]) -Size 192 -OutputPath (Join-Path $publicDir "android-chrome-192x192.png")
  New-OpaquePng -SourcePath ($basePngs[$defaultTheme]) -Size 512 -OutputPath (Join-Path $publicDir "android-chrome-512x512.png")

$manifest = @'
{
  "name": "havResonance",
  "short_name": "havResonance",
  "icons": [
    {
      "src": "favicon-16x16.png",
      "sizes": "16x16",
      "type": "image/png"
    },
    {
      "src": "favicon-32x32.png",
      "sizes": "32x32",
      "type": "image/png"
    },
    {
      "src": "favicon.png",
      "sizes": "96x96",
      "type": "image/png"
    },
    {
      "src": "android-chrome-192x192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "android-chrome-512x512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ],
  "theme_color": "#111111",
  "background_color": "#111111",
  "display": "standalone"
}
'@

  $utf8NoBom = New-Object System.Text.UTF8Encoding($false)

  [System.IO.File]::WriteAllText((Join-Path $publicDir "site.webmanifest"), $manifest, $utf8NoBom)

  Write-Host "Generated themed favicon and app icon assets in $publicDir"
} finally {
  if (Test-Path -LiteralPath $tempDir) {
    Remove-Item -LiteralPath $tempDir -Recurse -Force
  }
}
