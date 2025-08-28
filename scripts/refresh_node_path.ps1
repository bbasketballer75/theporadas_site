Param(
    [switch] $DryRun
)
$ErrorActionPreference = 'Stop'

Write-Host 'Refreshing Node/NPM/NPX PATH for this terminal...' -ForegroundColor Cyan

# Track any path entries we add (for optional success summary)
$addedPaths = @()
# Determine NVM locations
$nvmHome = Join-Path $env:LOCALAPPDATA 'nvm'
$nvmExe = Join-Path $nvmHome 'nvm.exe'
$defaultPF = 'C:\\Program Files\\nodejs'
$userLink = Join-Path $env:LOCALAPPDATA 'nodejs'
$userNpm = Join-Path $env:APPDATA 'npm'

if (-not (Test-Path $nvmExe)) {
    if ($DryRun) {
        Write-Host "DryRun: nvm.exe not found (expected if tooling not installed in test context)" -ForegroundColor Yellow
    }
    else {
        throw "nvm.exe not found at $nvmExe. Run the setup task to install NVM for Windows."
    }
}

# Choose a writable symlink directory for Node (Program Files may need admin)
$nvmSymlink = $defaultPF
$useUser = $false
try {
    if (-not (Test-Path $nvmSymlink)) { New-Item -ItemType Directory -Path $nvmSymlink -Force | Out-Null }
    $testFile = Join-Path $nvmSymlink '.__write_test__'
    Set-Content -Path $testFile -Value 'ok' -Force
    Remove-Item -Path $testFile -Force
}
catch { $useUser = $true }
if ($useUser) {
    $nvmSymlink = $userLink
}

# If the chosen symlink location exists as a physical directory (not a symlink/junction), remove it
if (Test-Path $nvmSymlink) {
    try {
        $attr = (Get-Item $nvmSymlink -Force).Attributes
        $isLink = ($attr -band [IO.FileAttributes]::ReparsePoint) -ne 0
        if (-not $isLink) {
            Remove-Item -Recurse -Force -Path $nvmSymlink
            Write-Host "Removed physical directory at symlink path: $nvmSymlink" -ForegroundColor Yellow
        }
    }
    catch {}
}

# Update NVM settings.txt to point to the chosen symlink directory
$settings = Join-Path $nvmHome 'settings.txt'
if (-not (Test-Path $settings)) {
    Set-Content -Path $settings -Value @(
        "root: $nvmHome",
        "path: $nvmSymlink"
    ) -Force
}
else {
    $lines = Get-Content $settings -ErrorAction SilentlyContinue
    $new = @()
    $foundPath = $false
    $foundRoot = $false
    foreach ($l in $lines) {
        if ($l -match '^path\s*:') { $new += ("path: $nvmSymlink"); $foundPath = $true }
        elseif ($l -match '^root\s*:') { $new += ("root: $nvmHome"); $foundRoot = $true }
        else { $new += $l }
    }
    if (-not $foundRoot) { $new += ("root: $nvmHome") }
    if (-not $foundPath) { $new += ("path: $nvmSymlink") }
    if (-not ($lines -join "`n").Equals($new -join "`n")) {
        Set-Content -Path $settings -Value $new -Force
        Write-Host "Updated NVM settings.txt (root/path) -> $nvmSymlink" -ForegroundColor Yellow
    }
}

# Set env vars for current session
$env:NVM_HOME = $nvmHome
$env:NVM_SYMLINK = $nvmSymlink

