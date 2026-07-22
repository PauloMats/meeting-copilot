param(
  [string]$OutputDirectory = (Join-Path ([Environment]::GetFolderPath("MyDocuments")) "Meeting Copilot\Builds"),
  [switch]$SkipChecks
)

$ErrorActionPreference = "Stop"

function Invoke-NativeCommand {
  param(
    [Parameter(Mandatory = $true)]
    [string]$FilePath,
    [string[]]$Arguments = @()
  )

  $stdout = Join-Path $env:TEMP "meeting-copilot-$([Guid]::NewGuid()).out"
  $stderr = Join-Path $env:TEMP "meeting-copilot-$([Guid]::NewGuid()).err"
  $quotedArguments = $Arguments | ForEach-Object {
    if ($_ -match '\s') { '"' + ($_ -replace '"', '\"') + '"' } else { $_ }
  }
  try {
    $process = Start-Process `
      -FilePath $FilePath `
      -ArgumentList $quotedArguments `
      -WorkingDirectory (Get-Location).Path `
      -NoNewWindow `
      -Wait `
      -PassThru `
      -RedirectStandardOutput $stdout `
      -RedirectStandardError $stderr
    Get-Content $stdout -ErrorAction SilentlyContinue | Write-Host
    Get-Content $stderr -ErrorAction SilentlyContinue | Write-Host
    if ($process.ExitCode -ne 0) {
      throw "Command failed with exit code $($process.ExitCode): $FilePath $($Arguments -join ' ')"
    }
  }
  finally {
    Remove-Item $stdout, $stderr -Force -ErrorAction SilentlyContinue
  }
}

function Get-NativeCommandOutput {
  param(
    [Parameter(Mandatory = $true)]
    [string]$FilePath,
    [string[]]$Arguments = @()
  )

  $stdout = Join-Path $env:TEMP "meeting-copilot-$([Guid]::NewGuid()).out"
  $stderr = Join-Path $env:TEMP "meeting-copilot-$([Guid]::NewGuid()).err"
  try {
    $process = Start-Process -FilePath $FilePath -ArgumentList $Arguments -NoNewWindow -Wait -PassThru `
      -RedirectStandardOutput $stdout -RedirectStandardError $stderr
    if ($process.ExitCode -ne 0) {
      throw (Get-Content $stderr -Raw -ErrorAction SilentlyContinue)
    }
    return (Get-Content $stdout -Raw).Trim()
  }
  finally {
    Remove-Item $stdout, $stderr -Force -ErrorAction SilentlyContinue
  }
}

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
  throw "Node.js and Corepack were not found. Install Node.js 22 or add a portable Node.js directory to PATH."
}

$nodePath = if ($node.Source) { $node.Source } else { $node.FullName }
$corepackPath = if ($corepack.Source) { $corepack.Source } else { $corepack.FullName }
$nodeVersion = Get-NativeCommandOutput $nodePath @("--version")
if ([version]($nodeVersion.TrimStart("v")) -lt [version]"22.0.0") {
  throw "Node.js 22 or newer is required."
}

$shimDirectory = Join-Path $env:LOCALAPPDATA "meeting-copilot\bin"
New-Item -ItemType Directory -Force -Path $shimDirectory | Out-Null
Invoke-NativeCommand $corepackPath @("enable", "--install-directory", $shimDirectory)
$env:PATH = "$repositoryRoot\node_modules\.bin;$(Split-Path $nodePath);$shimDirectory;$env:PATH"
$pnpmScript = Join-Path (Split-Path $nodePath) "node_modules\corepack\dist\pnpm.js"
$pnpmShim = Join-Path $shimDirectory "pnpm.cmd"
@"
@echo off
"$nodePath" "$pnpmScript" %*
"@ | Set-Content -Encoding ASCII $pnpmShim
$env:npm_config_user_agent = "pnpm/10.12.1 node/$((Get-NativeCommandOutput $nodePath @('--version')).TrimStart('v')) win32 x64"
$env:npm_execpath = $pnpmShim

Push-Location $repositoryRoot
try {
  Invoke-NativeCommand powershell.exe @(
    "-NoProfile",
    "-ExecutionPolicy", "Bypass",
    "-File", (Join-Path $PSScriptRoot "build-native-audio.ps1")
  )

  # Force a native dependency refresh so a lockfile last used on Linux/WSL
  # cannot leave out Windows-only Electron and esbuild packages.
  Invoke-NativeCommand $nodePath @(
    $pnpmScript,
    "install",
    "--frozen-lockfile",
    "--force",
    "--config.node-linker=hoisted"
  )
  if (-not $SkipChecks) {
    foreach ($check in @("lint", "typecheck", "test", "build")) {
      Invoke-NativeCommand $nodePath @($pnpmScript, $check)
    }
  }

  $desktopDirectory = Join-Path $repositoryRoot "apps\desktop"
  $electronViteCli = Join-Path $repositoryRoot "node_modules\electron-vite\bin\electron-vite.js"
  $electronBuilderCli = Join-Path $repositoryRoot "node_modules\electron-builder\cli.js"
  # Use electron-builder's built-in filesystem traversal collector. This avoids
  # invoking a .cmd package-manager shim from a nested PowerShell process.
  $env:npm_config_user_agent = "traversal/1"
  $env:npm_execpath = "traversal"
  Push-Location $desktopDirectory
  try {
    Invoke-NativeCommand $nodePath @($electronViteCli, "build")
    Invoke-NativeCommand $nodePath @($electronBuilderCli, "--win", "portable", "--x64")
    Invoke-NativeCommand $nodePath @($electronViteCli, "build")
    Invoke-NativeCommand $nodePath @($electronBuilderCli, "--win", "nsis", "--x64")
  }
  finally {
    Pop-Location
  }

  New-Item -ItemType Directory -Force -Path $OutputDirectory | Out-Null
  $artifacts = Get-ChildItem "apps\desktop\release\Meeting Copilot-*.exe" -ErrorAction SilentlyContinue
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
