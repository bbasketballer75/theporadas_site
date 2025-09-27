# create-triage-issues.ps1
# Usage: run from repository root after installing and authenticating GitHub CLI (gh)

$bodyDir = ".github/triage-issue-bodies"
if (-not (Test-Path $bodyDir)) { Write-Error "No triage bodies directory found: $bodyDir"; exit 1 }

Get-ChildItem -Path $bodyDir -Filter *.md -File | ForEach-Object {
    $title = "Triage: " + $_.BaseName
    Write-Output "Creating issue for $($_.Name) -> $title"
    gh issue create --title $title --body-file $_.FullName --label "security/triage" --label "needs-rotation" | Out-Null
}
Write-Output "Triage issue creation script finished."
