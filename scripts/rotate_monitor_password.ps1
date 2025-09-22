[CmdletBinding(SupportsShouldProcess = $true)]
param(
    [string]$Server = 'localhost,14333',
    [string]$SaUser = 'sa',
    [SecureString]$SaPassword,
    [string]$SaPasswordPlain,
    [Parameter(Mandatory)][string]$MonitorLogin,
    [int]$PasswordLength = 32
)
function Convert-Secure([SecureString]$sec) { $b = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($sec); try { [Runtime.InteropServices.Marshal]::PtrToStringBSTR($b) }finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($b) } }
if (Test-Path "$PSScriptRoot/password_utils.ps1") { . "$PSScriptRoot/password_utils.ps1" }
function New-RandomPassword([int]$Length = 32) { New-StrongPassword -Length $Length }
$saPlain = if ($SaPassword) { Convert-Secure $SaPassword } elseif ($SaPasswordPlain) { $SaPasswordPlain } else { Write-Error 'Provide -SaPassword (SecureString) or -SaPasswordPlain.'; exit 1 }
$newPlain = New-RandomPassword -Length $PasswordLength
Add-Type -AssemblyName System.Data
$conn = New-Object System.Data.SqlClient.SqlConnection ("Server=$Server;Database=master;User Id=$SaUser;Password=$saPlain;TrustServerCertificate=true;Encrypt=true;")
try { $conn.Open() } catch { Write-Error ("Cannot connect as {0}: {1}" -f $SaUser, $_); exit 1 }
$escaped = $MonitorLogin.Replace(']', ']]')
$pwdEsc = $newPlain.Replace("'", "''")
$existsCmd = $conn.CreateCommand(); $existsCmd.CommandText = 'SELECT 1 FROM sys.server_principals WHERE name=@n'; $p = $existsCmd.Parameters.Add('@n', [System.Data.SqlDbType]::NVarChar, 128); $p.Value = $MonitorLogin; $exists = $existsCmd.ExecuteScalar()
if (-not $exists) { Write-Error "Login $MonitorLogin does not exist."; exit 2 }
if ($PSCmdlet.ShouldProcess($MonitorLogin, 'Rotate password')) {
    $cmd = $conn.CreateCommand(); $cmd.CommandText = "ALTER LOGIN [$escaped] WITH PASSWORD = N'$pwdEsc';"
    try { $cmd.ExecuteNonQuery() | Out-Null; Write-Host '[+] Rotated monitor login password' -ForegroundColor Cyan }
    catch { Write-Error ("Rotation failed: {0}" -f $_); exit 3 }
}
$conn.Dispose()
Write-Host "New Monitor Password: $newPlain" -ForegroundColor Yellow
Write-Host 'Update GitHub secret MSSQL_MONITOR_PASSWORD with this value.' -ForegroundColor Green
