param(
    [string]$Only = 'fs,tavily,sse',
    [int]$HeartbeatMs = 4000,
    [switch]$WithSse,
    [switch]$FailFast,
    [int]$MaxRestarts = 3,
    [string]$Backoff = '500-4000'
)

$ErrorActionPreference = 'Stop'

# Build argument list
$argsList = @('scripts/mcp_supervisor.mjs', '--only', $Only, '--heartbeat-ms', $HeartbeatMs, '--max-restarts', $MaxRestarts, '--backoff-ms', $Backoff)
if ($WithSse) { $argsList += '--with-sse' }
if ($FailFast) { $argsList += '--fail-fast' }

Write-Host "Running supervisor: node $($argsList -join ' ')" -ForegroundColor Cyan

node @argsList
