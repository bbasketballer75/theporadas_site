Param(
    [switch]$Install,
    [switch]$WithNode,
    [switch]$WithPython,
    [switch]$WithGcloud,
    [switch]$WithPnpm,
    [switch]$WithGit,
    [switch]$WithUv,
    [switch]$WithDocker
)

$ErrorActionPreference = 'Stop'

function Write-Section($text) {
    Write-Host "`n=== $text ===" -ForegroundColor Cyan
}

function Test-Command($name) {
    $null -ne (Get-Command $name -ErrorAction SilentlyContinue)
}

function Ensure-WinGet() {
    if (-not (Test-Command winget)) {
        throw "winget not found. Install 'App Installer' from Microsoft Store, then retry."
    }
}

function Get-WinGet-Package($id) {
    # Returns $true if installed, else $false
    if (-not (Test-Command winget)) { return $false }
    $result = winget list --id $id -e --source winget 2>$null | Out-String
    return ($result -match [regex]::Escape($id))
}

function Ensure-Package($id, $name) {
    if (Get-WinGet-Package $id) {
        Write-Host "✓ $name already installed ($id)" -ForegroundColor Green
        return
    }
    if ($Install) {
        if (-not (Test-Command winget)) {
            Write-Host "✗ $name not installed and winget is unavailable. Skipping winget install." -ForegroundColor Yellow
            return
        }
        Write-Host "Installing $name ($id) via winget..." -ForegroundColor Yellow
        winget install --id $id -e --accept-package-agreements --accept-source-agreements --silent | Out-Host
    } else {
        Write-Host "✗ $name not installed. Run with -Install to install." -ForegroundColor Yellow
    }
}

function Show-Versions() {
    Write-Section "Tool versions"
    $tools = @(
    @{ n='winget'; c={ if (Test-Command winget) { winget --version } } },
        @{ n='git'; c={ if (Test-Command git) { git --version } } },
        @{ n='gcloud'; c={ if (Test-Command gcloud) { gcloud --version | Select-Object -First 1 } } },
        @{ n='nvm'; c={ if (Test-Command nvm) { nvm version } } },
        @{ n='node'; c={ if (Test-Command node) { node --version } } },
        @{ n='npm'; c={ if (Test-Command npm) { npm --version } } },
        @{ n='pnpm'; c={ if (Test-Command pnpm) { pnpm --version } } },
        @{ n='python'; c={ if (Test-Command python) { python --version } } },
        @{ n='pipx'; c={ if (Test-Command pipx) { pipx --version } } },
        @{ n='uv'; c={ if (Test-Command uv) { uv --version } } }
    )
    foreach ($t in $tools) {
        try {
            $out = & $t.c
            if ($out) { Write-Host ("{0}: {1}" -f $t.n, ($out | Out-String).Trim()) } else { Write-Host ("{0}: not found" -f $t.n) }
        } catch { Write-Host ("{0}: error" -f $t.n) }
    }
}

function Update-AppInstaller() {
    if (Test-Command winget) {
        Write-Host "Checking for App Installer (winget) updates..." -ForegroundColor Cyan
        try {
            winget upgrade Microsoft.AppInstaller -e --accept-package-agreements --accept-source-agreements --silent | Out-Host
        } catch {
            Write-Host "App Installer upgrade check failed or not needed." -ForegroundColor Yellow
        }
    }
}

function Add-ToUserPath($path) {
    if (-not $path) { return }
    if (-not (Test-Path $path)) { return }
    try {
        $userPath = [Environment]::GetEnvironmentVariable('Path','User')
        if ($null -eq $userPath) { $userPath = '' }
        if ($userPath -notlike "*${path}*") {
            $newPath = if ([string]::IsNullOrEmpty($userPath)) { $path } else { "$userPath;$path" }
            [Environment]::SetEnvironmentVariable('Path',$newPath,'User')
        }
        if ($env:PATH -notlike "*${path}*") { $env:PATH = "$env:PATH;$path" }
    } catch {}
}