# Ensure PATH for current session
$paths = @($nvmHome, $nvmSymlink, $userNpm)
foreach ($p in $paths) {
    if ($p -and (Test-Path $p)) {
        # Prepend concrete resolved path if not already present (avoid literal %NVM_HOME% style placeholders)
        $already = $false
        foreach ($seg in ($env:PATH -split ';')) { if ($seg.TrimEnd('\') -ieq $p.TrimEnd('\')) { $already = $true; break } }
        if (-not $already) { $env:PATH = "$p;$env:PATH"; $addedPaths += $p }
    }
}

if (-not $DryRun) {
    # Recreate stable junction/symlink if missing (prevents husky path drift)
    try {
        $targetVersion = (& $nvmExe list | Select-String -Pattern '>' | Select-Object -First 1).ToString().Split() | Where-Object { $_ -match 'v[0-9]+\.[0-9]+\.[0-9]+' } | Select-Object -First 1
        if ($targetVersion) {
            $targetDir = Join-Path $nvmHome $targetVersion.Trim()
            if (Test-Path $targetDir) {
                $needsLink = $true
                if (Test-Path $nvmSymlink) {
                    $item = Get-Item $nvmSymlink -Force
                    $isLink = ($item.Attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0
                    if ($isLink) {
                        # Resolve existing link target (best effort)
                        try {
                            $resolved = (Get-Item (Join-Path $nvmSymlink 'node.exe') -ErrorAction SilentlyContinue).Directory.Parent.FullName
                            if ($resolved -and ($resolved -ieq $targetDir)) { $needsLink = $false }
                        }
                        catch {}
                    }
                    elseif (-not $isLink) {
                        Remove-Item -Recurse -Force $nvmSymlink -ErrorAction SilentlyContinue
                    }
                }
                if ($needsLink) {
                    try { Remove-Item -Recurse -Force $nvmSymlink -ErrorAction SilentlyContinue } catch {}
                    New-Item -ItemType Junction -Path $nvmSymlink -Target $targetDir -Force | Out-Null
                    Write-Host "Refreshed Node junction: $nvmSymlink -> $targetDir" -ForegroundColor Green
                }
            }
        }
    }
    catch { Write-Host "Junction refresh skipped: $($_.Exception.Message)" -ForegroundColor Yellow }
    # Ensure an LTS Node version is installed
    $haveAny = @(Get-ChildItem -Path $nvmHome -Directory -ErrorAction SilentlyContinue | Where-Object { $_.Name -match '^v?[0-9]+\.[0-9]+\.[0-9]+$' }).Count -gt 0
    if (-not $haveAny -and (Test-Path $nvmExe)) {
        Write-Host 'No Node versions found under NVM. Installing latest LTS...' -ForegroundColor Yellow
        & $nvmExe install lts | Out-Host
    }
    if (Test-Path $nvmExe) { & $nvmExe use lts | Out-Host }
}
else {
    Write-Host 'DryRun: skipping NVM install/use operations.' -ForegroundColor Yellow
}

# After activation, ensure PATH includes the symlink & npm user bin
foreach ($p in @($nvmSymlink, $userNpm)) {
    if ($p) {
        $already = $false
        foreach ($seg in ($env:PATH -split ';')) { if ($seg.TrimEnd('\') -ieq $p.TrimEnd('\')) { $already = $true; break } }
        if (-not $already) { $env:PATH = "$p;$env:PATH"; $addedPaths += $p }
    }
}

# Placeholder cleanup & final validation
$pathSegments = @()
$hadPlaceholders = $false
foreach ($seg in ($env:PATH -split ';')) {
    if ($seg -match '%NVM_HOME%') { $hadPlaceholders = $true; if ($env:NVM_HOME) { $seg = $seg -replace '%NVM_HOME%', $env:NVM_HOME } }
    if ($seg -match '%NVM_SYMLINK%') { $hadPlaceholders = $true; if ($env:NVM_SYMLINK) { $seg = $seg -replace '%NVM_SYMLINK%', $env:NVM_SYMLINK } }
    $pathSegments += $seg
}
if ($hadPlaceholders) { $env:PATH = ($pathSegments -join ';') }

$nodeVersion = $null
try { $nodeVersion = (node --version) } catch {}
if (-not $nodeVersion) {
    Write-Warning 'Node still not resolvable after refresh. Add C:\Users\%USERNAME%\AppData\Local\nodejs to your PATH (User scope) and re-open terminal.'
    Write-Host 'Current PATH:' -ForegroundColor Yellow
    Write-Host $env:PATH
}
else {
    if ($addedPaths.Count -gt 0) { Write-Host ("Added PATH entries: " + ($addedPaths -join ', ')) -ForegroundColor Green }
    if ($hadPlaceholders) { Write-Host 'Replaced placeholder %NVM_HOME%/%NVM_SYMLINK% entries with concrete paths.' -ForegroundColor Green }
    Write-Host 'Node PATH refresh successful.' -ForegroundColor Green
}

# Husky / Git hook note:
# Hooks sometimes capture an outdated absolute path to node.exe when the junction changes.
# This script recreates the junction early in a session; run it before committing if Node was upgraded
# to ensure hooks resolve the correct engine.

# Report versions
if (-not $DryRun) {
    try { Write-Host ("nvm:  " + ((& $nvmExe version) 2>$null)) } catch { Write-Host 'nvm: not found' }
    try { Write-Host ("node: " + ((node --version) 2>$null)) } catch { Write-Host 'node: not found' }
    try { Write-Host ("npm:  " + ((npm --version) 2>$null)) } catch { Write-Host 'npm: not found' }
    try { Write-Host ("npx:  " + ((npx --version) 2>$null)) } catch { Write-Host 'npx: not found' }
}
else {
    Write-Host 'DryRun: skipped version reporting.' -ForegroundColor Yellow
}
