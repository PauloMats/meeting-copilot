$ErrorActionPreference = "Stop"

$repositoryRoot = Split-Path -Parent $PSScriptRoot
$node = Get-Command node -ErrorAction Stop
$corepack = Get-Command corepack -ErrorAction Stop
$shimDirectory = Join-Path $env:LOCALAPPDATA "meeting-copilot\bin"

if ([version](& $node.Source --version).TrimStart("v") -lt [version]"22.0.0") {
  throw "Node.js 22 or newer is required."
}

New-Item -ItemType Directory -Force -Path $shimDirectory | Out-Null
& $corepack.Source enable --install-directory $shimDirectory
$env:PATH = "$(Split-Path $node.Source);$shimDirectory;$env:PATH"
$pnpm = Join-Path $shimDirectory "pnpm.cmd"

Push-Location $repositoryRoot
try {
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
