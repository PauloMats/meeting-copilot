param(
  [string]$OutputDirectory = (Join-Path ([Environment]::GetFolderPath("MyDocuments")) "Meeting Copilot\Builds"),
  [switch]$SkipChecks
)

$ErrorActionPreference = "Stop"

$repositoryRoot = Split-Path -Parent $PSScriptRoot
$node = Get-Command node -ErrorAction SilentlyContinue
$corepack = Get-Command corepack -ErrorAction SilentlyContinue

if (-not $node -and (Test-Path "$env:ProgramFiles\nodejs\node.exe")) {
  $node = Get-Item "$env:ProgramFiles\nodejs\node.exe"
}
if (-not $corepack -and (Test-Path "$env:ProgramFiles\nodejs\corepack.cmd")) {
  $corepack = Get-Item "$env:ProgramFiles\nodejs\corepack.cmd"
}
if (-not $node -or -not $corepack) {
  throw "Node.js and Corepack were not found. Install Node.js 22 or add a portable Node.js directory to PATH."
}

$nodePath = if ($node.Source) { $node.Source } else { $node.FullName }
$corepackPath = if ($corepack.Source) { $corepack.Source } else { $corepack.FullName }
if ([version](& $nodePath --version).TrimStart("v") -lt [version]"22.0.0") {
  throw "Node.js 22 or newer is required."
}

$shimDirectory = Join-Path $env:LOCALAPPDATA "meeting-copilot\bin"
New-Item -ItemType Directory -Force -Path $shimDirectory | Out-Null
& $corepackPath enable --install-directory $shimDirectory
$env:PATH = "$(Split-Path $nodePath);$shimDirectory;$env:PATH"
$pnpm = Join-Path $shimDirectory "pnpm.cmd"

Push-Location $repositoryRoot
try {
  & $pnpm install --frozen-lockfile
  if (-not $SkipChecks) {
    & $pnpm check
  }

  & $pnpm desktop:dist:win
  & $pnpm desktop:dist:win:installer

  New-Item -ItemType Directory -Force -Path $OutputDirectory | Out-Null
  $artifacts = Get-ChildItem "apps\desktop\release\Meeting Copilot-*.exe"
  if (-not $artifacts) {
    throw "No Windows release artifacts were produced."
  }

  foreach ($artifact in $artifacts) {
    Copy-Item -Force $artifact.FullName (Join-Path $OutputDirectory $artifact.Name)
  }

  $artifacts | ForEach-Object {
    $destination = Join-Path $OutputDirectory $_.Name
    [PSCustomObject]@{
      File = $destination
      SizeBytes = (Get-Item $destination).Length
      SHA256 = (Get-FileHash -Algorithm SHA256 $destination).Hash
    }
  } | Format-Table -AutoSize
}
finally {
  Pop-Location
}
