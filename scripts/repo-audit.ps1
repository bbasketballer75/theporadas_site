<#
repo-audit.ps1

Scans the repository working tree and history for:
- Files larger than a size threshold (default 100 MB)
- Large git objects in history
- Likely secret patterns in tracked files
- Likely secret occurrences in recent commits (limited by a commit count default)

Generates an audit report at the repo root (default: audit-report.txt).
#>

param(
    [int]
    $SizeThresholdMB = 100,

    [int]
    $HistoryCommitsLimit = 500,

    [string]
    $OutputPath = "$PSScriptRoot\..\audit-report.txt"
)

function Convert-SizeToHuman([int64]$bytes) {
    if ($bytes -ge 1GB) { "{0:N2} GB" -f ($bytes / 1GB) }
    elseif ($bytes -ge 1MB) { "{0:N2} MB" -f ($bytes / 1MB) }
    elseif ($bytes -ge 1KB) { "{0:N2} KB" -f ($bytes / 1KB) }
    else { "{0} B" -f $bytes }
}

# Header
"Repository audit generated: $(Get-Date -Format o)" | Out-File -FilePath $OutputPath -Encoding utf8
"Size threshold (MB): $SizeThresholdMB" | Out-File -FilePath $OutputPath -Append
"History commit scan limit: $HistoryCommitsLimit commits" | Out-File -FilePath $OutputPath -Append
"" | Out-File -FilePath $OutputPath -Append

# 1) Working-tree: find files exceeding threshold
"== Working tree: files larger than $SizeThresholdMB MB ==" | Out-File -FilePath $OutputPath -Append
try {
    $trackedAndOtherFiles = & git ls-files -co --exclude-standard 2>$null
}
catch {
    $trackedAndOtherFiles = @()
}

$largeFiles = @()
if ($trackedAndOtherFiles -and $trackedAndOtherFiles.Count -gt 0) {
    foreach ($f in $trackedAndOtherFiles) {
        try {
            $fi = Get-Item -LiteralPath $f -ErrorAction SilentlyContinue
            if ($fi -and $fi.Length -gt ($SizeThresholdMB * 1MB)) {
                $largeFiles += [pscustomobject]@{ Path = $f; Size = $fi.Length }
            }
        }
        catch { }
    }
}
else {
    # Fallback: search the working tree but skip .git folder
    $allFiles = Get-ChildItem -Recurse -File -ErrorAction SilentlyContinue | Where-Object { $_.FullName -notmatch '\\.git\\' }
    foreach ($fi in $allFiles) {
        if ($fi.Length -gt ($SizeThresholdMB * 1MB)) {
            $largeFiles += [pscustomobject]@{ Path = $fi.FullName; Size = $fi.Length }
        }
    }
}

if ($largeFiles.Count -eq 0) {
    "No working-tree files exceed ${SizeThresholdMB}MB." | Out-File -FilePath $OutputPath -Append
}
else {
    $largeFiles | Sort-Object -Property Size -Descending | ForEach-Object {
        "{0}`t{1}" -f (Convert-SizeToHuman $_.Size), $_.Path | Out-File -FilePath $OutputPath -Append
    }
}

"" | Out-File -FilePath $OutputPath -Append

# 2) History: find large git objects (blobs)
"== Git history: large objects (blobs) larger than $SizeThresholdMB MB ==" | Out-File -FilePath $OutputPath -Append
try {
    $gitObjLines = & git rev-list --objects --all 2>$null | & git cat-file --batch-check='%(objecttype) %(objectname) %(objectsize) %(rest)' 2>$null
}
catch {
    $gitObjLines = @()
}

$bigObjects = @()
foreach ($line in $gitObjLines) {
    if ($line -match '^blob\s+([0-9a-fA-F]+)\s+(\d+)\s*(.*)$') {
        $id = $matches[1]
        $size = [int64]$matches[2]
        $path = $matches[3]
        if ($size -gt ($SizeThresholdMB * 1MB)) {
            $bigObjects += [pscustomobject]@{ Id = $id; Size = $size; Path = $path }
        }
    }
}

