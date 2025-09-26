# Start all MCP servers (Node and Python) in background processes
# Usage: powershell -ExecutionPolicy Bypass -File ./scripts/start-all-mcp.ps1

$ErrorActionPreference = 'Stop'
# Determine the repository root (parent directory of the scripts folder)
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
$repoRoot = Resolve-Path (Join-Path $scriptDir '..')
Set-Location $repoRoot

# By default skip local TypeScript builds to avoid long blocking tsc runs that can make the terminal appear frozen.
# Set SKIP_LOCAL_BUILD=false to explicitly enable local builds when you want to do a full local dev run.
$skipLocalBuild = $true
if ($null -ne $env:SKIP_LOCAL_BUILD) {
    # Accept 'true' / 'false' (case-insensitive)
    $skipLocalBuild = ($env:SKIP_LOCAL_BUILD.ToLower() -eq 'true')
}
if ($skipLocalBuild) { Write-Output "SKIP_LOCAL_BUILD is true - skipping local TypeScript builds and preferring published packages." }

# Helper: start an npx invocation in a way that works on Windows and *nix, redirecting stdout/stderr to files
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
                $cmdArgs = @('/c', 'npx', '-y') + $NpxArgs
                $p = Start-Process -FilePath 'cmd.exe' -ArgumentList $cmdArgs -RedirectStandardOutput $StdOutFile -RedirectStandardError $StdErrFile -NoNewWindow -PassThru
            }
            else {
                $p = Start-Process -FilePath 'npx' -ArgumentList @('-y') + $NpxArgs -RedirectStandardOutput $StdOutFile -RedirectStandardError $StdErrFile -NoNewWindow -PassThru
            }

            # Give the command a short time to surface any immediate extraction/module errors in stderr
            Start-Sleep -Milliseconds 800
            $err = Get-Content $StdErrFile -Raw -ErrorAction SilentlyContinue
            if ($err -match 'TAR_ENTRY_ERROR|ERR_MODULE_NOT_FOUND|Error running script') {
                if ($attempt -lt $RetryCount) {
                    Write-Output "npx attempt $attempt failed with cache/extraction errors; running 'npm cache verify' and retrying..."
                    # Attempt to verify the npm cache before retrying
                    try { Start-Process -FilePath 'npm' -ArgumentList @('cache', 'verify') -NoNewWindow -Wait -PassThru | Out-Null } catch {}
                    Start-Sleep -Milliseconds 400
                    continue
                }
                else {
                    Write-Output "npx failed after $RetryCount attempts; see $StdErrFile for details."
                }
            }
            # Return the started process id so callers can record it
            return $p.Id
        }
    }
    catch {
        Write-Output "Failed to start npx process: $_"
        return $null
    }
}

Write-Output "Building TypeScript MCP servers..."
# Build TypeScript servers (if present)
$tsServers = @('everything', 'filesystem', 'memory', 'sequentialthinking')
# Track which packages built successfully so we don't run broken local artifacts
$buildResults = @{}

if (-not $skipLocalBuild) {
    foreach ($s in $tsServers) {
        $pkgPath = Join-Path -Path (Join-Path $repoRoot 'servers/src') -ChildPath $s
        if (Test-Path $pkgPath) {
            Write-Output "Building $s..."
            npm --prefix $pkgPath run build
            if ($LASTEXITCODE -ne 0) {
                Write-Output "Local build failed for $s (exit code $LASTEXITCODE). Will fall back to published package when starting."
                $buildResults[$s] = $false
            }
            else {
                Write-Output "Local build succeeded for $s"
                $buildResults[$s] = $true
            }
        }
        else {
            Write-Output "Skipping $s (not found at $pkgPath)"
            $buildResults[$s] = $false
        }
    }
}
else {
    foreach ($s in $tsServers) { $buildResults[$s] = $false }
}

Write-Output "Starting Node-based MCP servers..."
$logsDir = Join-Path $repoRoot 'logs'
if (-Not (Test-Path $logsDir)) { New-Item -ItemType Directory -Path $logsDir | Out-Null }

# Track started process IDs so we can stop them later
$pids = @{}

