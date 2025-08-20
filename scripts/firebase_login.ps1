Param(
    [switch]$Reauth
)
$ErrorActionPreference = 'Stop'

$refresh = Join-Path $PSScriptRoot 'refresh_node_path.ps1'
if (Test-Path $refresh) { & $refresh }

$npmBin = Join-Path $env:APPDATA 'npm'
$nodeLink = Join-Path $env:LOCALAPPDATA 'nodejs'
foreach ($p in @($nodeLink,$npmBin)) { if ($env:PATH -notlike "*$p*") { $env:PATH = "$p;$env:PATH" } }

$exe = 'npx'
$cmdArgs = @('-y','firebase-tools@latest','login')
if ($Reauth) { $cmdArgs += '--reauth' }

& $exe @cmdArgs
