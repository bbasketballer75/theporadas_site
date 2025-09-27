<#
verify-no-large-blobs.ps1

Scans the repository history for git blob objects larger than a threshold (defaults to 100 MB) and writes a small report.
Exits with non-zero when any objects exceed the threshold.

Usage:
  ./scripts/verify-no-large-blobs.ps1 -ThresholdMB 100 -ReportPath outputs/verify-report.txt
#>
param(
    [int]$ThresholdMB = 100,
    [string]$ReportPath = "outputs/verify-report.txt"
)

$thresholdBytes = [int64]$ThresholdMB * 1024 * 1024

New-Item -ItemType Directory -Path (Split-Path $ReportPath) -Force | Out-Null

# Gather objects and sizes using a single piped git call (more efficient than per-object queries)
$batch = & git rev-list --objects --all | & git cat-file --batch-check='%(objectname) %(objecttype) %(objectsize) %(rest)'

$blobLines = $batch | Where-Object { $_ -match '\sblob\s' }

$results = $blobLines | ForEach-Object {
    $parts = $_ -split ' ', 4
    [PSCustomObject]@{ Hash = $parts[0]; Type = $parts[1]; Size = [int64]$parts[2]; Path = ($parts.Length -ge 4 ? $parts[3] : '') }
}

$large = $results | Where-Object { $_.Size -gt $thresholdBytes } | Sort-Object -Property Size -Descending

if ($large.Count -eq 0) {
    "No git objects larger than $ThresholdMB MB were found in history." | Out-File -FilePath $ReportPath -Encoding utf8
    Write-Output "No large objects detected (threshold $ThresholdMB MB)."
    exit 0
}

# Write a compact report
@("Large git objects detected (threshold: $ThresholdMB MB)", "Count: $($large.Count)", "---") | Out-File -FilePath $ReportPath -Encoding utf8
$large | ForEach-Object {
    "{0} {1,12:N0} bytes {2}" -f $_.Hash, $_.Size, ($_.Path -replace '^\s+', '') | Out-File -FilePath $ReportPath -Append -Encoding utf8
}

Write-Output "Found $($large.Count) large objects; report written to $ReportPath"
exit 2