# everything:sse -> 3001
$env:PORT = '3001'
$everythingLocalSse = Join-Path -Path (Join-Path $repoRoot 'servers/src/everything') -ChildPath 'dist/sse.js'
$sseLog = Join-Path $logsDir 'everything-sse.log'
$sseErr = Join-Path $logsDir 'everything-sse.err.log'
if ($buildResults['everything'] -and (Test-Path $everythingLocalSse)) {
    Write-Output "Starting local everything:sse from dist/sse.js"
    $proc = Start-Process node -ArgumentList @($everythingLocalSse) -RedirectStandardOutput $sseLog -RedirectStandardError $sseErr -PassThru
    $pids['everything-sse'] = $proc.Id
}
else {
    Write-Output "Using published package for everything:sse"
    $procId = Start-NpxProcess @('@modelcontextprotocol/server-everything@latest', 'sse') $sseLog $sseErr
    if ($procId) { $pids['everything-sse'] = $procId }
}
Start-Sleep -Milliseconds 300

# everything:streamableHttp -> 3002
$env:PORT = '3002'
$everythingLocalStream = Join-Path -Path (Join-Path $repoRoot 'servers/src/everything') -ChildPath 'dist/streamableHttp.js'
$streamLog = Join-Path $logsDir 'everything-streamable.log'
$streamErr = Join-Path $logsDir 'everything-streamable.err.log'
if ($buildResults['everything'] -and (Test-Path $everythingLocalStream)) {
    Write-Output "Starting local everything:streamableHttp from dist/streamableHttp.js"
    $proc = Start-Process node -ArgumentList @($everythingLocalStream) -RedirectStandardOutput $streamLog -RedirectStandardError $streamErr -PassThru
    $pids['everything-streamable'] = $proc.Id
}
else {
    Write-Output "Using published package for everything:streamableHttp"
    $procId = Start-NpxProcess @('@modelcontextprotocol/server-everything@latest', 'streamableHttp') $streamLog $streamErr
    if ($procId) { $pids['everything-streamable'] = $procId }
    # Quick check for common npx cache/extraction or module resolution failures; retry once with --ignore-existing
    Start-Sleep -Milliseconds 500
    $streamErrOut = Get-Content $streamErr -Raw -ErrorAction SilentlyContinue
    if ($streamErrOut -match 'TAR_ENTRY_ERROR|ERR_MODULE_NOT_FOUND|Error running script') {
        Write-Output "Detected npx cache/extraction error for everything:streamableHttp; retrying npx with --ignore-existing"
        $procId2 = Start-NpxProcess @('--ignore-existing', '@modelcontextprotocol/server-everything@latest', 'streamableHttp') $streamLog $streamErr
        if ($procId2) { $pids['everything-streamable'] = $procId2 }
    }
}
Start-Sleep -Milliseconds 300

Write-Output "Starting stdio-based Node MCP servers (filesystem, memory, sequentialthinking)..."
# These servers communicate over stdio; we keep them running as background Node processes
foreach ($s in @('filesystem', 'memory', 'sequentialthinking')) {
    $pkgPath = Join-Path -Path (Join-Path $repoRoot 'servers/src') -ChildPath $s
    if (Test-Path $pkgPath) {
        $localStart = Join-Path $pkgPath 'dist/index.js'
        $logFile = Join-Path $logsDir "$s.log"
        $errFile = Join-Path $logsDir "$s.err.log"
        if ($buildResults[$s] -and (Test-Path $localStart)) {
            Write-Output "Starting local $s from dist/index.js"
            $proc = Start-Process node -ArgumentList @($localStart) -RedirectStandardOutput $logFile -RedirectStandardError $errFile -PassThru
            $pids[$s] = $proc.Id
        }
        else {
            Write-Output "Starting published package via npx for $s"
            $pkgName = "@modelcontextprotocol/server-$s"
            # filesystem requires a directory argument; pass repo root for filesystem
            if ($s -eq 'filesystem') {
                $procId = Start-NpxProcess @("$pkgName@latest", $repoRoot) $logFile $errFile
            }
            else {
                $procId = Start-NpxProcess @("$pkgName@latest") $logFile $errFile
            }
            if ($procId) { $pids[$s] = $procId }
        }
        Start-Sleep -Milliseconds 200
    }
}

