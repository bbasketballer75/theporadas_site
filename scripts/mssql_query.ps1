<#$
.SYNOPSIS
  Execute a SQL file or ad-hoc query against SQL Server using sqlcmd.

.EXAMPLES
  pwsh scripts/mssql_query.ps1 -Server localhost -User sa -Password 'Secret!' -File scripts/mssql_sa_connections.sql
  pwsh scripts/mssql_query.ps1 -Server localhost -User app_user -Password 'Secret!' -Query "SELECT 1;"

.PARAMETER Server
  Hostname or host,port (e.g. localhost,1433)
.PARAMETER User
  SQL Login name.
.PARAMETER Password
  Password for login (DO NOT hard-code).
.PARAMETER File
  Path to .sql file to run (mutually exclusive with -Query).
.PARAMETER Query
  Inline T-SQL string (mutually exclusive with -File).
.PARAMETER TrustServerCert
  Switch to add TrustServerCertificate=yes for local dev.
#>
param(
    [Parameter(Mandatory = $true)][string]$Server,
    [Parameter(Mandatory = $true)][string]$User,
    [Parameter(Mandatory = $true)][SecureString]$Password,
    [string]$File,
    [string]$Query,
    [switch]$TrustServerCert,
    [int]$TimeoutSeconds = 30
)

if (-not (Get-Command sqlcmd -ErrorAction SilentlyContinue)) {
    Write-Error 'sqlcmd not found in PATH (install mssql-tools).'
    exit 1
}

if ([string]::IsNullOrWhiteSpace($File) -and [string]::IsNullOrWhiteSpace($Query)) {
    Write-Error 'Specify -File or -Query.'
    exit 1
}
if ($File -and $Query) {
    Write-Error 'Use only one of -File or -Query.'
    exit 1
}

$bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($Password)
try { $plain = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr) } finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr) }

$baseArgs = @('-S', $Server, '-U', $User, '-P', $plain, '-l', $TimeoutSeconds)
if ($TrustServerCert) { $baseArgs += @('-C') }

if ($File) {
    if (-not (Test-Path $File)) { Write-Error "File not found: $File"; exit 1 }
    & sqlcmd @baseArgs -i $File
    exit $LASTEXITCODE
}
else {
    & sqlcmd @baseArgs -Q $Query
    exit $LASTEXITCODE
}
