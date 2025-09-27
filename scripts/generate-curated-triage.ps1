<#
generate-curated-triage.ps1

Creates a small, curated triage summary from available security-scans outputs.
- Produces security-scans/curated/triage-summary.csv with pattern,count
- Produces small sample markdowns for each pattern with up to N sample lines
This script intentionally caps output sizes so results are safe to keep in the repo.
#>

param(
    [int]
    $MaxSamplesPerPattern = 5,

    [string]
    $ScansDir = "security-scans",

    [string]
    $OutDir = "security-scans/curated"
)

if (-not (Test-Path $ScansDir)) {
    Write-Output "No scans directory found at: $ScansDir. Nothing to curate."; exit 0
}

New-Item -ItemType Directory -Path $OutDir -Force | Out-Null
New-Item -ItemType Directory -Path (Join-Path $OutDir 'samples') -Force | Out-Null

# Patterns to summarize (should mirror the audit script list)
$patterns = @(
    @{ Key='AWS_AK'; File='AWS_AK.txt'; Regex='AKIA[0-9A-Z]{16}' },
    @{ Key='AWS_ASIA'; File='AWS_ASIA.txt'; Regex='ASIA[0-9A-Z]{16}' },
    @{ Key='GITHUB_PAT'; File='GITHUB_PAT.txt'; Regex='ghp_[0-9A-Za-z_]{36,}' },
    @{ Key='GITHUB_ACTIONS'; File='GITHUB_ACTIONS.txt'; Regex='gho_[0-9A-Za-z_]{36,}' },
    @{ Key='PEM'; File='PEM_KEY.txt'; Regex='-----BEGIN (RSA )?PRIVATE KEY-----' },
    @{ Key='GENERIC_REDACTED_BY_AUDIT_ISSUE_70_ASSIGN'; File='GENERIC_REDACTED_BY_AUDIT_ISSUE_70_ASSIGN.txt'; Regex='(?i)\b(?:secret|token|password|pwd|api[_-]?key)\b' }
)

$summary = @()
foreach ($p in $patterns) {
    $path = Join-Path $ScansDir $p.File
    $count = 0
    $samples = @()
    if (Test-Path $path) {
        # Count matches and collect up to MaxSamplesPerPattern lines
        $lines = Get-Content -Path $path -ErrorAction SilentlyContinue
        foreach ($l in $lines) {
            if ($l -match $p.Regex) {
                $count++
                if ($samples.Count -lt $MaxSamplesPerPattern) { $samples += $l.Trim() }
            }
        }
    }
    else {
        # If a per-pattern file is not present, attempt to search the scans dir
        $hits = Select-String -Path (Join-Path $ScansDir '*.*') -Pattern $p.Regex -AllMatches -ErrorAction SilentlyContinue
        $count = ($hits | Measure-Object).Count
        $samples = ($hits | Select-Object -First $MaxSamplesPerPattern | ForEach-Object { $_.Line.Trim() })
    }

    $summary += [pscustomobject]@{ Pattern = $p.Key; Count = $count }

    # Write a small sample file
    $sampleFile = Join-Path $OutDir "samples/$($p.Key)-samples.md"
    "# Samples for $($p.Key)`n`n" | Out-File -FilePath $sampleFile -Encoding utf8
    if ($samples.Count -eq 0) { "No matches found." | Out-File -FilePath $sampleFile -Append -Encoding utf8 }
    else { $samples | ForEach-Object { "- `"$($_)`"" } | Out-File -FilePath $sampleFile -Append -Encoding utf8 }
}

# Write the summary CSV (small)
$summaryCsv = Join-Path $OutDir 'triage-summary.csv'
"Pattern,Count" | Out-File -FilePath $summaryCsv -Encoding utf8
$summary | Sort-Object -Property Count -Descending | ForEach-Object { "{0},{1}" -f $_.Pattern, $_.Count } | Out-File -FilePath $summaryCsv -Append -Encoding utf8

Write-Output "Curated summary written to: $summaryCsv"
Write-Output "Per-pattern sample files written to: $(Join-Path $OutDir 'samples')"