<#!
.SYNOPSIS
  Set required Sentry GitHub Actions secrets (SENTRY_DSN, SENTRY_AUTH_TOKEN, SENTRY_ORG, SENTRY_PROJECT).

.DESCRIPTION
  Uses the GitHub CLI (`gh secret set`). If org/project slugs are omitted, attempts to derive them
  from the DSN + auth token, mirroring logic in the source maps workflow.

.PARAMETER Dsn
  The full Sentry DSN (public key + org/project numeric ids).

.PARAMETER AuthToken
  Sentry auth token (scopes: project:releases, org:read). NOT stored locally.

.PARAMETER Org
  (Optional) Organization slug. If omitted, derived via API.

.PARAMETER Project
  (Optional) Project slug. If omitted, derived via API.

.PARAMETER Verify
  If specified, does not set secrets; instead lists currently configured SENTRY_* secrets (values masked).

.EXAMPLE
  pwsh scripts/set_sentry_secrets.ps1 -Dsn $env:SENTRY_DSN -AuthToken $env:SENTRY_AUTH_TOKEN

.EXAMPLE
  pwsh scripts/set_sentry_secrets.ps1 -Verify

!#>
[CmdletBinding()] param(
    [string]$Dsn,
    [string]$AuthToken,
    [string]$Org,
    [string]$Project,
    [switch]$Verify
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Assert-Gh() { if (-not (Get-Command gh -ErrorAction SilentlyContinue)) { throw 'gh CLI not found. Install from https://github.com/cli/cli/releases' } }
Assert-Gh

# Determine repository (fallback to env var GH_REPO or current git remote)
function Get-RepoFullName() {
    if ($env:GH_REPO) { return $env:GH_REPO }
    $remote = git config --get remote.origin.url 2>$null
    if (-not $remote) { throw 'Unable to determine git remote for repository; set GH_REPO=owner/repo.' }
    if ($remote -match 'github.com[:/](.+?)(?:\.git)?$') { return $matches[1] }
    throw 'Remote URL not recognized as GitHub repository.'
}

$repoFullName = Get-RepoFullName
Write-Host "Target repository: $repoFullName" -ForegroundColor Cyan

# Verify auth context has access
try {
    gh repo view $repoFullName 1>$null
}
catch {
    throw "gh CLI cannot view repository $repoFullName. Run 'gh auth login' or check permissions."
}

if ($Verify) {
    Write-Host 'Listing existing SENTRY_* secrets (names only)...' -ForegroundColor Cyan
    $existing = gh secret list 2>$null | Where-Object { $_ -match 'SENTRY_' }
    if (-not $existing) { Write-Warning 'No SENTRY_* secrets found.'; exit 0 }
    $existing | ForEach-Object { Write-Host $_ }
    Write-Host 'Done.' -ForegroundColor Green
    return
}

if (-not $Dsn -or -not $AuthToken) {
    throw 'Dsn and AuthToken are required unless using -Verify.'
}

Write-Host 'Deriving slugs (if necessary)...' -ForegroundColor Cyan
if (-not $Org -or -not $Project) {
    if ($Dsn -match 'https://[^@]+@o([0-9]+)\.ingest\.[^/]+/([0-9]+)') {
        $numericOrgId = $matches[1]
        $numericProjectId = $matches[2]
        Write-Host "Numeric IDs -> Org: $numericOrgId Project: $numericProjectId"
        $headers = @{ Authorization = "Bearer $AuthToken" }
        if (-not $Org) {
            $orgs = Invoke-RestMethod -Headers $headers -Uri https://sentry.io/api/0/organizations/
            $matchOrg = $orgs | Where-Object { $_.id -eq $numericOrgId }
            if ($matchOrg) { $Org = $matchOrg.slug } else { Write-Warning 'Could not map numeric org id to slug.' }
        }
        if (-not $Project -and $Org) {
            $projects = Invoke-RestMethod -Headers $headers -Uri ("https://sentry.io/api/0/organizations/{0}/projects/" -f $Org)
            $matchProj = $projects | Where-Object { $_.id -eq $numericProjectId }
            if ($matchProj) { $Project = $matchProj.slug } else { Write-Warning 'Could not map numeric project id to slug.' }
        }
    }
    else {
        Write-Warning 'DSN pattern not recognized; skipping numeric id derivation.'
    }
}

if (-not $Org -or -not $Project) {
    Write-Warning 'Org or Project slug still missing. You can re-run providing -Org and -Project explicitly.'
}

Write-Host 'Setting secrets...' -ForegroundColor Cyan

function Set-Secret($name, $value) {
    if (-not $value) { Write-Warning "Skipping $name (no value)"; return }
    $proc = gh secret set $name --body "$value" 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Error ("Failed to set secret {0}: {1}" -f $name, $proc)
        throw ("Secret {0} error" -f $name)
    }
    Write-Host "Updated secret $name" -ForegroundColor Green
}

Set-Secret 'SENTRY_DSN' $Dsn
Set-Secret 'SENTRY_AUTH_TOKEN' $AuthToken
Set-Secret 'SENTRY_ORG' $Org
Set-Secret 'SENTRY_PROJECT' $Project

Write-Host 'Done.' -ForegroundColor Green
Write-Host 'Verify with: gh secret list' -ForegroundColor Yellow
