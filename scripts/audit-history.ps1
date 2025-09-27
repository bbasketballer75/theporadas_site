<#
Audit history script: finds gitlink (mode 160000) entries and large blob objects in repository history.
Writes results to logs/history-audit.txt and prints a short summary to stdout.
#>
$ErrorActionPreference = 'Stop'
$repoRoot = Split-Path -Parent $MyInvocation.MyCommand.Definition | Resolve-Path
Set-Location $repoRoot
$logsDir = Join-Path $repoRoot 'logs'
if (-not (Test-Path $logsDir)) { New-Item -Path $logsDir -ItemType Directory | Out-Null }
$auditPath = Join-Path $logsDir 'history-audit.txt'
"History audit run at: $(Get-Date -Format o)" | Out-File -FilePath $auditPath -Encoding UTF8

# 1) Find gitlink (submodule) entries (mode 160000) across all commits
"\n-- Gitlinks (mode 160000) found in commits --" | Out-File -Append -FilePath $auditPath
$foundGitlinks = $false
$commits = git rev-list --all
foreach ($c in $commits) {
    $lines = git ls-tree -r $c
    if ($lines) {
        foreach ($line in $lines) {
            if ($line -match '^\s*160000') {
                "$c`t$line" | Out-File -Append -FilePath $auditPath
                $foundGitlinks = $true
            }
        }
    }
}
if (-not $foundGitlinks) { "No gitlink entries found in history." | Out-File -Append -FilePath $auditPath }

# 2) Find large blob objects (threshold = 5 MB)
"\n-- Large blobs (>5MB) --" | Out-File -Append -FilePath $auditPath
$threshold = 5MB
$largeFound = $false
# Use git rev-list to enumerate objects and cat-file to get sizes
git rev-list --objects --all | ForEach-Object {
    $line = $_
    if (-not [string]::IsNullOrWhiteSpace($line)) {
        $firstSpace = $line.IndexOf(' ')
        if ($firstSpace -ge 0) {
            $obj = $line.Substring(0, $firstSpace)
            $rest = $line.Substring($firstSpace + 1)
        }
        else {
            $obj = $line
            $rest = ''
        }
        try {
            $type = & git cat-file -t $obj 2>$null
        }
        catch {
            $type = $null
        }
        if ($type -eq 'blob') {
            try {
                $size = [int64](& git cat-file -s $obj)
            }
            catch {
                $size = 0
            }
            if ($size -gt $threshold) {
                $largeFound = $true
                "$obj $size $rest" | Out-File -Append -FilePath $auditPath
            }
        }
    }
}
if (-not $largeFound) { "No large blobs found (>5MB)." | Out-File -Append -FilePath $auditPath }

# 3) Summary output
Write-Output "Audit written to: $auditPath"
Write-Output "Gitlink entries: $foundGitlinks ; Large blobs found: $largeFound"
exit 0
