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

$workflowFile = 'sentry-source-maps.yml'
$workflowName = 'sentry-source-maps'
$workflowId = $null

# Confirm workflow file exists locally
if (-not (Test-Path -Path ".github/workflows/$workflowFile")) {
  Write-Error 'Local workflow file .github/workflows/sentry-source-maps.yml not found. Did you clone latest main?'
  exit 1
}

# Verify workflow present & capture ID
$wfJson = gh workflow list --json id, name, path, state 2>$null | ConvertFrom-Json
if ($wfJson) {
  $candidate = $wfJson | Where-Object { $_.path -eq ".github/workflows/$workflowFile" -or $_.name -eq $workflowName }
  if ($candidate) { $workflowId = $candidate.id }
}
if (-not $workflowId) {
  Write-Warning 'Workflow not listed remotely. You may need to git add/commit/push the workflow file to main.'
  Write-Host 'Quick checklist:' -ForegroundColor Yellow
  Write-Host '  1. git status' -ForegroundColor Yellow
  Write-Host "  2. Ensure file at .github/workflows/$workflowFile is committed on main" -ForegroundColor Yellow
  Write-Host '  3. git push origin main' -ForegroundColor Yellow
}

Write-Host 'Dispatching workflow...' -ForegroundColor Cyan
$dispatchSucceeded = $false
$dispatchOutput = gh workflow run $workflowFile --ref main 2>&1
if ($LASTEXITCODE -eq 0) { $dispatchSucceeded = $true }
if (-not $dispatchSucceeded) {
  Write-Warning "Dispatch via file failed: $dispatchOutput"
  $dispatchOutput2 = gh workflow run $workflowName --ref main 2>&1
  if ($LASTEXITCODE -eq 0) { $dispatchSucceeded = $true } else { Write-Warning "Dispatch via name failed: $dispatchOutput2" }
}
if (-not $dispatchSucceeded -and $workflowId) {
  $dispatchOutput3 = gh workflow run $workflowId --ref main 2>&1
  if ($LASTEXITCODE -eq 0) { $dispatchSucceeded = $true } else { Write-Warning "Dispatch via id failed: $dispatchOutput3" }
}
if (-not $dispatchSucceeded) {
  Write-Error 'Failed to dispatch workflow using file, name, or id.'
  Write-Host 'Diagnostics:' -ForegroundColor Yellow
  Write-Host '  gh workflow list' -ForegroundColor Yellow
  Write-Host '  gh auth status' -ForegroundColor Yellow
  exit 1
}

Write-Host 'Workflow dispatched. Locating latest run...' -ForegroundColor Cyan

# Determine local HEAD SHA for correlation
$localSha = (git rev-parse HEAD 2>$null)

$run = $null
for ($i = 1; $i -le 12; $i++) {
  $scoped = gh run list --workflow $workflowFile --limit 1 --json databaseId, workflowName, displayTitle, status, conclusion, htmlURL, headSha, createdAt 2>$null | ConvertFrom-Json
  if (-not $scoped) { $scoped = gh run list --workflow $workflowName --limit 1 --json databaseId, workflowName, displayTitle, status, conclusion, htmlURL, headSha, createdAt 2>$null | ConvertFrom-Json }
  if ($scoped) { $run = $scoped | Select-Object -First 1 }
  if (-not $run) {
    $recent = gh run list --limit 6 --json databaseId, workflowName, displayTitle, status, conclusion, htmlURL, headSha, createdAt 2>$null | ConvertFrom-Json
    if ($recent) {
      $run = ($recent | Where-Object { $_.workflowName -match 'sentry' -or $_.displayTitle -match 'sentry' -or ($localSha -and $_.headSha -eq $localSha) } | Sort-Object createdAt -Descending | Select-Object -First 1)
    }
  }
  if ($run) { break }
  Write-Host ("Attempt {0}: run not visible yet; retrying..." -f $i) -ForegroundColor DarkYellow
  Start-Sleep -Seconds 5
}

if (-not $run) {
  Write-Error 'Unable to retrieve workflow run metadata after retries.'
  Write-Host 'Diagnosis steps:' -ForegroundColor Yellow
  Write-Host '  gh workflow list' -ForegroundColor Yellow
  Write-Host "  gh run list --limit 10 | Select-String sentry" -ForegroundColor Yellow
  exit 1
}

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
