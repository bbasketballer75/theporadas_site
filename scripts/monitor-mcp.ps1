<#
Monitor MCP servers once or in watch mode and restart failed services. Optionally continue building local packages after restarts.
Usage:
  powershell -ExecutionPolicy Bypass -File ./scripts/monitor-mcp.ps1 [-Watch] [-IntervalSeconds 15] [-ContinueBuilds] [-SkipLocalBuild]
#>
param(
    [switch] $Watch,
    [int] $IntervalSeconds = 15,
    [switch] $ContinueBuilds,
    [switch] $SkipLocalBuild,
    [int] $MaxRestartAttempts = 3,
    [int] $RestartCooldownSeconds = 300,
    [int] $ManualStopCooldownSeconds = 60
)

$ErrorActionPreference = 'Stop'
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
$repoRoot = Resolve-Path (Join-Path $scriptDir '..')
Set-Location $repoRoot
$logsDir = Join-Path $repoRoot 'logs'
if (-not (Test-Path $logsDir)) { New-Item -ItemType Directory -Path $logsDir | Out-Null }
$pidsPath = Join-Path $logsDir 'pids.json'
$statePath = Join-Path $logsDir 'monitor-state.json'
$stopMarker = Join-Path $logsDir 'stop-requested'

# Load/save monitor state (restart counts, last attempt timestamps)
function Load-State {
    if (-not (Test-Path $statePath)) { return @{ restartCounts = @{}; lastAttempt = @{} } }
    try { return Get-Content $statePath -Raw | ConvertFrom-Json } catch { return @{ restartCounts = @{}; lastAttempt = @{} } }
}

function Save-State($state) {
    try { $state | ConvertTo-Json -Depth 5 | Set-Content -Path $statePath -Encoding UTF8 } catch { Write-Warning "Failed to save monitor state: $_" }
}

# Respect manual stop marker: if present and recent, don't auto-restart
function Is-ManualStopActive {
    if (-not (Test-Path $stopMarker)) { return $false }
    try {
        $age = (Get-Date) - (Get-Item $stopMarker).LastWriteTime
        if ($age.TotalSeconds -lt $ManualStopCooldownSeconds) { return $true }
        return $false
    }
    catch { return $false }
}

function Get-Pids {
    if (-not (Test-Path $pidsPath)) { return @{} }
    try {
        $data = Get-Content $pidsPath -Raw | ConvertFrom-Json
        $map = @{}
        foreach ($prop in $data.PSObject.Properties) { $map[$prop.Name] = $prop.Value }
        return $map
    }
    catch { return @{} }
}

function Set-Pids($map) {
    try {
        $obj = @{}
        foreach ($k in $map.Keys) { $obj[$k] = $map[$k] }
        $obj | ConvertTo-Json -Depth 3 | Set-Content -Path $pidsPath -Encoding UTF8
    }
    catch { Write-Warning "Failed to write pids.json: $_" }
}

function Test-PidRunning($id) {
    if (-not $id) { return $false }
    try { $p = Get-Process -Id $id -ErrorAction SilentlyContinue; return $null -ne $p } catch { return $false }
}

function Test-Port($port) {
    if ($null -eq $port) { return $true }
    try {
        $ok = Test-NetConnection -ComputerName 'localhost' -Port $port -WarningAction SilentlyContinue
        return $ok.TcpTestSucceeded
    }
    catch { return $false }
}

function Start-ServiceByName($serviceName) {
    Write-Output "Attempting to start $serviceName"
    $psArgs = @('-ExecutionPolicy', 'Bypass', '-File', (Join-Path $scriptDir 'start-mcp-service.ps1'), '-Service', $serviceName)
    if ($SkipLocalBuild) { $psArgs += '-SkipLocalBuild' }
    Start-Process -FilePath 'powershell' -ArgumentList $psArgs -NoNewWindow -PassThru | Out-Null
    Start-Sleep -Milliseconds 800
    $map = Get-Pids
    if ($map.ContainsKey($serviceName) -and (Test-PidRunning $map[$serviceName])) { return @{ started = $true; pid = $map[$serviceName] } }
    return @{ started = $false; pid = $null }
}

function Repair-ServicesOnce {
    $map = Get-Pids
    $state = Load-State
    if (-not $state.restartCounts) { $state.restartCounts = @{} }
    if (-not $state.lastAttempt) { $state.lastAttempt = @{} }

    $restarted = @()
    foreach ($svc in $services) {
        $name = $svc.name
        $port = $svc.port
        $exists = $false
        if ($map.ContainsKey($name)) { $exists = Test-PidRunning($map[$name]) }
        if ($null -ne $port) {
            $portOk = Test-Port $port
            if (-not $portOk) { $exists = $false }
        }

        if (-not $exists) {
            # If manual stop marker active, skip auto-restart
            if (Is-ManualStopActive) {
                Write-Output "Manual stop detected; skipping restart of $name"
                continue
            }

            $count = 0
            if ($state.restartCounts.ContainsKey($name)) { $count = [int]$state.restartCounts[$name] }
            $last = $null
            if ($state.lastAttempt.ContainsKey($name)) { $last = Get-Date $state.lastAttempt[$name] }

            # If exceeded attempts and still within cooldown, skip
            if ($count -ge $MaxRestartAttempts) {
                if ($last -ne $null) {
                    $age = (Get-Date) - $last
                    if ($age.TotalSeconds -lt $RestartCooldownSeconds) {
                        Write-Warning "$name has reached max restart attempts ($count). Next attempt after cooldown ($( [int] ($RestartCooldownSeconds - $age.TotalSeconds) ))s)"
                        continue
                    }
                    else {
                        # reset counter after cooldown expired
                        $count = 0
                    }
                }
            }

            Write-Output "$name is not running or not healthy; attempting restart (attempt $($count + 1) / $MaxRestartAttempts)..."
            $r = Start-ServiceByName $name
            $now = Get-Date
            if ($r.started) {
                Write-Output "Restarted $name (PID $($r.pid))"
                $state.restartCounts[$name] = 0
                $state.lastAttempt[$name] = $now.ToString('o')
                $restarted += $name
            }
            else {
                $count = $count + 1
                $state.restartCounts[$name] = $count
                $state.lastAttempt[$name] = $now.ToString('o')
                Write-Warning "Restart attempt $count for $name failed"
                if ($count -ge $MaxRestartAttempts) { Write-Warning "$name reached max restart attempts; will pause retries for $RestartCooldownSeconds seconds" }
            }
            Save-State $state
        }
        else {
            Write-Output "$name is running"
            # Reset restart count on healthy
            if ($state.restartCounts.ContainsKey($name) -and [int]$state.restartCounts[$name] -ne 0) {
                $state.restartCounts[$name] = 0
                Save-State $state
            }
        }
    }
    if (($restarted.Count -gt 0) -and $ContinueBuilds) {
        Write-Output "One or more services were restarted; running workspace build per --ContinueBuilds flag"
        try { npm run build --workspaces } catch { Write-Warning "Workspace build failed: $_" }
    }
}

if ($Watch) {
    Write-Output "Starting monitor in watch mode (interval ${IntervalSeconds}s). Press Ctrl-C to exit."
    while ($true) {
        Repair-ServicesOnce
        Start-Sleep -Seconds $IntervalSeconds
    }
}
else {
    Repair-ServicesOnce
}

Write-Output "Monitor run complete."