# Ensure common user-level bin paths are on PATH for this session (do this before preflight checks)
try {
    $candidatePaths = @()
    $candidatePaths += (Join-Path $env:APPDATA 'npm')
    $candidatePaths += (Join-Path $env:LOCALAPPDATA 'nvm')
    $candidatePaths += (Join-Path $env:LOCALAPPDATA 'nodejs')
    $candidatePaths += 'C:\\Program Files\\nodejs'
    $candidatePaths += (Join-Path $env:USERPROFILE '.local\bin')
    try {
        $userBase = python -c "import site; print(site.USER_BASE)" 2>$null
        if ($userBase) { $candidatePaths += (Join-Path $userBase 'Scripts') }
    } catch {}
    $candidatePaths += (Join-Path $env:APPDATA 'Python\Python313\Scripts')
    $candidatePaths += (Join-Path $env:LOCALAPPDATA 'Microsoft\WindowsApps')
    foreach ($p in $candidatePaths) {
        if ($p -and (Test-Path $p) -and ($env:PATH -notlike "*$p*")) { $env:PATH = "$env:PATH;$p" }
    }
    if ($Install) {
        foreach ($p in $candidatePaths) { Add-ToUserPath $p }
    }
} catch {}

Write-Section "Preflight"
if ($Install) {
    if (-not (Test-Command winget)) {
        Write-Host "winget: not found. Will proceed and use non-winget fallbacks where possible." -ForegroundColor Yellow
    }
} else {
    if (-not (Test-Command winget)) {
        Write-Host "winget: not found (check mode will continue; installs require App Installer)" -ForegroundColor Yellow
    }
}

Write-Section "Checks"
Show-Versions

