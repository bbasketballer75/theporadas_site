<#$
.SYNOPSIS
  Archives recent failed SQL Server logins (error 18456) to artifacts folder (JSON + CSV).

.DESCRIPTION
  Uses default trace query (scripts/mssql_failed_logins.sql) or Extended Events session if files present.
  Priority:
    1. Extended Events files matching failed_login_audit*.xel
    2. Fallback to default trace query.

.EXAMPLE
  pwsh scripts/archive_failed_logins.ps1 -Server localhost,1433 -User sa -Password (Read-Host -AsSecureString)
#>
[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)][string]$Server,
    [Parameter(Mandatory = $true)][string]$User,
    [Parameter(Mandatory = $true)][SecureString]$Password,
    [string]$OutputDir = 'artifacts/failed-logins',
    [int]$MaxRows = 500
)

function Convert-Secure([SecureString]$sec) { $b = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($sec); try { [Runtime.InteropServices.Marshal]::PtrToStringBSTR($b) }finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($b) } }
$pw = Convert-Secure $Password

if (-not (Get-Command sqlcmd -ErrorAction SilentlyContinue)) { Write-Error 'sqlcmd not found'; exit 1 }
New-Item -ItemType Directory -Force -Path $OutputDir | Out-Null
$timestamp = (Get-Date -Format 'yyyyMMdd_HHmmss')

$xeFiles = Get-ChildItem -File -Filter 'failed_login_audit*.xel' -ErrorAction SilentlyContinue
$result = @()
if ($xeFiles) {
    Write-Host 'Found Extended Events files; extracting events...' -ForegroundColor Cyan
    $query = "SELECT TOP($MaxRows) CAST(event_data AS XML) AS XD FROM sys.fn_xe_file_target_read_file('failed_login_audit*.xel', NULL, NULL, NULL) ORDER BY 1 DESC";
    $rawXml = & sqlcmd -S $Server -U $User -P $pw -h -1 -W -Q $query 2>$null
    foreach ($line in $rawXml) {
        if (-not $line.Trim()) { continue }
        try {
            $xml = [xml]$line
            $evt = $xml.event
            $rec = [ordered]@{}
            $rec.Timestamp = $evt.timestamp
            foreach ($dataNode in $evt.data) { $rec[$dataNode.name] = $dataNode.value }
            foreach ($act in $evt.action) { $rec[$act.name] = $act.'#text' }
            $result += [pscustomobject]$rec
        }
        catch { }
    }
}
else {
    Write-Host 'No Extended Events files; falling back to default trace query.' -ForegroundColor Yellow
    $traceFile = 'scripts/mssql_failed_logins.sql'
    if (-not (Test-Path $traceFile)) { Write-Error 'Trace query file missing.'; exit 1 }
    $csvTemp = New-TemporaryFile
    & sqlcmd -S $Server -U $User -P $pw -s '|' -W -h -1 -i $traceFile | Select-Object -First $MaxRows | Set-Content $csvTemp.FullName
    $result = Get-Content $csvTemp.FullName | Where-Object { $_ } | ForEach-Object {
        $parts = $_ -split '\|'
        [pscustomobject]@{ RawLine = $_; Parts = $parts }
    }
}

$jsonPath = Join-Path $OutputDir "failed_logins_$timestamp.json"
$csvPath = Join-Path $OutputDir "failed_logins_$timestamp.csv"
$result | ConvertTo-Json -Depth 6 | Set-Content -Encoding UTF8 $jsonPath
$result | Export-Csv -NoTypeInformation -Encoding UTF8 $csvPath

Write-Host "Archived $($result.Count) records to:" -ForegroundColor Green
Write-Host " JSON: $jsonPath" -ForegroundColor Green
Write-Host " CSV : $csvPath" -ForegroundColor Green
exit 0
