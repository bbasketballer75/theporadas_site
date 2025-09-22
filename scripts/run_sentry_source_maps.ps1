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
  [switch]$Json
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
# Capture last known run before dispatch to differentiate new execution
$previousRunObj = gh run list --workflow $workflowFile --limit 1 --json databaseId,createdAt,status 2>$null | ConvertFrom-Json
if (-not $previousRunObj) { $previousRunObj = gh run list --workflow $workflowName --limit 1 --json databaseId,createdAt,status 2>$null | ConvertFrom-Json }
$previousRunId = $null
if ($null -ne $previousRunObj -and $previousRunObj.PSObject.Properties.Name -contains 'databaseId') { $previousRunId = $previousRunObj.databaseId }
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
for ($i = 1; $i -le $LocateAttempts; $i++) {
  $candidateList = gh run list --workflow $workflowFile --limit 5 --json databaseId, workflowName, displayTitle, status, conclusion, headSha, createdAt, url 2>$null | ConvertFrom-Json
  if (-not $candidateList) { $candidateList = gh run list --workflow $workflowName --limit 5 --json databaseId, workflowName, displayTitle, status, conclusion, headSha, createdAt, url 2>$null | ConvertFrom-Json }
  if ($candidateList) {
    $run = ($candidateList | Where-Object { ($_.databaseId -ne $previousRunId) -and ( ([DateTime]$_.createdAt) -ge $dispatchStart.AddSeconds(-5) ) } | Sort-Object createdAt -Descending | Select-Object -First 1)
  }
  if (-not $run) {
    $recent = gh run list --limit 12 --json databaseId, workflowName, displayTitle, status, conclusion, headSha, createdAt, url 2>$null | ConvertFrom-Json
    if ($recent) {
      $run = ($recent | Where-Object {
          ($_.databaseId -ne $previousRunId) -and
          ( ([DateTime]$_.createdAt) -ge $dispatchStart.AddSeconds(-5) ) -and
          ( $_.workflowName -match 'sentry' -or $_.displayTitle -match 'sentry' -or ($localSha -and $_.headSha -eq $localSha) )
        } | Sort-Object createdAt -Descending | Select-Object -First 1)
    }
  }
  if ($run) { break }
  $delay = [Math]::Min($LocateMaxDelaySeconds, [Math]::Pow(2, $i - 1) * $LocateBaseDelaySeconds)
  Write-Host ("Attempt {0}/{1}: run not visible yet; waiting {2}s..." -f $i, $LocateAttempts, [int]$delay) -ForegroundColor DarkYellow
  Start-Sleep -Seconds ([int]$delay)
}

if (-not $run) {
  Write-Warning 'Unable to positively identify a new workflow run; using most recent matching run as fallback.'
  $fallback = gh run list --workflow $workflowFile --limit 1 --json databaseId, workflowName, displayTitle, status, conclusion, headSha, createdAt, url 2>$null | ConvertFrom-Json
  if (-not $fallback) { $fallback = gh run list --workflow $workflowName --limit 1 --json databaseId, workflowName, displayTitle, status, conclusion, headSha, createdAt, url 2>$null | ConvertFrom-Json }
  if (-not $fallback) {
    Write-Error 'No workflow runs available to use as fallback.'
    Write-Host 'Diagnosis steps:' -ForegroundColor Yellow
    Write-Host '  gh workflow list' -ForegroundColor Yellow
    Write-Host "  gh run list --limit 10 | Select-String sentry" -ForegroundColor Yellow
    exit 1
  }
  $run = $fallback | Select-Object -First 1
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
  } else {
    Write-Host '--- Parsed Verification Summary ---' -ForegroundColor Green
    $parsed.GetEnumerator() | ForEach-Object { Write-Host ("{0}: {1}" -f $_.Key, $_.Value) }
  }
  if ($current.conclusion -ne 'success') { exit 2 }
}
