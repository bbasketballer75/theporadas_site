Param(
    [string]$Dir
)
$ErrorActionPreference = 'Stop'

# Ensure Node/npm/npx are available without forcibly switching versions
$npmBin = Join-Path $env:APPDATA 'npm'
$nodeLink = Join-Path $env:LOCALAPPDATA 'nodejs'
foreach ($p in @($nodeLink, $npmBin)) {
    if ($p -and (Test-Path $p) -and ($env:PATH -notlike "*$p*")) { $env:PATH = "$p;$env:PATH" }
}

if (-not (Get-Command npx -ErrorAction SilentlyContinue)) {
    # Fall back to refresh script only if npx isn't discoverable
    $refresh = Join-Path $PSScriptRoot 'refresh_node_path.ps1'
    if (Test-Path $refresh) { & $refresh }
    foreach ($p in @($nodeLink, $npmBin)) {
        if ($p -and (Test-Path $p) -and ($env:PATH -notlike "*$p*")) { $env:PATH = "$p;$env:PATH" }
    }
}

# (Removed obsolete early npx execution block; unified logic below)
# Helper: ensure firebase-tools installed locally (cache) and return invocation tuple
function Get-FirebaseInvocation {
    param([string]$CacheDir)
    if (-not (Test-Path $CacheDir)) { New-Item -ItemType Directory -Path $CacheDir | Out-Null }
    Push-Location $CacheDir
    try {
        if (-not (Test-Path 'package.json')) { '{"private":true}' | Out-File -Encoding UTF8 package.json }
        $needInstall = -not (Test-Path 'node_modules/firebase-tools')
        if ($needInstall) {
            if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
                throw 'npm not available; cannot bootstrap firebase-tools.'
            }
            Write-Host '[firebase-mcp] Installing firebase-tools@latest locally...' -ForegroundColor Yellow
            npm install firebase-tools@latest --no-audit --no-fund --loglevel=error | Out-Null
        }
        $firebaseCli = Get-ChildItem -Recurse -Filter 'firebase.js' | Where-Object { $_.FullName -match 'firebase-tools.+lib\\bin' } | Select-Object -First 1
        if (-not $firebaseCli) { throw 'firebase.js not found after install.' }
        return @{ exe = 'node'; args = @($firebaseCli.FullName, 'experimental:mcp') }
    }
    finally {
        Pop-Location
    }
}

# Always bypass npx (environment reported broken); use cached direct install
$cacheDir = Join-Path $env:LOCALAPPDATA 'firebase-mcp-cache'
$inv = Get-FirebaseInvocation -CacheDir $cacheDir
$exe = $inv.exe
$cmdArgs = $inv.args

if ($Dir) {
    try {
        $absDir = if ([System.IO.Path]::IsPathRooted($Dir)) { $Dir } else { (Resolve-Path -Path $Dir).Path }
        $cmdArgs += @('--dir', $absDir)
    } catch { $cmdArgs += @('--dir', $Dir) }
}

Write-Host '[firebase-mcp] Starting Firebase MCP...' -ForegroundColor Cyan
Write-Host ("[firebase-mcp] Command: {0} {1}" -f $exe, ($cmdArgs -join ' ')) -ForegroundColor DarkGray
& $exe @cmdArgs
exit $LASTEXITCODE
