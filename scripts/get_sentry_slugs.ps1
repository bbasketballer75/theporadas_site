<#!
.SYNOPSIS
  Resolve Sentry organization and project slugs using an auth token.

.DESCRIPTION
  Given a Sentry auth token (Bearer) and optionally a DSN, this script:
    1. Lists orgs and matches numeric org id (if extracted from DSN) OR returns all orgs.
    2. Lists projects for a chosen org and matches numeric project id from DSN if present.
  Outputs detected slugs in a simple object. Falls back gracefully with guidance when not found.

.PARAMETER Token
  Sentry auth token (sntryu_...). If omitted, uses $env:SENTRY_AUTH_TOKEN.

.PARAMETER Dsn
  Optional DSN to extract numeric org and project ids.

.PARAMETER OrgId
  Numeric org id (overrides DSN-derived id).

.PARAMETER ProjectId
  Numeric project id (overrides DSN-derived id).

.EXAMPLE
  pwsh scripts/get_sentry_slugs.ps1 -Token (Get-Content .token.txt) -Dsn 'https://abc@o123.ingest.us.sentry.io/456'

.EXAMPLE
  pwsh scripts/get_sentry_slugs.ps1 -OrgId 4509754165755904 -ProjectId 4509754372653056

!#>
[CmdletBinding()] param(
  [string]$Token,
  [string]$Dsn,
  [string]$OrgId,
  [string]$ProjectId
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

if (-not $Token) { $Token = $env:SENTRY_AUTH_TOKEN }
if (-not $Token) { throw 'Auth token not provided. Use -Token or set SENTRY_AUTH_TOKEN.' }

function Get-SentryIdsFromDsn([string]$dsn) {
  # DSN pattern: https://<public>@oORGID.ingest.<region>.sentry.io/PROJECTID
  if ($dsn -match 'https?://[^@]+@o([0-9]+)\.ingest\.[^/]+/([0-9]+)') {
    return [PSCustomObject]@{ OrgId = $matches[1]; ProjectId = $matches[2] }
  }
  return $null
}

if ($Dsn) {
  $parsed = Get-SentryIdsFromDsn $Dsn
  if ($parsed) {
    if (-not $OrgId) { $OrgId = $parsed.OrgId }
    if (-not $ProjectId) { $ProjectId = $parsed.ProjectId }
  }
  else {
    Write-Warning 'Could not parse numeric ids from provided DSN.'
  }
}

$headers = @{ Authorization = "Bearer $Token" }

Write-Host 'Fetching organizations...' -ForegroundColor Cyan
$orgs = Invoke-RestMethod -Headers $headers -Uri 'https://sentry.io/api/0/organizations/'
if (-not $orgs) { throw 'No organizations returned. Check token scopes.' }

$orgMatch = $null
if ($OrgId) {
  $orgMatch = $orgs | Where-Object { $_.id -eq $OrgId }
  if (-not $orgMatch) { Write-Warning "Org id $OrgId not found among returned orgs." }
}
if (-not $orgMatch) { $orgMatch = $orgs | Select-Object -First 1; Write-Warning 'Defaulting to first organization.' }

Write-Host ("Selected Org: {0} (id={1})" -f $orgMatch.slug, $orgMatch.id) -ForegroundColor Green

Write-Host 'Fetching projects...' -ForegroundColor Cyan
$projects = Invoke-RestMethod -Headers $headers -Uri ("https://sentry.io/api/0/organizations/{0}/projects/" -f $orgMatch.slug)
if (-not $projects) { throw 'No projects returned. Ensure token has org:read.' }

$projMatch = $null
if ($ProjectId) {
  $projMatch = $projects | Where-Object { $_.id -eq $ProjectId }
  if (-not $projMatch) { Write-Warning "Project id $ProjectId not found in org $($orgMatch.slug)." }
}
if (-not $projMatch) { $projMatch = $projects | Select-Object -First 1; Write-Warning 'Defaulting to first project.' }

Write-Host ("Selected Project: {0} (id={1})" -f $projMatch.slug, $projMatch.id) -ForegroundColor Green

$result = [PSCustomObject]@{
  OrgSlug     = $orgMatch.slug
  OrgId       = $orgMatch.id
  ProjectSlug = $projMatch.slug
  ProjectId   = $projMatch.id
}

$result | Format-List

Write-Host 'Use these for GitHub Secrets: SENTRY_ORG, SENTRY_PROJECT.' -ForegroundColor Yellow
