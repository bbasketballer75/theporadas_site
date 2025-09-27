<#
format-and-commit.ps1

Runs Prettier across the repository (JS/TS/JSON/MD files), creates a commit with formatted results, and leaves the working tree ready for push.
Requires npm and git to be available.
#>
param(
    [switch]$Push,
    [string]$CommitMessage = 'chore: format repository with Prettier'
)
$ErrorActionPreference = 'Stop'
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
Set-Location (Resolve-Path (Join-Path $scriptDir '..'))

if (Test-Path 'package-lock.json') { Write-Output 'Running npm ci to ensure deterministic deps...' ; npm ci } else { Write-Output 'No package-lock.json found: skipping npm ci' }

Write-Output 'Running Prettier (npm run format)...'
npm run format

$status = git status --porcelain
if ($status -ne '') {
    Write-Output 'Staging formatting changes...'
    git add -A
    git commit -m $CommitMessage
    Write-Output 'Created formatting commit locally.'
    if ($Push) {
        Write-Output 'Pushing formatting commit to origin...'
        git push origin HEAD
    } else { Write-Output 'Not pushing; pass -Push to push the formatting commit.' }
} else {
    Write-Output 'No formatting changes detected.'
}

exit 0
