# Start a single MCP service by name.
# Usage: powershell -ExecutionPolicy Bypass -File ./scripts/start-mcp-service.ps1 -Service <name> [-SkipLocalBuild]
param(
    [Parameter(Mandatory = $true)] [string] $Service,
    [switch] $SkipLocalBuild
)

$ErrorActionPreference = 'Stop'
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
$repoRoot = Resolve-Path (Join-Path $scriptDir '..')
Set-Location $repoRoot

$logsDir = Join-Path $repoRoot 'logs'
if (-Not (Test-Path $logsDir)) { New-Item -ItemType Directory -Path $logsDir | Out-Null }

function Start-NpxProcess {
    param(
        [string[]] $NpxArgs,
        [string] $StdOutFile,
        [string] $StdErrFile,
        [int] $RetryCount = 2
    )
    try {
        for ($attempt = 1; $attempt -le $RetryCount; $attempt++) {
            $isWin = $env:OS -eq 'Windows_NT'
            if ($isWin) {
                $p = Start-Process -FilePath 'cmd.exe' -ArgumentList @('/c', 'npx', '-y') + $NpxArgs -RedirectStandardOutput $StdOutFile -RedirectStandardError $StdErrFile -NoNewWindow -PassThru
            }
            else {
                $p = Start-Process -FilePath 'npx' -ArgumentList @('-y') + $NpxArgs -RedirectStandardOutput $StdOutFile -RedirectStandardError $StdErrFile -NoNewWindow -PassThru
            }
            Start-Sleep -Milliseconds 800
            $err = Get-Content $StdErrFile -Raw -ErrorAction SilentlyContinue
            if ($err -match 'TAR_ENTRY_ERROR|ERR_MODULE_NOT_FOUND|Error running script') {
                if ($attempt -lt $RetryCount) {
                    Write-Output "npx attempt $attempt failed; running 'npm cache verify' and retrying..."
                    try { Start-Process -FilePath 'npm' -ArgumentList @('cache', 'verify') -NoNewWindow -Wait -PassThru | Out-Null } catch {}
                    Start-Sleep -Milliseconds 400
                    continue
                }
                else {
                    Write-Output "npx failed after $RetryCount attempts; see $StdErrFile for details."
                }
            }
            return $p.Id
        }
    }
    catch {
        Write-Output "Failed to start npx process: $_"
        return $null
    }
}

