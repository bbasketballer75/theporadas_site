# finish-revert-conflicts.ps1
# Restores conflicted files from the parent of the target commit and finalizes the revert commit,
# then pushes the revert branch to origin. Run from repo root.
$ErrorActionPreference = 'Stop'
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
$repoRoot = Resolve-Path (Join-Path $scriptDir '..')
Set-Location $repoRoot

$commit = '480412c'
$files = @(
    'scripts/format-and-commit.ps1',
    'scripts/shutdown-mcp.ps1',
    'scripts/start-mcp-service.ps1',
    'scripts/stop-mcp-containers.ps1'
)

foreach ($f in $files) {
    Write-Output "Restoring $f from $commit^"
    & git checkout "$($commit)^" -- "$f"
    & git add "$f"
}

Write-Output 'Committing revert resolution'
& git commit -m "revert: undo formatting commit $commit (auto-resolve for changed scripts)"
Write-Output 'Pushing revert branch to origin'
& git push origin HEAD
Write-Output 'Revert branch finalized and pushed'
