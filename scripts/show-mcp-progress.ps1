# show-mcp-progress.ps1
# Simple visual progress monitor for MCP orchestrator runs.
# Tails logs/*.log and reads logs/pids.json to show per-service status.
# Run this while the orchestrator is starting to determine whether it's frozen.

param()

$ScriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Definition
$logsDir = Join-Path $ScriptRoot '..\logs' | Resolve-Path -ErrorAction SilentlyContinue
if (-not $logsDir) {
    New-Item -ItemType Directory -Path (Join-Path $ScriptRoot '..\logs') -Force | Out-Null
    $logsDir = Join-Path $ScriptRoot '..\logs' | Resolve-Path
}
$logsDir = $logsDir.ProviderPath

$spinner = @('|', '/', '-', '\\')
$frame = 0

function Read-PidsJson {
    $pidsFile = Join-Path $logsDir 'pids.json'
    if (Test-Path $pidsFile) {
        try { return Get-Content $pidsFile -Raw | ConvertFrom-Json } catch { return $null }
    }
    return $null
}

function Get-FileTail($filePath, $lines = 5) {
    if (Test-Path $filePath) {
        try { return Get-Content $filePath -Tail $lines -ErrorAction SilentlyContinue } catch { return @() }
    }
    return @()
}

while ($true) {
    Clear-Host
    Write-Host "MCP Progress Monitor - $(Get-Date -Format 'u')" -ForegroundColor Cyan
    Write-Host "(Press Ctrl+C to exit)" -ForegroundColor DarkGray
    Write-Host ""

    $pids = Read-PidsJson
    if ($pids) {
        Write-Host "PIDs:" -ForegroundColor Yellow
        foreach ($prop in $pids.PSObject.Properties) {
            $svcName = $prop.Name
            $svcPid = $prop.Value
            $proc = Get-Process -Id $svcPid -ErrorAction SilentlyContinue
            $status = if ($proc) { 'RUNNING' } else { 'NOT RUNNING' }
            Write-Host "  {0,-30} {1,-12} PID:{2}" -f $svcName, $status, $svcPid
        }
    }
    else {
        Write-Host "No pids.json found yet. The orchestrator may not have written PIDs." -ForegroundColor Yellow
    }

    Write-Host ""
    Write-Host "Recent log outputs:" -ForegroundColor Yellow

    $logFiles = Get-ChildItem -Path $logsDir -Filter '*.log' -ErrorAction SilentlyContinue | Sort-Object Name
    if (-not $logFiles) {
        Write-Host "  No .log files found in logs/ yet. Waiting for logs to appear..." -ForegroundColor DarkGray
    }
    else {
        foreach ($log in $logFiles) {
            Write-Host "--- $($log.Name) ---" -ForegroundColor Green
            $lines = Get-FileTail $log.FullName 5
            if ($lines -and $lines.Count -gt 0) {
                foreach ($line in $lines) { Write-Host "  $line" }
            }
            else {
                Write-Host "  (no recent output)" -ForegroundColor DarkGray
            }
            Write-Host ""
        }
    }

    Write-Host "Monitor: $($spinner[$frame % $spinner.Length])" -NoNewline
    $frame++
    Start-Sleep -Seconds 1
}
