<#
check-vercel-integration.ps1

Checks whether Vercel project(s) are linked to this GitHub repository using Vercel API and prints guidance.
Requires VERCEL_TOKEN (recommended) and GITHUB_REPO (optional; defaults to repo root package.json name).
#>
param(
    [string]$VercelToken = $env:VERCEL_TOKEN,
    [string]$GithubRepo = $env:GITHUB_REPOSITORY
)

if (-not $VercelToken) {
    Write-Output "VERCEL_TOKEN not set; cannot query Vercel API. If you prefer deploy hooks, set VERCEL_DEPLOY_HOOK as a repo secret instead."
    exit 0
}

$headers = @{ Authorization = "Bearer $VercelToken" }
try {
    $projects = Invoke-RestMethod -Uri 'https://api.vercel.com/v1/projects' -Headers $headers -Method GET -ErrorAction Stop
}
catch {
    Write-Error "Failed to query Vercel API: $_"; exit 2
}

Write-Output "Found $($projects.projects.Count) project(s) in Vercel account associated with token."
if ($GithubRepo) {
    foreach ($p in $projects.projects) {
        if ($p.link && $p.link.repo) {
            if ($p.link.repo.full_name -eq $GithubRepo) { Write-Output "Vercel project '$($p.name)' is linked to repo $GithubRepo"; exit 0 }
        }
    }
    Write-Output "No Vercel project found linked to $GithubRepo. Consider installing the Vercel GitHub App and linking the repository in the Vercel dashboard. See .github/VERCEL_INTEGRATION.md"
}
else { Write-Output "No GITHUB_REPOSITORY passed; run this script from CI or set GITHUB_REPOSITORY env var to check linking." }
