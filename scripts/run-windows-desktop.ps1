$ErrorActionPreference = "Stop"

$repositoryRoot = Split-Path -Parent $PSScriptRoot
$node = Get-Command node -ErrorAction SilentlyContinue
$corepack = Get-Command corepack -ErrorAction SilentlyContinue
$portableNodeDirectory = Join-Path $env:LOCALAPPDATA "meeting-copilot\toolchain\node-v22.14.0-win-x64"

if (-not $node -and (Test-Path (Join-Path $portableNodeDirectory "node.exe"))) {
  $node = Get-Item (Join-Path $portableNodeDirectory "node.exe")
}
if (-not $corepack -and (Test-Path (Join-Path $portableNodeDirectory "corepack.cmd"))) {
  $corepack = Get-Item (Join-Path $portableNodeDirectory "corepack.cmd")
}

if (-not $node -and (Test-Path "$env:ProgramFiles\nodejs\node.exe")) {
  $node = Get-Item "$env:ProgramFiles\nodejs\node.exe"
}
if (-not $corepack -and (Test-Path "$env:ProgramFiles\nodejs\corepack.cmd")) {
  $corepack = Get-Item "$env:ProgramFiles\nodejs\corepack.cmd"
}
if (-not $node -or -not $corepack) {
  throw "Node.js and Corepack were not found. Install Node.js 22 or newer and reopen PowerShell."
}
$nodePath = if ($node.Source) { $node.Source } else { $node.FullName }
$corepackPath = if ($corepack.Source) { $corepack.Source } else { $corepack.FullName }
$shimDirectory = Join-Path $env:LOCALAPPDATA "meeting-copilot\bin"

if ([version](& $nodePath --version).TrimStart("v") -lt [version]"22.0.0") {
  throw "Node.js 22 or newer is required."
}

New-Item -ItemType Directory -Force -Path $shimDirectory | Out-Null
& $corepackPath enable --install-directory $shimDirectory
$env:PATH = "$(Split-Path $nodePath);$shimDirectory;$env:PATH"
$pnpm = Join-Path $shimDirectory "pnpm.cmd"

Push-Location $repositoryRoot
try {
  & powershell.exe -NoProfile -ExecutionPolicy Bypass -File `
    (Join-Path $PSScriptRoot "build-native-audio.ps1")
  if ($LASTEXITCODE -ne 0) {
    throw "Could not build the native WASAPI audio helper."
  }

  if (-not (Test-Path "node_modules")) {
    & $pnpm install --frozen-lockfile
  }

  if (-not (Test-Path ".env")) {
    Copy-Item ".env.example" ".env"
    Write-Warning "Created .env. Configure OPENAI_API_KEY before testing transcription."
  }

  & $pnpm dev:desktop
}
finally {
  Pop-Location
}
