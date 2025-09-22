[CmdletBinding()]
param(
    [Parameter(Mandatory)][string]$RepoOwner,
    [Parameter(Mandatory)][string]$RepoName,
    [Parameter(Mandatory)][string]$Token,
    [string]$WorkflowFile = 'mssql-security.yml'
)
$ErrorActionPreference = 'Stop'
$headers = @{ Authorization = "Bearer $Token"; Accept = 'application/vnd.github+json' }
$body = @{ ref = 'main' } | ConvertTo-Json
$uri = "https://api.github.com/repos/$RepoOwner/$RepoName/actions/workflows/$WorkflowFile/dispatches"
Write-Host "[+] Triggering workflow $WorkflowFile on main" -ForegroundColor Cyan
try {
    Invoke-RestMethod -Method Post -Uri $uri -Headers $headers -Body $body
    Write-Host '[+] Dispatch request sent. Check Actions tab.' -ForegroundColor Green
}
catch {
    Write-Error "Workflow dispatch failed: $_"
    exit 1
}