Write-Output "Starting Python-based MCP servers (git, fetch, time) if available..."
$pyServers = @(
    (Join-Path $repoRoot 'servers/src/git/src/mcp_server_git/server.py'),
    (Join-Path $repoRoot 'servers/src/fetch/src/mcp_server_fetch/server.py'),
    (Join-Path $repoRoot 'servers/src/time/src/mcp_server_time/server.py')
)
foreach ($py in $pyServers) {
    if (Test-Path $py) {
        Write-Output "Starting Python server $py..."
        $pyLog = Join-Path $logsDir ((Split-Path $py -Leaf) + '.log')
        $pyErr = Join-Path $logsDir ((Split-Path $py -Leaf) + '.err.log')
        Start-Process python -ArgumentList @($py) -RedirectStandardOutput $pyLog -RedirectStandardError $pyErr -PassThru
        Start-Sleep -Milliseconds 200
    }
    else {
        Write-Output "Skipping $py (not found at $py)"
    }
}

Write-Output "Waiting briefly for servers to bind to ports..."
Start-Sleep -Seconds 2

# Verify HTTP servers by scanning logs for expected messages first
$verify = @()

# Check SSE log - scan both stdout and stderr
if ((Test-Path $sseLog) -or (Test-Path $sseErr)) {
    $sseOut = ""
    if (Test-Path $sseLog) { $sseOut += Get-Content $sseLog -Raw -ErrorAction SilentlyContinue }
    if (Test-Path $sseErr) { $sseOut += "`n" + (Get-Content $sseErr -Raw -ErrorAction SilentlyContinue) }
    if ($sseOut -match 'Server is running on port|listening on port|Client Connected') {
        $status = 'LISTENING (log)'
    }
    else {
        $ok = Test-NetConnection -ComputerName 'localhost' -Port 3001 -WarningAction SilentlyContinue
        if ($ok.TcpTestSucceeded) { $status = 'LISTENING (net)' } else { $status = 'UNREACHABLE' }
    }
    $verify += @{ port = 3001; status = $status }
}
else {
    $ok = Test-NetConnection -ComputerName 'localhost' -Port 3001 -WarningAction SilentlyContinue
    if ($ok.TcpTestSucceeded) { $status = 'LISTENING (net)' } else { $status = 'UNREACHABLE' }
    $verify += @{ port = 3001; status = $status }
}

# Check streamable HTTP log - scan both stdout and stderr
if ((Test-Path $streamLog) -or (Test-Path $streamErr)) {
    $streamOut = ""
    if (Test-Path $streamLog) { $streamOut += Get-Content $streamLog -Raw -ErrorAction SilentlyContinue }
    if (Test-Path $streamErr) { $streamOut += "`n" + (Get-Content $streamErr -Raw -ErrorAction SilentlyContinue) }
    if ($streamOut -match 'Streamable HTTP Server listening|MCP Streamable HTTP Server listening|listening on port|Streamable HTTP') {
        $status = 'LISTENING (log)'
    }
    else {
        $ok = Test-NetConnection -ComputerName 'localhost' -Port 3002 -WarningAction SilentlyContinue
        if ($ok.TcpTestSucceeded) { $status = 'LISTENING (net)' } else { $status = 'UNREACHABLE' }
    }
    $verify += @{ port = 3002; status = $status }
}
else {
    $ok = Test-NetConnection -ComputerName 'localhost' -Port 3002 -WarningAction SilentlyContinue
    if ($ok.TcpTestSucceeded) { $status = 'LISTENING (net)' } else { $status = 'UNREACHABLE' }
    $verify += @{ port = 3002; status = $status }
}

Write-Output "MCP Server verification results:"
foreach ($r in $verify) {
    Write-Output ("Port {0}: {1}" -f $r.port, $r.status)
}

# After starting everything, persist PIDs for later termination
try {
    $pidsPath = Join-Path $logsDir 'pids.json'
    $pids | ConvertTo-Json -Depth 3 | Set-Content -Path $pidsPath -Encoding UTF8
    Write-Output "Wrote PIDs for started processes to $pidsPath"
}
catch {
    Write-Warning "Failed to write pids.json: $_"
}

Write-Output "All start commands issued. For stdio servers (non-HTTP) verify by attaching a client or checking running processes."
