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

function Find-RepoRoot {
    param([string] $startPath)
    $cur = (Get-Item $startPath).Directory
    for ($i = 0; $i -lt 12; $i++) {
        if (Test-Path (Join-Path $cur 'package.json') -or Test-Path (Join-Path $cur '.git')) { return $cur.FullName }
        if ($null -eq $cur.Parent) { break }
        $cur = $cur.Parent
    }
    return (Get-Item $startPath).Directory.FullName
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
        $venvPy = Join-Path $repoRoot '.venv\Scripts\python.exe'
        $py = Join-Path $repoRoot 'servers/src/git/src/mcp_server_git/server.py'
        if (Test-Path $venvPy) { $pythonExec = $venvPy } else { $pythonExec = 'python' }
        if (Test-Path $py) {
            $pyLog = Join-Path $logsDir ((Split-Path $py -Leaf) + '.log')
            $pyErr = Join-Path $logsDir ((Split-Path $py -Leaf) + '.err.log')
            # write a short diagnostic header for later debugging
            $debugFile = Join-Path $logsDir 'git.debug.log'
            "Starting git server with python: $pythonExec; script: $py; cwd: $repoRoot" | Out-File -FilePath $debugFile -Encoding utf8 -Append
            $proc = Start-Process $pythonExec -ArgumentList @($py) -RedirectStandardOutput $pyLog -RedirectStandardError $pyErr -PassThru
            $procId = $proc.Id

            # wait briefly for health in both top-level logs and repo-specific logs
            $svcHealthCandidates = @((Join-Path $logsDir 'git.ready'))
            try { $svcRepoRoot = Find-RepoRoot -startPath $py; $svcHealthCandidates += (Join-Path $svcRepoRoot 'logs\git.ready') } catch {}
            $healthFound = $false
            $healthTimeout = (Get-Date).AddSeconds(10)
            while ((Get-Date) -lt $healthTimeout -and -not $healthFound) {
                foreach ($hf in $svcHealthCandidates) { if (Test-Path $hf) { $healthFound = $true; break } }
                Start-Sleep -Milliseconds 200
            }
            if (-not $healthFound) {
                # append current environment snapshot and tail of err log for debugging
                "--- Diagnostic snapshot for git server start ---" | Out-File -FilePath $debugFile -Encoding utf8 -Append
                "PythonExec=$pythonExec" | Out-File -FilePath $debugFile -Encoding utf8 -Append
                "WorkDir=$repoRoot" | Out-File -FilePath $debugFile -Encoding utf8 -Append
                try { if (Test-Path $pyErr) { Get-Content $pyErr -Tail 2000 | Out-File -FilePath $debugFile -Encoding utf8 -Append } }
                catch {}
            }
        }
    }
    'fetch' {
        $venvPy = Join-Path $repoRoot '.venv\Scripts\python.exe'
        $timePackageDir = Join-Path $repoRoot 'servers/src/fetch'
        if (Test-Path $venvPy) { $pythonExec = $venvPy } else { $pythonExec = 'python' }
        $pyLog = Join-Path $logsDir 'fetch.log'
        $pyErr = Join-Path $logsDir 'fetch.err.log'
        if (Test-Path $timePackageDir) {
            $args = @('-m', 'mcp_server_fetch')
            "Starting fetch server with python: $pythonExec; module: mcp_server_fetch; cwd: $timePackageDir" | Out-File -FilePath (Join-Path $logsDir 'fetch.debug.log') -Encoding utf8 -Append
            $proc = Start-Process $pythonExec -ArgumentList $args -RedirectStandardOutput $pyLog -RedirectStandardError $pyErr -WorkingDirectory $timePackageDir -PassThru
            $procId = $proc.Id

            # diagnostic health wait similar to git
            $svcHealthCandidates = @((Join-Path $logsDir 'fetch.ready'))
            try { $svcRepoRoot = Find-RepoRoot -startPath (Join-Path $timePackageDir 'server.py'); $svcHealthCandidates += (Join-Path $svcRepoRoot 'logs\fetch.ready') } catch {}
            $healthFound = $false
            $healthTimeout = (Get-Date).AddSeconds(10)
            while ((Get-Date) -lt $healthTimeout -and -not $healthFound) {
                foreach ($hf in $svcHealthCandidates) { if (Test-Path $hf) { $healthFound = $true; break } }
                Start-Sleep -Milliseconds 200
            }
            if (-not $healthFound) {
                "--- Diagnostic snapshot for fetch server start ---" | Out-File -FilePath (Join-Path $logsDir 'fetch.debug.log') -Encoding utf8 -Append
                "PythonExec=$pythonExec" | Out-File -FilePath (Join-Path $logsDir 'fetch.debug.log') -Encoding utf8 -Append
                try { if (Test-Path $pyErr) { Get-Content $pyErr -Tail 2000 | Out-File -FilePath (Join-Path $logsDir 'fetch.debug.log') -Encoding utf8 -Append } }
                catch {}
            }
        }
    }
    'time' {
        $venvPy = Join-Path $repoRoot '.venv\Scripts\python.exe'
        $timePackageDir = Join-Path $repoRoot 'servers/src/time'
        if (Test-Path $venvPy) { $pythonExec = $venvPy } else { $pythonExec = 'python' }
        $pyLog = Join-Path $logsDir 'time.log'
        $pyErr = Join-Path $logsDir 'time.err.log'
        if (Test-Path $timePackageDir) {
            $args = @('-m', 'mcp_server_time')
            "Starting time server with python: $pythonExec; module: mcp_server_time; cwd: $timePackageDir" | Out-File -FilePath (Join-Path $logsDir 'time.debug.log') -Encoding utf8 -Append
            $proc = Start-Process $pythonExec -ArgumentList $args -RedirectStandardOutput $pyLog -RedirectStandardError $pyErr -WorkingDirectory $timePackageDir -PassThru
            $procId = $proc.Id

            # diagnostic health wait similar to others
            $svcHealthCandidates = @((Join-Path $logsDir 'time.ready'))
            try { $svcRepoRoot = Find-RepoRoot -startPath (Join-Path $timePackageDir 'server.py'); $svcHealthCandidates += (Join-Path $svcRepoRoot 'logs\time.ready') } catch {}
            $healthFound = $false
            $healthTimeout = (Get-Date).AddSeconds(10)
            while ((Get-Date) -lt $healthTimeout -and -not $healthFound) {
                foreach ($hf in $svcHealthCandidates) { if (Test-Path $hf) { $healthFound = $true; break } }
                Start-Sleep -Milliseconds 200
            }
            if (-not $healthFound) {
                "--- Diagnostic snapshot for time server start ---" | Out-File -FilePath (Join-Path $logsDir 'time.debug.log') -Encoding utf8 -Append
                "PythonExec=$pythonExec" | Out-File -FilePath (Join-Path $logsDir 'time.debug.log') -Encoding utf8 -Append
                try { if (Test-Path $pyErr) { Get-Content $pyErr -Tail 2000 | Out-File -FilePath (Join-Path $logsDir 'time.debug.log') -Encoding utf8 -Append } }
                catch {}
            }
        }
    }
    default {
        Write-Error "Unknown service name: $Service"
        exit 2
    }
}

if ($procId) {
    # update pids.json robustly
    $pidsPath = Join-Path $logsDir 'pids.json'
    $map = @{}
    if (Test-Path $pidsPath) {
        $existing = Get-Content $pidsPath -Raw | ConvertFrom-Json -ErrorAction SilentlyContinue
        if ($existing) {
            foreach ($prop in $existing.PSObject.Properties) { $map[$prop.Name] = $prop.Value }
        }
    }
    $map[$Service] = $procId
    $map | ConvertTo-Json -Depth 3 | Set-Content -Path $pidsPath -Encoding UTF8
    Write-Output "Started service $Service with PID $procId (logs: see $logsDir)"
    exit 0
}
else {
    Write-Error "Failed to start $Service"
    exit 1
}