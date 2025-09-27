$ErrorActionPreference = 'Stop'
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
$repoRoot = Resolve-Path (Join-Path $scriptDir '..')
Set-Location $repoRoot
$logsDir = Join-Path $repoRoot 'logs'
if (-not (Test-Path $logsDir)) { New-Item -Path $logsDir -ItemType Directory | Out-Null }
$ts = Get-Date -Format 'yyyyMMdd_HHmmss'
$bundlePath = Join-Path $logsDir "repo-backup-$ts.bundle"
Write-Output "Creating bundle: $bundlePath"
& git bundle create $bundlePath --all
Write-Output "Creating annotated tag: pre-history-cleanup-$ts"
& git tag -a "pre-history-cleanup-$ts" -m "Backup tag before history cleanup $ts"
Write-Output "Pushing tag to origin..."
& git push origin "pre-history-cleanup-$ts"
Write-Output "Created bundle and pushed tag: pre-history-cleanup-$ts"
Write-Output "Bundle path: $bundlePath"