param(
  [string]$Configuration = "Release"
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

$repositoryRoot = Split-Path -Parent $PSScriptRoot
$toolchainDirectory = Join-Path $env:LOCALAPPDATA "meeting-copilot\toolchain"
$localDotnet = Join-Path $toolchainDirectory "dotnet\dotnet.exe"
$dotnet = Get-Command dotnet -ErrorAction SilentlyContinue

if (-not $dotnet -and -not (Test-Path $localDotnet)) {
  New-Item -ItemType Directory -Force -Path $toolchainDirectory | Out-Null
  $installScript = Join-Path $env:TEMP "meeting-copilot-dotnet-install.ps1"
  Invoke-WebRequest -UseBasicParsing "https://dot.net/v1/dotnet-install.ps1" -OutFile $installScript
  & powershell.exe -NoProfile -ExecutionPolicy Bypass -File $installScript `
    -Channel "8.0" `
    -Architecture "x64" `
    -InstallDir (Split-Path $localDotnet) `
    -NoPath
  if ($LASTEXITCODE -ne 0) {
    throw "Could not install the local .NET 8 build toolchain."
  }
}

$dotnetPath = if ($dotnet) { $dotnet.Source } else { $localDotnet }
$project = Join-Path $repositoryRoot "native\windows-audio-capture\MeetingCopilot.AudioCapture.csproj"
$output = Join-Path $repositoryRoot "native\windows-audio-capture\publish"

New-Item -ItemType Directory -Force -Path $output | Out-Null
Invoke-NativeCommand $dotnetPath @(
  "publish",
  $project,
  "--disable-build-servers",
  "--configuration", $Configuration,
  "--runtime", "win-x64",
  "--self-contained", "true",
  "--output", $output,
  "-p:PublishSingleFile=true",
  "-p:EnableCompressionInSingleFile=true",
  "-p:PublishTrimmed=false",
  "-p:DebugType=None",
  "-p:DebugSymbols=false"
)

$executable = Join-Path $output "MeetingCopilot.AudioCapture.exe"
if (-not (Test-Path $executable)) {
  throw "The WASAPI helper executable was not produced."
}

[PSCustomObject]@{
  File = $executable
  SizeBytes = (Get-Item $executable).Length
  SHA256 = (Get-FileHash -Algorithm SHA256 $executable).Hash
} | Format-Table -AutoSize
