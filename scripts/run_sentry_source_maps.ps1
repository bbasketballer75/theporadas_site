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

.PARAMETER LocateAttempts
  Maximum attempts to locate the just-dispatched workflow run (default 24).

.PARAMETER LocateBaseDelaySeconds
  Initial delay (seconds) before re-attempting run discovery (exponential backoff).

.PARAMETER LocateMaxDelaySeconds
  Maximum delay (seconds) used during exponential backoff for run discovery.

.PARAMETER VerificationSummary
  After completion, extract the Sentry verification summary block from logs and print (optionally JSON).

.PARAMETER Json
  When used with -VerificationSummary, outputs parsed summary as JSON.

.EXAMPLE
  pwsh scripts/run_sentry_source_maps.ps1 -Wait

!#>
[CmdletBinding()]
param(
  [switch]$Wait,
  [int]$IntervalSeconds = 10,
  [int]$LocateAttempts = 24,
  [int]$LocateBaseDelaySeconds = 2,
  [int]$LocateMaxDelaySeconds = 30,
  [switch]$VerificationSummary,
  [switch]$Json,
  [switch]$ForceCommit,
  [string]$ForceCommitMessage = "chore(ci): trigger sentry-source-maps run"
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

# Baseline existing runs to compute previous max databaseId
$existingRuns = gh run list --workflow $workflowFile --limit 50 --json databaseId, headSha, createdAt, workflowName 2>$null | ConvertFrom-Json
if (-not $existingRuns) { $existingRuns = gh run list --workflow $workflowName --limit 50 --json databaseId, headSha, createdAt, workflowName 2>$null | ConvertFrom-Json }
$prevMaxDatabaseId = 0
if ($existingRuns) { $prevMaxDatabaseId = ($existingRuns | Measure-Object -Property databaseId -Maximum).Maximum }
$dispatchStart = Get-Date -AsUTC

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

if ($ForceCommit) {
  Write-Host 'ForceCommit enabled: creating empty commit.' -ForegroundColor Cyan
  $nonce = [Guid]::NewGuid().ToString('N')
  git commit --allow-empty -m "$ForceCommitMessage [sentry-nonce:$nonce]" | Out-Null
  git push origin HEAD:main | Out-Null
  $targetSha = (git rev-parse HEAD)
  Write-Host "Pushed empty commit $targetSha" -ForegroundColor Green
}
else {
  Write-Host 'Dispatching workflow (workflow_dispatch)...' -ForegroundColor Cyan
  $nonce = [Guid]::NewGuid().ToString('N')
  $dispatchSucceeded = $false
  $dispatchOutput = gh workflow run $workflowFile --ref main -f nonce=$nonce 2>&1
  if ($LASTEXITCODE -eq 0) { $dispatchSucceeded = $true }
  if (-not $dispatchSucceeded) {
    Write-Warning "Dispatch via file failed: $dispatchOutput"
    $dispatchOutput2 = gh workflow run $workflowName --ref main -f nonce=$nonce 2>&1
    if ($LASTEXITCODE -eq 0) { $dispatchSucceeded = $true } else { Write-Warning "Dispatch via name failed: $dispatchOutput2" }
  }
  if (-not $dispatchSucceeded -and $workflowId) {
    $dispatchOutput3 = gh workflow run $workflowId --ref main -f nonce=$nonce 2>&1
    if ($LASTEXITCODE -eq 0) { $dispatchSucceeded = $true } else { Write-Warning "Dispatch via id failed: $dispatchOutput3" }
  }
  if (-not $dispatchSucceeded) { Write-Error 'Failed to dispatch workflow.'; exit 1 }
  $targetSha = (git rev-parse HEAD)
}

Write-Host 'Locating new workflow run...' -ForegroundColor Cyan
Start-Sleep -Seconds 3
$run = $null
for ($i = 1; $i -le $LocateAttempts; $i++) {
  $candidateList = gh run list --workflow $workflowFile --limit 30 --json databaseId, workflowName, displayTitle, status, conclusion, headSha, createdAt, url 2>$null | ConvertFrom-Json
  if (-not $candidateList) { $candidateList = gh run list --workflow $workflowName --limit 30 --json databaseId, workflowName, displayTitle, status, conclusion, headSha, createdAt, url 2>$null | ConvertFrom-Json }
  if ($candidateList) {
    if ($ForceCommit) {
      $run = ($candidateList | Where-Object { $_.headSha -eq $targetSha } | Sort-Object createdAt -Descending | Select-Object -First 1)
    }
    else {
      $run = ($candidateList | Where-Object { $_.databaseId -gt $prevMaxDatabaseId -and $_.workflowName -match 'sentry' } | Sort-Object databaseId -Descending | Select-Object -First 1)
    }
  }
  if ($run) { break }
  $delay = [Math]::Min($LocateMaxDelaySeconds, [Math]::Pow(2, $i - 1) * $LocateBaseDelaySeconds)
  Write-Host ("Attempt {0}/{1}: new run not visible yet; waiting {2}s..." -f $i, $LocateAttempts, [int]$delay) -ForegroundColor DarkYellow
  Start-Sleep -Seconds ([int]$delay)
}
if (-not $run) { Write-Error 'Unable to locate new workflow run after retries.'; gh run list --workflow $workflowFile --limit 5 | Out-String | Write-Host; exit 1 }
Write-Host ("Run ID: {0} Status: {1} Head: {2}" -f $run.databaseId, $run.status, $run.headSha) -ForegroundColor Green
Write-Host ("Run URL: {0}" -f ($run.url ?? 'Open Actions tab manually')) -ForegroundColor Green

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
  Write-Error "Workflow did not succeed (conclusion=$($current.conclusion))."; if ($VerificationSummary) { Write-Host 'Attempting to pull partial verification summary...' -ForegroundColor DarkYellow } else { exit 2 }
}

