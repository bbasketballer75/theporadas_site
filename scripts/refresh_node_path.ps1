Param()
$ErrorActionPreference = 'Stop'

Write-Host 'Refreshing Node/NPM/NPX PATH for this terminal...' -ForegroundColor Cyan

# Determine NVM locations
$nvmHome    = Join-Path $env:LOCALAPPDATA 'nvm'
$nvmExe     = Join-Path $nvmHome 'nvm.exe'
$defaultPF  = 'C:\\Program Files\\nodejs'
$userLink   = Join-Path $env:LOCALAPPDATA 'nodejs'
$userNpm    = Join-Path $env:APPDATA 'npm'

if (-not (Test-Path $nvmExe)) {
    throw "nvm.exe not found at $nvmExe. Run the setup task to install NVM for Windows."
}

# Choose a writable symlink directory for Node (Program Files may need admin)
$nvmSymlink = $defaultPF
$useUser = $false
try {
    if (-not (Test-Path $nvmSymlink)) { New-Item -ItemType Directory -Path $nvmSymlink -Force | Out-Null }
    $testFile = Join-Path $nvmSymlink '.__write_test__'
    Set-Content -Path $testFile -Value 'ok' -Force
    Remove-Item -Path $testFile -Force
} catch { $useUser = $true }
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
    } catch {}
}

# Update NVM settings.txt to point to the chosen symlink directory
$settings = Join-Path $nvmHome 'settings.txt'
if (-not (Test-Path $settings)) {
    Set-Content -Path $settings -Value @(
        "root: $nvmHome",
        "path: $nvmSymlink"
    ) -Force
} else {
    $lines = Get-Content $settings -ErrorAction SilentlyContinue
    $new   = @()
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
$env:NVM_HOME    = $nvmHome
$env:NVM_SYMLINK = $nvmSymlink

# Ensure PATH for current session
$paths = @($nvmHome, $nvmSymlink, $userNpm)
foreach ($p in $paths) {
    if ($p -and (Test-Path $p) -and ($env:PATH -notlike "*$p*")) { $env:PATH = "$env:PATH;$p" }
}

# Ensure an LTS Node version is installed
$haveAny = @(Get-ChildItem -Path $nvmHome -Directory -ErrorAction SilentlyContinue | Where-Object { $_.Name -match '^v?[0-9]+\.[0-9]+\.[0-9]+$' }).Count -gt 0
if (-not $haveAny) {
    Write-Host 'No Node versions found under NVM. Installing latest LTS...' -ForegroundColor Yellow
    & $nvmExe install lts | Out-Host
}

# Activate latest LTS
& $nvmExe use lts | Out-Host

# After activation, ensure PATH includes the symlink & npm user bin
foreach ($p in @($nvmSymlink, $userNpm)) {
    if ($p -and ($env:PATH -notlike "*$p*")) {
        $env:PATH = "$p;$env:PATH"
    }
}

# Report versions
try { Write-Host ("nvm:  " + ((& $nvmExe version) 2>$null)) } catch { Write-Host 'nvm: not found' }
try { Write-Host ("node: " + ((node --version) 2>$null)) } catch { Write-Host 'node: not found' }
try { Write-Host ("npm:  " + ((npm --version) 2>$null)) } catch { Write-Host 'npm: not found' }
try { Write-Host ("npx:  " + ((npx --version) 2>$null)) } catch { Write-Host 'npx: not found' }
