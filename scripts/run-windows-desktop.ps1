$ErrorActionPreference = "Stop"

$repositoryRoot = Split-Path -Parent $PSScriptRoot
$node = Get-Command node -ErrorAction Stop

if ([version](& $node.Source --version).TrimStart("v") -lt [version]"22.0.0") {
  throw "Node.js 22 or newer is required."
}

corepack enable
corepack prepare pnpm@10.12.1 --activate

Push-Location $repositoryRoot
try {
  if (-not (Test-Path "node_modules")) {
    pnpm install --frozen-lockfile
  }

  if (-not (Test-Path ".env")) {
    Copy-Item ".env.example" ".env"
    Write-Warning "Created .env. Configure OPENAI_API_KEY before testing transcription."
  }

  pnpm dev:desktop
}
finally {
  Pop-Location
}