if ($bigObjects.Count -eq 0) {
    "No large git objects found in history exceeding ${SizeThresholdMB}MB." | Out-File -FilePath $OutputPath -Append
}
else {
    $bigObjects | Sort-Object -Property Size -Descending | ForEach-Object {
        "{0}`t{1}`t{2}" -f (Convert-SizeToHuman $_.Size), $_.Id, $_.Path | Out-File -FilePath $OutputPath -Append
    }
}

"" | Out-File -FilePath $OutputPath -Append

# 3) Working-tree: search for likely secret patterns in tracked files
"== Working tree: likely secret pattern matches in tracked files ==" | Out-File -FilePath $OutputPath -Append
$patterns = @(
    @{ Name = 'AWS Access Key (AKIA...)'; Regex = 'AKIA[0-9A-Z]{16}' },
    @{ Name = 'AWS Session Token (ASIA...)'; Regex = 'ASIA[0-9A-Z]{16}' },
    @{ Name = 'GitHub PAT (ghp_)'; Regex = 'ghp_[0-9A-Za-z_]{36,}' },
    @{ Name = 'GitHub Actions token (gho_)'; Regex = 'gho_[0-9A-Za-z_]{36,}' },
    @{ Name = 'Private key PEM header'; Regex = '-----BEGIN (RSA )?PRIVATE KEY-----' },
    @{ Name = 'Generic REDACTED_BY_AUDIT_ISSUE_70 or TOKEN assignment'; Regex = '(?i)\b(?:secret|token|password|pwd|api[_-]?key)\b\s*[:=]\s*(?:''|\")?[\w\-\._]+' }
)

$trackedFiles = @()
try { $trackedFiles = & git ls-files -co --exclude-standard 2>$null } catch { $trackedFiles = @() }

if ($trackedFiles.Count -eq 0) {
    "No tracked/unignored files found (or git not available) — skipping tracked-file secret scan." | Out-File -FilePath $OutputPath -Append
}
else {
    foreach ($p in $patterns) {
        "-- Pattern: $($p.Name) --" | Out-File -FilePath $OutputPath -Append
        foreach ($f in $trackedFiles) {
            try {
                $matches = Select-String -Path $f -Pattern $p.Regex -AllMatches -SimpleMatch:$false -ErrorAction SilentlyContinue
                if ($matches) {
                    foreach ($m in $matches) {
                        "{0}:{1}: {2}" -f $f, $m.LineNumber, ($m.Line.Trim()) | Out-File -FilePath $OutputPath -Append
                    }
                }
            }
            catch { }
        }
        "" | Out-File -FilePath $OutputPath -Append
    }
}

# 4) History: scan the most recent commits for the same patterns (limited)
"== Git history: scanning last $HistoryCommitsLimit commits for likely secret patterns ==" | Out-File -FilePath $OutputPath -Append
try {
    $commits = & git rev-list --all --max-count=$HistoryCommitsLimit 2>$null
}
catch {
    $commits = @()
}

if ($commits.Count -eq 0) {
    "No commits enumerated (git unavailable or empty repo) — skipping history pattern scan." | Out-File -FilePath $OutputPath -Append
}
else {
    foreach ($p in $patterns) {
        "-- Pattern: $($p.Name) --" | Out-File -FilePath $OutputPath -Append
        foreach ($c in $commits) {
            try {
                $out = & git grep -I -n -E $p.Regex $c 2>$null
                if ($LASTEXITCODE -eq 0 -and $out) {
                    "Commit: $c" | Out-File -FilePath $OutputPath -Append
                    $out | Out-File -FilePath $OutputPath -Append
                }
            }
            catch { }
        }
        "" | Out-File -FilePath $OutputPath -Append
    }
}

"" | Out-File -FilePath $OutputPath -Append
"Audit complete. Review the above results and rotate any exposed secrets immediately." | Out-File -FilePath $OutputPath -Append

Write-Output "Audit report written to: $OutputPath"
