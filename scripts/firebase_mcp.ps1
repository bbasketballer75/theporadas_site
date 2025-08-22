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

# Prefer NVM symlinked npx to avoid npm prefix conflicts
$npxSymlink = Join-Path $nodeLink 'npx.cmd'
$exe = if (Test-Path $npxSymlink) { $npxSymlink } else { 'npx' }
$cmdArgs = @('-y', 'firebase-tools@latest', 'experimental:mcp')
if ($Dir) {
    try {
        $absDir = if ([System.IO.Path]::IsPathRooted($Dir)) { $Dir } else { (Resolve-Path -Path $Dir).Path }
        $cmdArgs += @('--dir', $absDir)
    }
    catch {
        $cmdArgs += @('--dir', $Dir)
    }
}

# Show minimal diagnostics then invoke
Write-Host "Starting Firebase MCP via npx..." -ForegroundColor Cyan
Write-Host ("Command: {0} {1}" -f $exe, ($cmdArgs -join ' ')) -ForegroundColor DarkGray

try {
    & $exe @cmdArgs
}
catch {
    Write-Host "Direct npx failed, retrying via cmd.exe /c..." -ForegroundColor Yellow
    $joined = ($cmdArgs | ForEach-Object { if ($_ -match '\s') { '"' + $_ + '"' } else { $_ } }) -join ' '
    $cmdline = "npx $joined"
    Start-Process -FilePath 'cmd.exe' -ArgumentList @('/c', $cmdline) -Wait -NoNewWindow
}
