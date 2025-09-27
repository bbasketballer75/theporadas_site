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
if (-not (Test-Path $logsDir)) { New-Item -ItemType Directory -Path $logsDir | Out-Null }
# Write a starter trace so we can confirm this helper runs
try { $starterLog = Join-Path $logsDir 'service-starter.log'; New-Item -Path $starterLog -ItemType File -Force | Out-Null; ("[{0}] start-mcp-service invoked for service: {1} (PID {2})" -f (Get-Date), $Service, $PID) | Out-File -FilePath $starterLog -Encoding utf8 -Append } catch {}

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

# Ensure a .env exists for local dev to prevent services from failing fast
$envPath = Join-Path $repoRoot '.env'
$envExamplePath = Join-Path $repoRoot '.env.example'
if (-not (Test-Path $envPath) -and (Test-Path $envExamplePath)) {
    Write-Output "No .env found; copying .env.example -> .env as a placeholder (please update with real secrets)"
    Copy-Item -Path $envExamplePath -Destination $envPath -Force
}

function Decode-FileUri {
    param([string] $uri)
    if (-not $uri) { return $uri }
    # If this looks like a file URI, try to convert to local path
    if ($uri -match '^file:') {
        try {
            $u = [System.Uri] $uri
            return $u.LocalPath
        }
        catch {
            # fallback: unescape percent-encoding and strip any leading slashes
            $decoded = [System.Uri]::UnescapeDataString($uri -replace '^file:\/\/', '')
            return $decoded
        }
    }
    # If string contains percent-encoded sequences, unescape them
    if ($uri -match '%[0-9A-Fa-f]{2}') {
        try { return [System.Uri]::UnescapeDataString($uri) } catch { return $uri }
    }
    return $uri
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
            # Decode repo root in case it was provided as a file:// URI or percent-encoded
            $decodedRepoRoot = Decode-FileUri $repoRoot
            $procId = Start-NpxProcess @('@modelcontextprotocol/server-filesystem@latest', $decodedRepoRoot) $logFile $errFile
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
            # ensure debug file exists
            try { New-Item -Path $debugFile -ItemType File -Force | Out-Null } catch {}
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
            $pyArgs = @('-m', 'mcp_server_fetch')
            "Starting fetch server with python: $pythonExec; module: mcp_server_fetch; cwd: $timePackageDir" | Out-File -FilePath (Join-Path $logsDir 'fetch.debug.log') -Encoding utf8 -Append
            try { New-Item -Path (Join-Path $logsDir 'fetch.debug.log') -ItemType File -Force | Out-Null } catch {}
            $proc = Start-Process $pythonExec -ArgumentList $pyArgs -RedirectStandardOutput $pyLog -RedirectStandardError $pyErr -WorkingDirectory $timePackageDir -PassThru
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
            $pyArgs = @('-m', 'mcp_server_time')
            "Starting time server with python: $pythonExec; module: mcp_server_time; cwd: $timePackageDir" | Out-File -FilePath (Join-Path $logsDir 'time.debug.log') -Encoding utf8 -Append
            try { New-Item -Path (Join-Path $logsDir 'time.debug.log') -ItemType File -Force | Out-Null } catch {}
            $proc = Start-Process $pythonExec -ArgumentList $pyArgs -RedirectStandardOutput $pyLog -RedirectStandardError $pyErr -WorkingDirectory $timePackageDir -PassThru
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
    'postgres' {
        # Start Postgres MCP server by reading PG_URL from environment or .env
        $logFile = Join-Path $logsDir 'postgres.log'
        $errFile = Join-Path $logsDir 'postgres.err.log'

        # Look for PG_URL in the current environment first
        $pgUrl = $null
        if ($env:PG_URL) { $pgUrl = $env:PG_URL }

        # If not set, attempt to read from repository .env file (already auto-copied from .env.example above if missing)
        if (-not $pgUrl -and (Test-Path $envPath)) {
            try {
                $envContent = Get-Content $envPath -Raw -ErrorAction SilentlyContinue
                if ($envContent -match '^PG_URL\s*=\s*(.+)$') { $pgUrl = $Matches[1].Trim() }
                elseif ($envContent -match '^PGURL\s*=\s*(.+)$') { $pgUrl = $Matches[1].Trim() }
            }
            catch {
                # ignore parse failures
            }
        }

        if (-not $pgUrl) {
            # If no PG_URL provided, try to start a local docker postgres container automatically
            $containerName = 'mcp-local-postgres'
            $dockerCmd = Get-Command docker -ErrorAction SilentlyContinue
            if ($dockerCmd) {
                Write-Output "No PG_URL found — attempting to ensure Docker Postgres container named '$containerName' is running..."
                # Check if the container exists
                $existing = & docker ps -a --filter "name=$containerName" --format "{{.ID}} {{.Status}}" 2>$null
                if (-not $existing) {
                    # Try to run a new container; prefer fixed host port 5432 but fall back to random port if 5432 is in use
                    $hostPort = 5432
                    try {
                        # Try to run with fixed port 5432
                        Write-Output "Attempting to run Docker container $containerName mapping host port $hostPort..."
                        & docker run -e POSTGRES_PASSWORD=postgres -e POSTGRES_USER=postgres -e POSTGRES_DB=mcpdb -p ${hostPort}:5432 --name $containerName -d postgres:15-alpine | Out-Null
                    }
                    catch {
                        Write-Output "Fixed port 5432 in use or container start failed; falling back to ephemeral host port..."
                        & docker run -e POSTGRES_PASSWORD=postgres -e POSTGRES_USER=postgres -e POSTGRES_DB=mcpdb -P --name $containerName -d postgres:15-alpine | Out-Null
                    }
                }
                else {
                    # If exists but not running, start it
                    $parts = $existing -split ' '\n'
                    if ($existing -match 'Exited') {
                        Write-Output "Found existing container '$containerName' (exited) — starting it..."
                        & docker start $containerName | Out-Null
                    }
                    else {
                        Write-Output "Found existing container '$containerName' — leaving it running"
                    }
                }

                # Determine which host port maps to container 5432
                Start-Sleep -Seconds 1
                $inspectPort = & docker inspect --format '{ { (index (index .NetworkSettings.Ports "5432/tcp") 0).HostPort } }' $containerName 2>$null
                if ($inspectPort -and $inspectPort -ne '') { $hostPort = $inspectPort.Trim() }

                # Wait for postgres to be ready by checking container logs for readiness or using pg_isready if available
                $ready = $false
                $deadline = (Get-Date).AddSeconds(60)
                while ((Get-Date) -lt $deadline -and -not $ready) {
                    try {
                        $logs = & docker logs --tail 50 $containerName 2>$null
                        if ($logs -match 'database system is ready to accept connections') { $ready = $true; break }
                        # If postgres client available inside container, try pg_isready
                        $pgis = & docker exec $containerName pg_isready -U postgres 2>$null
                        if ($pgis -and $pgis -match 'accepting connections') { $ready = $true; break }
                    }
                    catch {}
                    Start-Sleep -Seconds 1
                }

                if (-not $ready) {
                    Write-Warning "Timed out waiting for Postgres container to be ready. Check 'docker logs $containerName' for details."
                }

                # Construct PG_URL using the detected hostPort
                $pgUrl = "postgresql://postgres:postgres@localhost:${hostPort}/mcpdb"

                # Export PG_URL into current environment and append/update .env file so future runs see it
                $env:PG_URL = $pgUrl
                try {
                    if (Test-Path $envPath) {
                        $envText = Get-Content $envPath -Raw
                        if ($envText -match '(^ | \n)PG_URL\s*=') {
                            $newEnvText = $envText -replace '(^ | \n)PG_URL\s*=.*', "`nPG_URL=$pgUrl"
                            Set-Content -Path $envPath -Value $newEnvText -Encoding UTF8
                        }
                        else { Add-Content -Path $envPath -Value "`nPG_URL=$pgUrl" }
                    }
                    else { Set-Content -Path $envPath -Value "PG_URL=$pgUrl" -Encoding UTF8 }
                    Write-Output "Set PG_URL to $pgUrl and updated .env"
                }
                catch {
                    Write-Warning "Failed to persist PG_URL to .env: $_"
                }
            }
            else {
                Write-Error "Postgres server requires a database URL. Provide it via environment variable PG_URL, a .env file entry 'PG_URL=postgresql://...', or pass it as the first CLI argument to the npx command. Example: npx -y @modelcontextprotocol/server-postgres postgresql://postgres:password@localhost:5432/mydb"
                exit 1
            }
        }

        # Start the published package, passing the DB URL as the required argument
        $procId = Start-NpxProcess @('@modelcontextprotocol/server-postgres@latest', $pgUrl) $logFile $errFile
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