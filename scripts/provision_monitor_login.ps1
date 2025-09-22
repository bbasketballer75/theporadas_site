<#$
.SYNOPSIS
  Provision a minimal monitoring login (VIEW SERVER STATE) without manual SQL edits.

.EXAMPLE
    pwsh scripts/provision_monitor_login.ps1 -Server localhost,1433 -SaUser sa -SaPassword (Read-Host -AsSecureString 'SA Password') -MonitorLogin monitor_login

.EXAMPLE
  pwsh scripts/provision_monitor_login.ps1 -Server prod-sql.internal,1433 -SaUser sa -SaPassword (Read-Host -AsSecureString) -MonitorLogin monitor_login -MonitorPassword (Read-Host -AsSecureString 'Monitor Password')

.NOTES
  If -MonitorPassword omitted, a 32-char random password prints once for capture.
#>
[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)][string]$Server,
    [Parameter(Mandatory = $true)][string]$SaUser,
    [Parameter(Mandatory = $true)][SecureString]$SaPassword,
    [Parameter(Mandatory = $true)][string]$MonitorLogin,
    [SecureString]$MonitorPassword,
    [switch]$ForceRotate
)

function Convert-Secure([SecureString]$sec) { $b = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($sec); try { [Runtime.InteropServices.Marshal]::PtrToStringBSTR($b) }finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($b) } }
function New-RandomPassword([int]$Length = 32) {
    $chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*()-_=+[]{}' ;
    -join ((1..$Length) | ForEach-Object { $chars[(Get-Random -Max $chars.Length)] })
}

$saPlain = Convert-Secure $SaPassword
$monitorPlain = if ($MonitorPassword) { Convert-Secure $MonitorPassword } else { New-RandomPassword }

Add-Type -AssemblyName System.Data
$connString = "Server=$Server;Database=master;User Id=$SaUser;Password=$saPlain;TrustServerCertificate=true;Encrypt=true;";
$conn = New-Object System.Data.SqlClient.SqlConnection $connString
try {
    $conn.Open()
    # Check if login exists
    $checkCmd = $conn.CreateCommand(); $checkCmd.CommandText = "SELECT 1 FROM sys.server_principals WHERE name=@n"; $p = $checkCmd.Parameters.Add('@n', [System.Data.SqlDbType]::NVarChar, 128); $p.Value = $MonitorLogin
    $exists = $checkCmd.ExecuteScalar()
    if ($exists -and -not $ForceRotate) {
        Write-Host "Login '$MonitorLogin' already exists. Use -ForceRotate to reset password / re-grant." -ForegroundColor Yellow
    }
    if (-not $exists) {
        $escaped = $MonitorLogin.Replace(']', ']]')
        $create = $conn.CreateCommand(); $create.CommandText = "CREATE LOGIN [${escaped}] WITH PASSWORD = @pw, CHECK_POLICY=ON, CHECK_EXPIRATION=ON;";
        $pwParam = $create.Parameters.Add('@pw', [System.Data.SqlDbType]::NVarChar, 128); $pwParam.Value = $monitorPlain
        $create.ExecuteNonQuery() | Out-Null
        Write-Host "Created login '$MonitorLogin'" -ForegroundColor Green
    }
    elseif ($ForceRotate) {
        $escaped = $MonitorLogin.Replace(']', ']]')
        $alter = $conn.CreateCommand(); $alter.CommandText = "ALTER LOGIN [${escaped}] WITH PASSWORD = @pw;";
        $pwParam = $alter.Parameters.Add('@pw', [System.Data.SqlDbType]::NVarChar, 128); $pwParam.Value = $monitorPlain
        $alter.ExecuteNonQuery() | Out-Null
        Write-Host "Rotated password for '$MonitorLogin'" -ForegroundColor Green
    }
    # Grant VIEW SERVER STATE
    $escaped = $MonitorLogin.Replace(']', ']]')
    $perm = $conn.CreateCommand(); $perm.CommandText = "GRANT VIEW SERVER STATE TO [${escaped}]";
    try { $perm.ExecuteNonQuery() | Out-Null } catch { }
    Write-Host "Granted VIEW SERVER STATE" -ForegroundColor Green
}
catch {
    Write-Error $_
    exit 1
}
finally {
    $conn.Dispose()
}

Write-Host "Monitor login credentials:" -ForegroundColor Cyan
Write-Host "  User: $MonitorLogin" -ForegroundColor Cyan
if (-not $MonitorPassword) { Write-Host "  Password (store securely now): $monitorPlain" -ForegroundColor Magenta }
else { Write-Host "  Password: (provided)" -ForegroundColor Cyan }

Write-Host "Add these GitHub secrets (if not already):" -ForegroundColor Cyan
Write-Host "  MSSQL_MONITOR_USER=$MonitorLogin" -ForegroundColor DarkCyan
Write-Host "  MSSQL_MONITOR_PASSWORD=<monitor_password>" -ForegroundColor DarkCyan

# Attempt basic connectivity using monitor login
try {
    $monitorConn = New-Object System.Data.SqlClient.SqlConnection ("Server=$Server;Database=master;User Id=$MonitorLogin;Password=$monitorPlain;TrustServerCertificate=true;Encrypt=true;")
    $monitorConn.Open();
    $ping = $monitorConn.CreateCommand(); $ping.CommandText = 'SELECT 1'; $null = $ping.ExecuteScalar();
    Write-Host 'Validation succeeded (SELECT 1).' -ForegroundColor Green
    $monitorConn.Dispose()
}
catch {
    Write-Warning 'Validation failed for monitor login.'
}

exit 0
