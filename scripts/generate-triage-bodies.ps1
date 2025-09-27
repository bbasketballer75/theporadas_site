<#
generate-triage-bodies.ps1

Generates per-pattern triage issue bodies under .github/triage-issue-bodies/ using
security-scans/curated/triage-summary.csv and the samples directory.

Each generated body will include:
- short summary (pattern + count)
- sample lines (up to the curated cap)
- link to release artifacts placeholder (RELEASE_URL) — replaced after release creation
#>

param(
    [string]$CuratedDir = "security-scans/curated",
    [string]$TriageDir = ".github/triage-issue-bodies",
    [string]$ReleaseUrl = "RELEASE_URL_PLACEHOLDER"
)

if (-not (Test-Path $CuratedDir)) { Write-Error "Curated dir not found: $CuratedDir"; exit 1 }
New-Item -ItemType Directory -Path $TriageDir -Force | Out-Null

$summaryCsv = Join-Path $CuratedDir 'triage-summary.csv'
$samplesDir = Join-Path $CuratedDir 'samples'

if (-not (Test-Path $summaryCsv)) { Write-Error "Summary CSV not found: $summaryCsv"; exit 1 }

$rows = Import-Csv -Path $summaryCsv -Header Pattern, Count | Where-Object { $_.Pattern -ne 'Pattern' }
foreach ($r in $rows) {
    if ([int]$r.Count -eq 0) { continue }
    $pattern = $r.Pattern
    $count = [int]$r.Count
    $bodyFile = Join-Path $TriageDir "$pattern.md"

    "# Triage: $pattern`n" | Out-File -FilePath $bodyFile -Encoding utf8
    "**Matches found:** $count`n`n" | Out-File -FilePath $bodyFile -Append -Encoding utf8
    "## Samples`n" | Out-File -FilePath $bodyFile -Append -Encoding utf8
    $sampleFile = Join-Path $samplesDir "$pattern-samples.md"
    if (Test-Path $sampleFile) {
        Get-Content $sampleFile | Out-File -FilePath $bodyFile -Append -Encoding utf8
    }
    else {
        "No sample file available.`n" | Out-File -FilePath $bodyFile -Append -Encoding utf8
    }

    "`n## Raw outputs`n" | Out-File -FilePath $bodyFile -Append -Encoding utf8
    "Raw scans and full outputs are archived in the release: $ReleaseUrl`n" | Out-File -FilePath $bodyFile -Append -Encoding utf8
}

Write-Output "Generated triage bodies in: $TriageDir"