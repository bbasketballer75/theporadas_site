<#
shutdown-mcp.ps1

Orchestrates a graceful shutdown of MCP processes and any ephemeral Docker containers referenced
in logs/pids.json. Runs process cleanup first, then container cleanup, and summarizes the pids.json
state at the end for auditability.
#>
param(
    [string]$RepoRoot = (Resolve-Path ".." -Relative)
)

$ErrorActionPreference = 'Stop'
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
Set-Location (Resolve-Path (Join-Path $scriptDir '..'))

$scriptsDir = Join-Path (Get-Location) 'scripts'

Write-Output "Running process cleanup (stop-mcp.ps1)..."
try {
    & "$scriptsDir/stop-mcp.ps1"
}
catch {
    Write-Warning "stop-mcp.ps1 exited with an error: $_"
}

Write-Output "Running container cleanup (stop-mcp-containers.ps1)..."
try {
    & "$scriptsDir/stop-mcp-containers.ps1"
}
catch {
    Write-Warning "stop-mcp-containers.ps1 exited with an error: $_"
}

$pidsPath = Join-Path (Join-Path (Get-Location) 'logs') 'pids.json'
if (Test-Path $pidsPath) {
    try {
        $final = Get-Content $pidsPath -Raw | ConvertFrom-Json
        Write-Output "Final pids.json content:"; $final | ConvertTo-Json -Depth 5 | Write-Output
    }
    catch {
        Write-Warning "Failed to read final pids.json: $_"
    }
}
else {
    Write-Output "No pids.json present after shutdown."
}

Write-Output "Shutdown orchestration complete."
