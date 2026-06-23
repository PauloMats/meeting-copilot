$ErrorActionPreference = "Stop"

$repositoryRoot = Split-Path -Parent $PSScriptRoot
$node = Get-Command node -ErrorAction Stop
$corepack = Get-Command corepack -ErrorAction Stop

if ([version](& $node.Source --version).TrimStart("v") -lt [version]"22.0.0") {
  throw "Node.js 22 or newer is required."
}

Push-Location $repositoryRoot
try {
  if (-not (Test-Path "node_modules")) {
    & $corepack.Source pnpm install --frozen-lockfile
  }

  if (-not (Test-Path ".env")) {
    Copy-Item ".env.example" ".env"
    Write-Warning "Created .env. Configure OPENAI_API_KEY before testing transcription."
  }

  & $corepack.Source pnpm dev:desktop
}
finally {
  Pop-Location
}
