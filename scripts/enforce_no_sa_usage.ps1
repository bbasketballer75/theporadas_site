<#$
.SYNOPSIS
  Scans the repository for disallowed 'sa' SQL Server login usage in source/config files.

.DESCRIPTION
  Intended to be used in CI to prevent regressions once application migrated off 'sa'.
  Allowed patterns (whitelisted): documentation references inside docs/internal/* and this script itself.

.EXITCODES
  0 - No violations
  1 - Violations found

.EXAMPLE
  pwsh scripts/enforce_no_sa_usage.ps1
#>
[CmdletBinding()]
param(
    [string]$Root = (Resolve-Path "$PSScriptRoot/.."),
    [string[]]$Extensions = @('*.ts', '*.tsx', '*.js', '*.cjs', '*.mjs', '*.json', '*.yml', '*.yaml', '*.ps1', '*.sql', '*.env', '*.md')
)

Write-Host "Scanning $Root for disallowed 'sa' usage..." -ForegroundColor Cyan

$whitelistPaths = @(
    [IO.Path]::GetFullPath("$Root/docs/internal"),
    [IO.Path]::GetFullPath("$PSScriptRoot/enforce_no_sa_usage.ps1")
)

function Test-Whitelisted($path) {
    $full = [IO.Path]::GetFullPath($path)
    foreach ($w in $whitelistPaths) { if ($full.StartsWith($w, [StringComparison]::OrdinalIgnoreCase)) { return $true } }
    return $false
}

$files = foreach ($ext in $Extensions) { Get-ChildItem -Path $Root -Recurse -File -Include $ext -ErrorAction SilentlyContinue }

$violations = @()
foreach ($file in $files) {
    if (Test-Whitelisted $file.FullName) { continue }
    $content = Get-Content -LiteralPath $file.FullName -Raw -ErrorAction SilentlyContinue
    if (-not $content) { continue }
    # simple patterns: user=sa, User ID=sa, "sa" in connection strings
    if ($content -match '(?i)user([ _]?id)?\s*=\s*sa' -or $content -match '(?i)"sa"' -or $content -match "'sa'") {
        $violations += $file.FullName
    }
}

if ($violations.Count -gt 0) {
    Write-Host "Found disallowed 'sa' usage in the following files:" -ForegroundColor Red
    $violations | Sort-Object | ForEach-Object { Write-Host " - $_" }
    Write-Error "Disallowed 'sa' references detected. Remove or justify in docs/internal with explicit context." -ErrorAction Continue
    exit 1
}

Write-Host "No disallowed 'sa' usage detected." -ForegroundColor Green
exit 0