# Map service names to start logic
$lower = $Service.ToLower()
$procId = $null
switch ($lower) {
    'everything-sse' {
        $env:PORT = '3001'
        $sseLog = Join-Path $logsDir 'everything-sse.log'
        $sseErr = Join-Path $logsDir 'everything-sse.err.log'
        $local = Join-Path $repoRoot 'servers/src/everything/dist/sse.js'
        if (-not $SkipLocalBuild -and (Test-Path $local)) {
            $proc = Start-Process node -ArgumentList @($local) -RedirectStandardOutput $sseLog -RedirectStandardError $sseErr -PassThru
            $procId = $proc.Id
        }
        else {
            $procId = Start-NpxProcess @('@modelcontextprotocol/server-everything@latest', 'sse') $sseLog $sseErr
        }
    }
    'everything-streamable' {
        $env:PORT = '3002'
        $streamLog = Join-Path $logsDir 'everything-streamable.log'
        $streamErr = Join-Path $logsDir 'everything-streamable.err.log'
        $local = Join-Path $repoRoot 'servers/src/everything/dist/streamableHttp.js'
        if (-not $SkipLocalBuild -and (Test-Path $local)) {
            $proc = Start-Process node -ArgumentList @($local) -RedirectStandardOutput $streamLog -RedirectStandardError $streamErr -PassThru
            $procId = $proc.Id
        }
        else {
            $procId = Start-NpxProcess @('@modelcontextprotocol/server-everything@latest', 'streamableHttp') $streamLog $streamErr
        }
    }
    'filesystem' {
        $logFile = Join-Path $logsDir 'filesystem.log'
        $errFile = Join-Path $logsDir 'filesystem.err.log'
        if (-not $SkipLocalBuild) {
            $local = Join-Path $repoRoot 'servers/src/filesystem/dist/index.js'
            if (Test-Path $local) {
                $proc = Start-Process node -ArgumentList @($local) -RedirectStandardOutput $logFile -RedirectStandardError $errFile -PassThru
                $procId = $proc.Id
            }
        }
        if (-not $procId) {
            $procId = Start-NpxProcess @('@modelcontextprotocol/server-filesystem@latest', $repoRoot) $logFile $errFile
        }
    }
    'memory' {
        $logFile = Join-Path $logsDir 'memory.log'
        $errFile = Join-Path $logsDir 'memory.err.log'
        if (-not $SkipLocalBuild) {
            $local = Join-Path $repoRoot 'servers/src/memory/dist/index.js'
            if (Test-Path $local) {
                $proc = Start-Process node -ArgumentList @($local) -RedirectStandardOutput $logFile -RedirectStandardError $errFile -PassThru
                $procId = $proc.Id
            }
        }
        if (-not $procId) {
            $procId = Start-NpxProcess @('@modelcontextprotocol/server-memory@latest') $logFile $errFile
        }
    }
    'sequentialthinking' {
        $logFile = Join-Path $logsDir 'sequentialthinking.log'
        $errFile = Join-Path $logsDir 'sequentialthinking.err.log'
        if (-not $SkipLocalBuild) {
            $local = Join-Path $repoRoot 'servers/src/sequentialthinking/dist/index.js'
            if (Test-Path $local) {
                $proc = Start-Process node -ArgumentList @($local) -RedirectStandardOutput $logFile -RedirectStandardError $errFile -PassThru
                $procId = $proc.Id
            }
        }
        if (-not $procId) {
            $procId = Start-NpxProcess @('@modelcontextprotocol/server-sequential-thinking@latest') $logFile $errFile
        }
    }
    'git' {
        $py = Join-Path $repoRoot 'servers/src/git/src/mcp_server_git/server.py'
        if (Test-Path $py) {
            $pyLog = Join-Path $logsDir ((Split-Path $py -Leaf) + '.log')
            $pyErr = Join-Path $logsDir ((Split-Path $py -Leaf) + '.err.log')
            $proc = Start-Process python -ArgumentList @($py) -RedirectStandardOutput $pyLog -RedirectStandardError $pyErr -PassThru
            $procId = $proc.Id
        }
    }
    'fetch' {
        $py = Join-Path $repoRoot 'servers/src/fetch/src/mcp_server_fetch/server.py'
        if (Test-Path $py) {
            $pyLog = Join-Path $logsDir ((Split-Path $py -Leaf) + '.log')
            $pyErr = Join-Path $logsDir ((Split-Path $py -Leaf) + '.err.log')
            $proc = Start-Process python -ArgumentList @($py) -RedirectStandardOutput $pyLog -RedirectStandardError $pyErr -PassThru
            $procId = $proc.Id
        }
    }
    'time' {
        $py = Join-Path $repoRoot 'servers/src/time/src/mcp_server_time/server.py'
        if (Test-Path $py) {
            $pyLog = Join-Path $logsDir ((Split-Path $py -Leaf) + '.log')
            $pyErr = Join-Path $logsDir ((Split-Path $py -Leaf) + '.err.log')
            $proc = Start-Process python -ArgumentList @($py) -RedirectStandardOutput $pyLog -RedirectStandardError $pyErr -PassThru
            $procId = $proc.Id
        }
    }
    default {
        Write-Error "Unknown service name: $Service"
        exit 2
    }
}

if ($procId) {
    # update pids.json
    $pidsPath = Join-Path $logsDir 'pids.json'
    $map = @{
        if (Test-Path $pidsPath) { $map = Get-Content $pidsPath | ConvertFrom-Json }
        $map[$Service] = $procId
        $map | ConvertTo-Json -Depth 3 | Set-Content -Path $pidsPath -Encoding UTF8
        Write-Output "Started service $Service with PID $procId (logs: see $logsDir)"
        exit 0
    }
    else {
        Write-Error "Failed to start $Service"
        exit 1
    }