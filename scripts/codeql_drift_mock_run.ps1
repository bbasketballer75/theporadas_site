$ErrorActionPreference = 'Stop'
$env:GITHUB_REPOSITORY = 'owner/repo'
./scripts/codeql_drift_delta.ps1 -MockBaseline -BaselineCounts '{"total":5,"critical":0,"high":1,"medium":2,"low":2}' -CurrentCounts '{"total":7,"critical":0,"high":2,"medium":3,"low":2}'
