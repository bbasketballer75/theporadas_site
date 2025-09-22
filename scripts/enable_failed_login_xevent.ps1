<#$
.SYNOPSIS
  Creates (or recreates) and starts the failed login Extended Events session.

.EXAMPLE
  pwsh scripts/enable_failed_login_xevent.ps1 -Server localhost,1433 -SaUser sa -SaPassword (Read-Host -AsSecureString)
#>
[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)][string]$Server,
    [Parameter(Mandatory = $true)][string]$SaUser,
    [Parameter(Mandatory = $true)][SecureString]$SaPassword,
    [string]$SessionFile = 'scripts/mssql_failed_logins_xevent_create.sql'
)

if (-not (Test-Path $SessionFile)) { Write-Error "Session file not found: $SessionFile"; exit 1 }
if (-not (Get-Command sqlcmd -ErrorAction SilentlyContinue)) { Write-Error 'sqlcmd not found'; exit 1 }

function Convert-Secure([SecureString]$sec) { $b = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($sec); try { [Runtime.InteropServices.Marshal]::PtrToStringBSTR($b) }finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($b) } }
$pw = Convert-Secure $SaPassword

Write-Host "Applying Extended Events session from $SessionFile ..." -ForegroundColor Cyan
& sqlcmd -S $Server -U $SaUser -P $pw -b -i $SessionFile
if ($LASTEXITCODE -ne 0) { Write-Error 'Failed to apply session.'; exit $LASTEXITCODE }
Write-Host 'Extended Events session created/started successfully.' -ForegroundColor Green
exit 0
