# Stop MCP servers listed in logs/pids.json; remove pids.json only if all processes are successfully stopped
param(
    [switch] $Force
)
$ErrorActionPreference = 'Stop'
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
$repoRoot = Resolve-Path (Join-Path $scriptDir '..')
Set-Location $repoRoot
$logsDir = Join-Path $repoRoot 'logs'
$pidsPath = Join-Path $logsDir 'pids.json'
$statePath = Join-Path $logsDir 'monitor-state.json'
$stopMarker = Join-Path $logsDir 'stop-requested'

if (-not (Test-Path $pidsPath)) { Write-Output 'No pids.json found; nothing to stop.'; exit 0 }

# create stop marker so monitor suppresses restarts for a short window
try { New-Item -Path $stopMarker -ItemType File -Force | Out-Null } catch {}

$map = @{}
try { $map = Get-Content $pidsPath | ConvertFrom-Json } catch { Write-Warning 'Failed to read pids.json'; exit 1 }
$allStopped = $true
foreach ($prop in $map.PSObject.Properties) {
    $name = $prop.Name
    $procId = $prop.Value
    try {
        Write-Output "Stopping $name (PID $procId)"
        Stop-Process -Id $procId -Force -ErrorAction SilentlyContinue
        Start-Sleep -Milliseconds 300
        if (Get-Process -Id $procId -ErrorAction SilentlyContinue) {
            Write-Warning "PID $procId still running"
            $allStopped = $false
        }
        else {
            Write-Output "PID $procId stopped"
        }
    }
    catch {
        Write-Warning ("Error stopping PID {0}: {1}" -f $procId, $_)
        $allStopped = $false
    }
}

if ($allStopped -or $Force) {
    try { Remove-Item $pidsPath -Force -ErrorAction SilentlyContinue } catch { Write-Warning "Failed to remove pids.json: $_" }
    # cleanup monitor state
    if (Test-Path $statePath) { Remove-Item $statePath -Force -ErrorAction SilentlyContinue }
    # remove stop marker
    if (Test-Path $stopMarker) { Remove-Item $stopMarker -Force -ErrorAction SilentlyContinue }
    Write-Output "All processes stopped (or Force passed). Cleaned pids.json and monitor state."
    exit 0
}
else {
    Write-Warning "Some processes did not stop cleanly. pids.json not removed; inspect running processes and try again with --Force if necessary."
    exit 2
}