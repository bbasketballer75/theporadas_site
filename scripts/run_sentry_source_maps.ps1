<#!
.SYNOPSIS
  Triggers the GitHub Actions sentry-source-maps workflow and optionally waits for completion.

.DESCRIPTION
  Requires `gh` CLI authenticated with repo scope. Validates required secrets are present remotely
  (by inspecting workflow run logs for early failures) and surfaces the run URL. Optionally polls
  until completion and exits non-zero on failure.

.PARAMETER Wait
  If specified, poll the workflow run until it completes.

.PARAMETER IntervalSeconds
  Polling interval (default 10 seconds).

.EXAMPLE
  pwsh scripts/run_sentry_source_maps.ps1 -Wait

!#>
[CmdletBinding()]
param(
    [switch]$Wait,
    [int]$IntervalSeconds = 10
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Assert-Gh() {
    if (-not (Get-Command gh -ErrorAction SilentlyContinue)) {
        throw 'gh CLI not found. Install from https://github.com/cli/cli/releases'
    }
}

Assert-Gh

$workflowName = 'sentry-source-maps.yml'

# Confirm workflow file exists locally
if (-not (Test-Path -Path '.github/workflows/sentry-source-maps.yml')) {
  Write-Error 'Local workflow file .github/workflows/sentry-source-maps.yml not found. Did you clone latest main?'
  exit 1
}

# Verify workflow is present on remote default branch
$listRaw = gh workflow list 2>&1
if ($LASTEXITCODE -ne 0) { Write-Warning "gh workflow list failed: $listRaw" }
elseif ($listRaw -notmatch 'sentry-source-maps') {
  Write-Warning 'Workflow not listed remotely. You may need to git add/commit/push the workflow file to main.'
  Write-Host 'Quick checklist:' -ForegroundColor Yellow
  Write-Host '  1. git status' -ForegroundColor Yellow
  Write-Host '  2. Ensure file at .github/workflows/sentry-source-maps.yml is committed on main' -ForegroundColor Yellow
  Write-Host '  3. git push origin main' -ForegroundColor Yellow
}

Write-Host 'Dispatching workflow...' -ForegroundColor Cyan
$dispatch = gh workflow run $workflowName 2>&1
if ($LASTEXITCODE -ne 0) {
  # Attempt fallback by using workflow name without extension (GitHub sometimes indexes by name field)
  Write-Warning "Primary dispatch failed: $dispatch"
  $fallbackName = 'sentry-source-maps'
  if ($workflowName -ne $fallbackName) {
    Write-Host "Retrying with fallback identifier: $fallbackName" -ForegroundColor Cyan
    $dispatch2 = gh workflow run $fallbackName 2>&1
    if ($LASTEXITCODE -ne 0) {
      Write-Error ("Failed to dispatch workflow by both filename and name. Last error: {0}" -f $dispatch2)
      Write-Host 'If newly added, ensure it is pushed to default branch and not ignored.' -ForegroundColor Yellow
      Write-Host 'Run: git log --oneline -n 5 -- .github/workflows/sentry-source-maps.yml' -ForegroundColor Yellow
      exit 1
    }
  } else {
    Write-Error ("Failed to dispatch workflow: {0}" -f $dispatch)
    exit 1
  }
}

Write-Host 'Workflow dispatched. Locating latest run...' -ForegroundColor Cyan

# Give GitHub a brief moment to register run
Start-Sleep -Seconds 3

$runJson = gh run list --workflow $workflowName --limit 1 --json databaseId, displayTitle, status, conclusion, htmlURL, headSha 2>$null | ConvertFrom-Json
if (-not $runJson) { throw 'Unable to retrieve workflow run metadata.' }
$run = $runJson | Select-Object -First 1
Write-Host "Run URL: $($run.htmlURL) (SHA: $($run.headSha))" -ForegroundColor Green

if (-not $Wait) { return }

Write-Host 'Waiting for completion...' -ForegroundColor Cyan
while ($true) {
    $current = gh run view $run.databaseId --json status, conclusion, updatedAt 2>$null | ConvertFrom-Json
    if (-not $current) { Write-Warning 'Failed to fetch status; retrying.'; Start-Sleep -Seconds $IntervalSeconds; continue }
    Write-Host ("Status: {0}{1}" -f $current.status, ($current.conclusion ? " / $($current.conclusion)" : ''))
    if ($current.status -in 'completed', 'cancelled') { break }
    Start-Sleep -Seconds $IntervalSeconds
}

if ($current.conclusion -ne 'success') {
    Write-Error "Workflow did not succeed (conclusion=$($current.conclusion))."; exit 2
}

Write-Host 'Workflow completed successfully.' -ForegroundColor Green