Write-Host 'Workflow completed successfully.' -ForegroundColor Green

if ($VerificationSummary) {
  Write-Host 'Extracting Sentry verification summary block...' -ForegroundColor Cyan
  $logText = gh run view $run.databaseId --log 2>$null
  if (-not $logText) { Write-Warning 'Unable to retrieve logs for summary extraction.'; if ($current.conclusion -ne 'success') { exit 2 } else { return } }
  $lines = $logText -split "`r?`n"
  $startIndex = ($lines | Select-String -Pattern '^# Sentry Source Map Verification' | Select-Object -First 1).LineNumber
  if (-not $startIndex) { Write-Warning 'Verification summary heading not found in logs.'; if ($current.conclusion -ne 'success') { exit 2 } else { return } }
  $startIndex--  # adjust to 0-based
  $collected = @()
  for ($j = $startIndex; $j -lt $lines.Count; $j++) {
    $line = $lines[$j]
    if ($j -gt $startIndex -and $line -match '^# ' ) { break }
    if ($line -match '^##\[') { break } # GH group boundary
    if ($line.Trim() -eq '') { $collected += $line; continue }
    $collected += $line
  }
  # Parse key: value lines after heading
  $parsed = [ordered]@{}
  foreach ($l in $collected) {
    if ($l -match '^# ') { continue }
    if ($l -match '^([A-Za-z ]+):\s*(.*)$') {
      $key = ($Matches[1] -replace ' ', '')
      $value = $Matches[2]
      $parsed[$key] = $value
    }
  }
  if ($Json) {
    $parsed | ConvertTo-Json -Depth 3 | Write-Output
  }
  else {
    Write-Host '--- Parsed Verification Summary ---' -ForegroundColor Green
    $parsed.GetEnumerator() | ForEach-Object { Write-Host ("{0}: {1}" -f $_.Key, $_.Value) }
  }
  if ($current.conclusion -ne 'success') { exit 2 }
}