if ($Install) {
    Update-AppInstaller
    Write-Section "Installing missing tools (idempotent)"

    if ($WithGit) {
        if (Test-Command git) {
            Write-Host "✓ Git already installed (git found)" -ForegroundColor Green
        } else {
            Ensure-Package -id 'Git.Git' -name 'Git'
        }
    }
    if ($WithGcloud) {
        if (Test-Command gcloud) {
            Write-Host "✓ Google Cloud SDK already installed (gcloud found)" -ForegroundColor Green
        } else {
            Ensure-Package -id 'Google.CloudSDK' -name 'Google Cloud SDK'
        }
    }

    if ($WithNode) {
        # Prefer NVM for Windows for Node versioning; install once then let user choose versions per project
        if (-not (Test-Command nvm)) {
            Ensure-Package -id 'CoreyButler.NVMforWindows' -name 'NVM for Windows'
        }
        # Ensure NVM env vars and PATH are persisted and available in this session
        try {
            $nvmHome = [Environment]::GetEnvironmentVariable('NVM_HOME','Machine')
            if (-not $nvmHome) { $nvmHome = [Environment]::GetEnvironmentVariable('NVM_HOME','User') }
            if (-not $nvmHome) { $nvmHome = Join-Path $env:LOCALAPPDATA 'nvm' }
            $defaultProgramFiles = 'C:\\Program Files\\nodejs'
            $userSymlink = Join-Path $env:LOCALAPPDATA 'nodejs'
            $nvmLink = [Environment]::GetEnvironmentVariable('NVM_SYMLINK','Machine')
            if (-not $nvmLink) { $nvmLink = [Environment]::GetEnvironmentVariable('NVM_SYMLINK','User') }
            if (-not $nvmLink) { $nvmLink = $defaultProgramFiles }

            # Choose a writable symlink directory: prefer Program Files if writable, else user LOCALAPPDATA
            $useUserSymlink = $false
            try {
                if (-not (Test-Path $defaultProgramFiles)) { New-Item -ItemType Directory -Path $defaultProgramFiles -Force | Out-Null }
                $testFile = Join-Path $defaultProgramFiles '.__write_test__'
                Set-Content -Path $testFile -Value 'ok' -Force
                Remove-Item -Path $testFile -Force
            } catch { $useUserSymlink = $true }

            if ($useUserSymlink) { $nvmLink = $userSymlink }

            # Ensure NVM settings.txt has root/path and avoid physical dir at symlink path
            $settings = Join-Path $nvmHome 'settings.txt'
            try {
                if (Test-Path $nvmLink) {
                    $attr = (Get-Item $nvmLink -Force).Attributes
                    $isLink = ($attr -band [IO.FileAttributes]::ReparsePoint) -ne 0
                    if (-not $isLink) {
                        Remove-Item -Recurse -Force -Path $nvmLink
                        Write-Host "Removed physical directory at symlink path: $nvmLink" -ForegroundColor Yellow
                    }
                }
            } catch {}
            if (-not (Test-Path $settings)) {
                # Create with both root and path entries
                if (-not (Test-Path $nvmHome)) { New-Item -ItemType Directory -Path $nvmHome -Force | Out-Null }
                Set-Content -Path $settings -Value @(
                    "root: $nvmHome",
                    "path: $nvmLink"
                ) -Force
            } else {
                $lines = Get-Content $settings -ErrorAction SilentlyContinue
                $new   = @()
                $foundPath = $false
                $foundRoot = $false
                foreach ($l in $lines) {
                    if ($l -match '^path\s*:') { $new += ("path: $nvmLink"); $foundPath = $true }
                    elseif ($l -match '^root\s*:') { $new += ("root: $nvmHome"); $foundRoot = $true }
                    else { $new += $l }
                }
                if (-not $foundRoot) { $new += ("root: $nvmHome") }
                if (-not $foundPath) { $new += ("path: $nvmLink") }
                if (-not ($lines -join "`n").Equals($new -join "`n")) {
                    Set-Content -Path $settings -Value $new -Force
                    Write-Host "Updated NVM settings.txt (root/path) -> $nvmLink" -ForegroundColor Yellow
                }
            }

            # Persist env vars for future shells
            [Environment]::SetEnvironmentVariable('NVM_HOME', $nvmHome, 'User')
            [Environment]::SetEnvironmentVariable('NVM_SYMLINK', $nvmLink, 'User')

            # Set in current session so nvm knows where settings.txt is
            $env:NVM_HOME = $nvmHome
            $env:NVM_SYMLINK = $nvmLink

            # Ensure directories exist (avoid PATH entries to non-existent dirs)
            # Do NOT create the symlink target directory here; nvm will create a junction. Just ensure parent exists.
            try {
                $parent = Split-Path -Path $nvmLink -Parent
                if ($parent -and -not (Test-Path $parent)) { New-Item -ItemType Directory -Path $parent -Force | Out-Null }
            } catch {}

            # Add to PATH (current session and persist for user)
            Add-ToUserPath $nvmHome
            Add-ToUserPath $nvmLink
            Add-ToUserPath (Join-Path $env:APPDATA 'npm')
        } catch {}
        if (Test-Command nvm) {
            # Ensure at least one LTS Node exists if none installed under nvm
            $nvmRoot = "$env:LOCALAPPDATA\nvm"
            # NVM for Windows stores versions like "v22.18.0" (with 'v' prefix)
            $haveAny = @(Get-ChildItem -Path $nvmRoot -Directory -ErrorAction SilentlyContinue | Where-Object { $_.Name -match '^v?\d+\.\d+\.\d+$' }).Count -gt 0
            if (-not $haveAny) {
                Write-Host "No Node versions under NVM detected. Installing latest LTS..." -ForegroundColor Yellow
                try {
                    # Use the built-in alias for latest LTS
                    nvm install lts | Out-Host
                    # Ensure we don't hit physical directory issue before 'use'
                    try {
                        $link = [Environment]::GetEnvironmentVariable('NVM_SYMLINK','User')
                        if (-not $link) { $link = [Environment]::GetEnvironmentVariable('NVM_SYMLINK','Machine') }
                        if ($link -and (Test-Path $link)) {
                            $attr = (Get-Item $link -Force).Attributes
                            $isLink = ($attr -band [IO.FileAttributes]::ReparsePoint) -ne 0
                            if (-not $isLink) { Remove-Item -Recurse -Force -Path $link }
                        }
                    } catch {}
                    nvm use lts | Out-Host
                } catch {
                    Write-Host "Failed to auto-install Node LTS via nvm. You can run 'nvm install lts' later." -ForegroundColor Yellow
                }
            }
            # Ensure node/npm/npx are on PATH for this session after nvm use
            try {
                $userNpm = Join-Path $env:APPDATA 'npm'
                foreach ($p in @($nvmHome,$nvmLink,$userNpm)) {
                    if ($p -and (Test-Path $p) -and ($env:PATH -notlike "*$p*")) { $env:PATH = "$env:PATH;$p" }
                }
            } catch {}
        } else {
            Write-Host "NVM appears installed but not on PATH. Open a new terminal (or sign out/in) then run 'nvm version'." -ForegroundColor Yellow
        }
    }

    if ($WithPython) {
        # Ensure Python is present (prefer winget if available)
        if (-not (Test-Command python)) {
            if (Test-Command winget) {
                Ensure-Package -id 'Python.Python.3' -name 'Python 3'
            } else {
                Write-Host "Python not found and winget unavailable. Please install Python 3 manually from python.org." -ForegroundColor Yellow
            }
        }

        # Ensure pipx
        if (-not (Test-Command pipx)) {
            if (Test-Command winget) {
                Ensure-Package -id 'PyPA.pipx' -name 'pipx'
            } elseif (Test-Command python) {
                Write-Host "Installing pipx via pip (user)" -ForegroundColor Yellow
                try {
                    python -m pip install --user pipx | Out-Host
                    python -m pipx ensurepath | Out-Host
                    # Make pipx available in this session
                    $userBase = python -c "import site; print(site.USER_BASE)" 2>$null
                    if ($userBase) {
                        $userScripts = Join-Path $userBase 'Scripts'
                    } else {
                        $userScripts = Join-Path $env:APPDATA 'Python\Python313\Scripts'
                    }
                    $localBin = Join-Path $env:USERPROFILE '.local\bin'
                    foreach ($p in @($userScripts, $localBin)) {
                        if ($p -and (Test-Path $p) -and ($env:PATH -notlike "*$p*")) { $env:PATH = "$p;$env:PATH" }
                    }
                    Write-Host "pipx installed via pip. PATH updated for current session." -ForegroundColor Green
                } catch {
                    Write-Host "Failed to install pipx via pip." -ForegroundColor Red
                }
            }
        }
    }

    if ($WithPnpm) {
        # Prefer npm -g to avoid admin writes by Corepack; fallback to winget
        if (Test-Command pnpm) {
            Write-Host "✓ pnpm already installed" -ForegroundColor Green
        } elseif (Test-Command node) {
            try {
                # Ensure npm global prefix is user-level (avoid Program Files)
                $userNpm = Join-Path $env:APPDATA 'npm'
                try { $currentPrefix = (npm config get prefix 2>$null) } catch { $currentPrefix = '' }
                if (-not $currentPrefix -or $currentPrefix -like '*Program Files*') {
                    Write-Host "Configuring npm prefix to user dir: $userNpm" -ForegroundColor Yellow
                    npm config set prefix "$userNpm" | Out-Host
                    if ($env:PATH -notlike "*$userNpm*") { $env:PATH = "$userNpm;$env:PATH" }
                } else {
                    if ($env:PATH -notlike "*$currentPrefix*") { $env:PATH = "$currentPrefix;$env:PATH" }
                }
                Write-Host "Installing pnpm globally via npm (user)" -ForegroundColor Yellow
                npm install -g pnpm@latest --force | Out-Host
            } catch {
                Write-Host "npm global install of pnpm failed. Trying winget." -ForegroundColor Yellow
                Ensure-Package -id 'pnpm.pnpm' -name 'pnpm'
            }
        } else {
            Ensure-Package -id 'pnpm.pnpm' -name 'pnpm'
        }
    }

    if ($WithUv) {
        if (Test-Command uv) {
            Write-Host "✓ uv already installed" -ForegroundColor Green
        } elseif (Test-Command winget) {
            Ensure-Package -id 'astral-sh.uv' -name 'uv (Python tool)'
        } else {
            Write-Host "Installing uv via official script" -ForegroundColor Yellow
            try {
                Set-ExecutionPolicy Bypass -Scope Process -Force
                Invoke-Expression ((Invoke-WebRequest -UseBasicParsing -Uri 'https://astral.sh/uv/install.ps1').Content)
                $uvBin = Join-Path $env:USERPROFILE '.local\bin'
                if (Test-Path $uvBin -and ($env:PATH -notlike "*$uvBin*")) { $env:PATH = "$uvBin;$env:PATH" }
                Write-Host "uv installed. You may need to restart your terminal." -ForegroundColor Green
            } catch {
                Write-Host "Failed to install uv via script." -ForegroundColor Red
            }
        }
    }

    if ($WithDocker) {
        if (Test-Command docker) {
            Write-Host "✓ Docker CLI already available" -ForegroundColor Green
        } else {
            Ensure-Package -id 'Docker.DockerDesktop' -name 'Docker Desktop'
        }
        # Ensure Docker CLI path is on PATH for current session and future shells
        try {
            $dockerBin = Join-Path ${env:ProgramFiles} 'Docker/Docker/resources/bin'
            if (Test-Path $dockerBin) {
                Add-ToUserPath $dockerBin
            }
        } catch {}
    }
}

Write-Section "Done"
Show-Versions
