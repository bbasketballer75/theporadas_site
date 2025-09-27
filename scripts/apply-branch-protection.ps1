<#
apply-branch-protection.ps1

Sets branch protection rules for 'main' branch requiring checks and status checks.
Requires GITHUB_TOKEN with repo admin permissions.

Usage:
  ./scripts/apply-branch-protection.ps1 -Owner bbasketballer75 -Repo theporadas_site -Branch main
#>
param(
    [Parameter(Mandatory = $true)] [string]$Owner,
    [Parameter(Mandatory = $true)] [string]$Repo,
    [Parameter(Mandatory = $false)] [string]$Branch = 'main'
)

if (-not $env:GITHUB_TOKEN) { Write-Error 'GITHUB_TOKEN environment variable is required and must have admin:repo_hook permissions'; exit 1 }

$apiUrl = "https://api.github.com/repos/$Owner/$Repo/branches/$Branch/protection"
$body = @{
    required_status_checks        = @{ strict = $true; contexts = @( 'build', 'test', 'lint', 'ai-review' ) }
    enforce_admins                = $true
    required_pull_request_reviews = @{ dismissal_restrictions = @{}; dismissal_restrictions_teams = @(); dismissal_restrictions_users = @(); dismiss_stale_reviews = $false; require_code_owner_reviews = $false; required_approving_review_count = 0 }
    restrictions                  = $null
} | ConvertTo-Json -Depth 10

$headers = @{ Authorization = "token $env:GITHUB_TOKEN"; Accept = 'application/vnd.github.v3+json' }
try {
    $null = Invoke-RestMethod -Method PUT -Uri $apiUrl -Headers $headers -Body $body -ContentType 'application/json' -ErrorAction Stop
    Write-Output "Branch protection applied to ${Owner}/${Repo}:${Branch}"
}
catch {
    Write-Error "Failed to apply branch protection: $_"
    exit 1
}
