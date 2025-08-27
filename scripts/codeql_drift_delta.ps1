Param(
    [switch]$MockBaseline,
    [string]$BaselineCounts = '{"total":0,"critical":0,"high":0,"medium":0,"low":0}',
    [string]$CurrentCounts = '{"total":0,"critical":0,"high":0,"medium":0,"low":0}',
    [switch]$Quiet
)

$ErrorActionPreference = 'Stop'

$repo = $env:GITHUB_REPOSITORY
if (-not $repo) { Write-Error 'GITHUB_REPOSITORY not set'; exit 1 }

$notesPath = Join-Path (Get-Location) 'SECURITY_NOTES.md'
if (-not (Test-Path $notesPath)) { Write-Error 'SECURITY_NOTES.md not found'; exit 1 }
$notes = Get-Content $notesPath -Raw

function Parse-Baseline {
    param([string]$Content)
    $heading = Select-String -InputObject $Content -Pattern '^## CodeQL Baseline Verification \(First Automated Run .*\)$' -SimpleMatch -CaseSensitive -AllMatches
    if (-not $heading) { return $null }
    $index = $heading.Matches[0].Index
    $after = $Content.Substring($index)
    $next = ($after.IndexOf("`n## ", 1))
    if ($next -gt 0) { $section = $after.Substring(0, $next) } else { $section = $after }
    $counts = @{ total = $null; critical = $null; high = $null; medium = $null; low = $null }
    foreach ($line in $section -split "`n") {
        if ($line -match '^- (Alerts \(Total\)|Critical|High|Medium|Low):\s+(\d+)') {
            $key = $Matches[1].ToLower()
            $val = [int]$Matches[2]
            switch ($key) {
                'alerts (total)' { $counts.total = $val }
                'critical' { $counts.critical = $val }
                'high' { $counts.high = $val }
                'medium' { $counts.medium = $val }
                'low' { $counts.low = $val }
            }
        }
    }
    if ($counts.Values -contains $null) { return $null }
    return $counts
}

$baselineCounts = Parse-Baseline -Content $notes
if (-not $baselineCounts -and -not $MockBaseline) {
    Write-Warning 'Baseline verification section not found; use -MockBaseline for dry-run.'
    exit 0
}

if ($MockBaseline) {
    try { $baselineCounts = (ConvertFrom-Json $BaselineCounts) } catch { Write-Error 'Invalid BaselineCounts JSON'; exit 2 }
    try { $currentCounts = (ConvertFrom-Json $CurrentCounts) } catch { Write-Error 'Invalid CurrentCounts JSON'; exit 2 }
}
else {
    # Real fetch path not implemented in PowerShell variant (Node script handles real mode)
    $currentCounts = $baselineCounts
}

function New-Delta($curr, $base) {
    return [ordered]@{
        total    = $curr.total - $base.total
        critical = $curr.critical - $base.critical
        high     = $curr.high - $base.high
        medium   = $curr.medium - $base.medium
        low      = $curr.low - $base.low
    }
}
$delta = New-Delta $currentCounts $baselineCounts

$date = (Get-Date).ToString('yyyy-MM-dd')
function Format-Delta([int]$v) { if ($v -eq 0) { '0' } elseif ($v -gt 0) { "+$v" } else { "$v" } }
$report = @()
$report += "## CodeQL Drift Report ($date)"
$report += ''
$report += 'Delta since First Automated Run baseline (current - baseline):'
$report += ''
$report += '| Severity | Baseline | Current | Delta |'
$report += '|----------|----------|---------|-------|'
$report += "| Total | $($baselineCounts.total) | $($currentCounts.total) | $(Format-Delta $delta.total) |"
$report += "| Critical | $($baselineCounts.critical) | $($currentCounts.critical) | $(Format-Delta $delta.critical) |"
$report += "| High | $($baselineCounts.high) | $($currentCounts.high) | $(Format-Delta $delta.high) |"
$report += "| Medium | $($baselineCounts.medium) | $($currentCounts.medium) | $(Format-Delta $delta.medium) |"
$report += "| Low | $($baselineCounts.low) | $($currentCounts.low) | $(Format-Delta $delta.low) |"
$report += ''
$report += 'Interpretation: Positive delta indicates new or unresolved alerts added since baseline; negative delta indicates net reduction (fixed / dismissed). Track High/Medium increases promptly.'
$reportText = $report -join "`n"

$artifactsDir = Join-Path (Get-Location) 'artifacts'
if (-not (Test-Path $artifactsDir)) { New-Item -ItemType Directory -Path $artifactsDir | Out-Null }
Set-Content -Path (Join-Path $artifactsDir 'codeql-drift-report.md') -Value $reportText -Encoding UTF8
Set-Content -Path (Join-Path $artifactsDir 'codeql-drift-delta.json') -Value (ConvertTo-Json $delta -Depth 5) -Encoding UTF8
Set-Content -Path (Join-Path $artifactsDir 'codeql-drift-baseline.json') -Value (ConvertTo-Json $baselineCounts -Depth 5) -Encoding UTF8
Set-Content -Path (Join-Path $artifactsDir 'codeql-drift-current-counts.json') -Value (ConvertTo-Json $currentCounts -Depth 5) -Encoding UTF8

if (-not $Quiet) {
    $summary = [ordered]@{ baseline = $baselineCounts; current = $currentCounts; delta = $delta }
    $summary | ConvertTo-Json -Depth 5 | Write-Output
}
