param(
  [switch]$AllHosts
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Write-Info($msg) { Write-Host "[fix-profile-uv] $msg" -ForegroundColor Cyan }
function Write-Warn($msg) { Write-Warning "[fix-profile-uv] $msg" }

function Process-ProfileFile([string]$profilePath) {
  Write-Info "Target profile: $profilePath"

  $profileDir = Split-Path -Parent $profilePath
  if (-not (Test-Path $profileDir)) {
    Write-Info "Creating profile directory: $profileDir"
    New-Item -ItemType Directory -Path $profileDir -Force | Out-Null
  }

  $existing = ""
  if (Test-Path $profilePath) {
    $existing = Get-Content -LiteralPath $profilePath -Raw
  }
  else {
    Write-Info "Profile file did not exist; creating fresh profile."
  }

  $lines = @()
  if ($existing) { $lines = $existing -split "`r?`n" }

  $changed = $false
  $outputLines = @()

  # Comment any unguarded uv/uvx completion lines (handles &, parentheses, and variations)
  $completionPatterns = @(
    '(?i)\buv(?:\.exe)?\b.*\bgenerate(?:-shell)?-completion\b.*\bpowershell\b',
    '(?i)\buvx(?:\.exe)?\b.*\bcompletion\b.*\bpowershell\b'
  )

  # Comment any direct beast-mode invocations (avoid running commands on startup)
  $beastInvokePatterns = @(
    '(?i)^\s*(?:&\s*)?\(?\s*beast-mode\b.*$',
    '(?i)^\s*(?:&\s*)?\(?\s*Invoke-BeastMode\b.*$',
    '(?i)^\s*Import-Module\s+BeastMode\b.*$'
  )

  foreach ($line in $lines) {
    $shouldComment = $false
    foreach ($pat in $completionPatterns + $beastInvokePatterns) {
      if ($line -match $pat) { $shouldComment = $true; break }
    }
    if ($shouldComment -and ($line -notmatch '^\s*#')) {
      $outputLines += "# (guarded) $line"
      $changed = $true
    }
    else {
      $outputLines += $line
    }
  }

  $guardBlock = @'
# uv completions (guarded)
if (Get-Command uv -ErrorAction SilentlyContinue) {
  try {
    uv generate-shell-completion powershell | Out-String | Invoke-Expression
  } catch {
    Write-Verbose "uv completions unavailable: $($_.Exception.Message)"
  }
}
'@

  if (-not ($existing -match '(?ms)^#\s*uv\s+completions\s*\(guarded\)')) {
    if ($outputLines.Count -gt 0 -and $outputLines[-1] -notmatch '^\s*$') { $outputLines += '' }
    $outputLines += $guardBlock.TrimEnd()
    $changed = $true
  }

  if ($changed -or -not (Test-Path $profilePath)) {
    $content = ($outputLines -join [Environment]::NewLine)
    Set-Content -LiteralPath $profilePath -Value $content -Encoding UTF8
    Write-Info "Profile updated with uv guard(s)."
  }
  else {
    Write-Info "No changes needed; uv guards already in place."
  }
}

# Determine which profile(s) to modify
$targets = @()
if ($AllHosts) {
  # Process both AllHosts and current host for the current user
  $targets += $PROFILE.CurrentUserAllHosts
  $targets += $PROFILE # CurrentUserCurrentHost
  # Also include standard profile file names if present
  $docPS = Join-Path $env:USERPROFILE 'Documents/PowerShell'
  $standardFiles = @('Microsoft.PowerShell_profile.ps1', 'profile.ps1') | ForEach-Object { Join-Path $docPS $_ }
  foreach ($f in $standardFiles) { if (Test-Path $f) { $targets += $f } }
}
else {
  $targets += $PROFILE
}

$targets = $targets | Where-Object { $_ -and $_.Trim() } | Select-Object -Unique
foreach ($t in $targets) { Process-ProfileFile -profilePath $t }

Write-Info "Done. Open a new terminal to verify."
