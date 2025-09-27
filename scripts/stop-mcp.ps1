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
            $map["process_stopped_at_$name"] = (Get-Date).ToString('o')
            # remove process pid entry
            if ($map.ContainsKey("process_pid_$name")) { $map.Remove("process_pid_$name") }
        }
    }
    catch {
        Write-Warning ("Error stopping PID {0}: {1}" -f $procId, $_)
        $allStopped = $false
    }
}

# After stopping processes, attempt to stop any recorded containers
$dockerCmd = Get-Command docker -ErrorAction SilentlyContinue
if ($dockerCmd) {
    $containerKeys = $map.PSObject.Properties | Where-Object { $_.Name -like 'container_*' -or $_.Name -like 'containerid_*' }
    foreach ($ck in $containerKeys) {
        $cname = $ck.Value
        if (-not $cname) { continue }
        try {
            Write-Output "Stopping container: $cname"
            & docker stop $cname | Out-Null
            Write-Output "Stopped container $cname"
            # Remove the container entry from map
            if ($map.ContainsKey($ck.Name)) { $map.Remove($ck.Name) }
        }
        catch {
            Write-Warning "Failed to stop container $cname: $_"
        }
    }
}
else {
    Write-Output 'Docker not available; skipping container cleanup.'
}

# If we removed container entries and all processes stopped, update pids.json accordingly
if ($allStopped -or $Force) {
    try {
        if (Test-Path $pidsPath) { Remove-Item $pidsPath -Force -ErrorAction SilentlyContinue }
        if (Test-Path $statePath) { Remove-Item $statePath -Force -ErrorAction SilentlyContinue }
        if (Test-Path $stopMarker) { Remove-Item $stopMarker -Force -ErrorAction SilentlyContinue }
        Write-Output "All processes and containers cleaned (or Force passed)."
        exit 0
    }
    catch {
        Write-Warning "Cleanup partially completed: $_"
        exit 0
    }
}
else {
    # Write updated map back to pids.json so stoppedAt timestamps are recorded even if not removing file
    try { $map | ConvertTo-Json -Depth 5 | Set-Content -Path $pidsPath -Encoding UTF8 } catch { Write-Warning "Failed to update pids.json with timestamps: $_" }
    Write-Warning "Some processes did not stop cleanly. Container cleanup attempted where possible. pids.json not removed; inspect running processes and containers and try again with --Force if necessary."
    exit 2
}