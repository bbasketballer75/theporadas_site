<#!
.SYNOPSIS
  Tear down and recreate a local SQL Server container, then provision a monitoring login (and optional app user).

.DESCRIPTION
  This script is a destructive helper for local development when the SA password is lost or you want a clean slate.
  It will (optionally) remove the existing container (and volume), start a fresh container with a new SA password,
  wait for readiness, create a monitoring login with VIEW SERVER STATE, and optionally create an application login/database.

.PARAMETER ContainerName
  Name of the SQL Server container to recreate.

.PARAMETER Image
  SQL Server container image tag.

.PARAMETER SaPassword
  SecureString for the new SA password (mandatory).

.PARAMETER MonitorLogin
  Name of monitor login to create.

.PARAMETER MonitorPassword
  Optional SecureString for monitor login password (auto-generated if omitted).

.PARAMETER CreateAppUser
  Switch to also create an app user/login.

.PARAMETER AppUser
  Name of the application login (when -CreateAppUser specified).

.PARAMETER AppUserPassword
  SecureString for application login password (auto-generated if omitted and -CreateAppUser supplied).

.PARAMETER AppDatabase
  Target database for the app user (created if it does not exist and not 'master').

.PARAMETER RemoveVolume
  Also remove associated named volume (provide -VolumeName) before recreating.

.PARAMETER VolumeName
  Named volume to remove when -RemoveVolume is specified.

.PARAMETER Port
  Host port to expose container's 1433.

.PARAMETER ReadyTimeoutSeconds
  Timeout waiting for SQL Engine to accept logins.

.EXAMPLE
  pwsh ./scripts/reset_mssql_and_provision_monitor.ps1 -ContainerName local-mssql `
    -SaPassword (Read-Host -AsSecureString 'New SA Password') -MonitorLogin monitor_login -WhatIf

  Shows what would happen without making changes.

.EXAMPLE
  pwsh ./scripts/reset_mssql_and_provision_monitor.ps1 -ContainerName local-mssql `
    -SaPassword (Read-Host -AsSecureString 'New SA Password') -MonitorLogin monitor_login -CreateAppUser `
    -AppUser app_user -AppDatabase appdb

.NOTES
  Destructive: existing container (and optionally volume) is removed. Use -WhatIf first.

#>
[CmdletBinding(SupportsShouldProcess = $true, ConfirmImpact = 'High')]
param(
    [string]$ContainerName = 'local-mssql',
    [string]$Image = 'mcr.microsoft.com/mssql/server:2022-latest',
    [Parameter(Mandatory = $true)][SecureString]$SaPassword,
    [Parameter(Mandatory = $true)][string]$MonitorLogin,
    [SecureString]$MonitorPassword,
    [switch]$CreateAppUser,
    [string]$AppUser = 'app_user',
    [SecureString]$AppUserPassword,
    [string]$AppDatabase = 'master',
    [switch]$RemoveVolume,
    [string]$VolumeName = '',
    [int]$Port = 1433,
    [int]$ReadyTimeoutSeconds = 60,
    [switch]$CheckHealth,
    [int]$HealthTimeoutSeconds = 90,
    [switch]$RotateMonitorPassword
)

function Write-Step($msg) { Write-Host "[+] $msg" -ForegroundColor Cyan }
function Fail($msg) { Write-Error $msg; exit 1 }

$InWhatIf = $WhatIfPreference -eq $true
if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    if ($InWhatIf) { Write-Verbose 'Docker not found; continuing due to -WhatIf.' } else { Fail 'docker CLI not found in PATH.' }
}

function Convert-Secure([SecureString]$sec) { $b = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($sec); try { [Runtime.InteropServices.Marshal]::PtrToStringBSTR($b) }finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($b) } }
if (Test-Path "$PSScriptRoot/password_utils.ps1") { . "$PSScriptRoot/password_utils.ps1" }
function New-RandomPassword([int]$Length = 32) { New-StrongPassword -Length $Length }

$SaPasswordPlain = Convert-Secure $SaPassword
$MonitorPasswordPlain = if ($MonitorPassword) { Convert-Secure $MonitorPassword } else { New-RandomPassword }
$AppUserPasswordPlain = if ($AppUserPassword) { Convert-Secure $AppUserPassword } else { if ($CreateAppUser) { New-RandomPassword } }

if ($PSCmdlet.ShouldProcess("container $ContainerName", "Stop & remove if exists")) {
    Write-Step "Stopping existing container $ContainerName (if present)"
    docker stop $ContainerName 2>$null | Out-Null
    docker rm $ContainerName 2>$null | Out-Null
}

if ($RemoveVolume -and $VolumeName) {
    if ($PSCmdlet.ShouldProcess("volume $VolumeName", "Remove")) {
        Write-Step "Removing volume $VolumeName"
        docker volume rm $VolumeName 2>$null | Out-Null
    }
}

$null = if ($PSCmdlet.ShouldProcess("container $ContainerName", "Create from image $Image")) {
    Write-Step "Starting fresh container $ContainerName on port $Port"
    if (-not $Port -and $Port -ne 0) { Fail 'Port variable is empty.' }
    if ($Port -isnot [int]) { try { $Port = [int]$Port } catch { Fail "Port value '$Port' not convertible to int." } }
    if ($Port -lt 1 -or $Port -gt 65535) { Fail "Port $Port out of valid range." }
    Write-Step "Docker run debug: using port mapping ${Port}:1433"
    $env:ACCEPT_EULA = 'Y'
    $env:MSSQL_SA_PASSWORD = $SaPasswordPlain
    docker run -d --name $ContainerName -e ACCEPT_EULA=Y -e MSSQL_SA_PASSWORD="$SaPasswordPlain" -p ${Port}:1433 $Image | Out-Null
}

# (Skipping container existence evaluation in WhatIf early exit path)

if ($InWhatIf) {
    Write-Step 'WhatIf mode: Skipping readiness/health/provisioning.'
    Write-Host "--- WHATIF SUMMARY ---" -ForegroundColor Green
    Write-Host "Would (re)create container: $ContainerName from $Image on port $Port" -ForegroundColor Cyan
    if ($RemoveVolume -and $VolumeName) { Write-Host "Would remove volume: $VolumeName" -ForegroundColor Cyan }
    Write-Host "Would create monitor login: $MonitorLogin" -ForegroundColor Cyan
    if ($CreateAppUser) { Write-Host "Would create app user: $AppUser in DB $AppDatabase" -ForegroundColor Cyan }
    Write-Host 'Run without -WhatIf to execute.' -ForegroundColor Yellow
    exit 0
}

Write-Step 'Waiting for SQL Server readiness'
$ready = $false; $start = Get-Date
while ((Get-Date) - $start -lt [TimeSpan]::FromSeconds($ReadyTimeoutSeconds)) {
    try { $logs = docker logs $ContainerName 2>$null } catch { $logs = '' }
    if ($logs -match 'SQL Server is now ready for client connections') { $ready = $true; break }
    Start-Sleep -Seconds 2
}
if (-not $ready) { Fail 'Timed out waiting for SQL Server to become ready.' }

if ($CheckHealth) {
    $healthSupported = $false
    try {
        $inspectJson = docker inspect $ContainerName 2>$null | ConvertFrom-Json
        if ($inspectJson -and $inspectJson[0].State.PSObject.Properties.Name -contains 'Health' -and $inspectJson[0].State.Health) {
            $healthSupported = $true
        }
    }
    catch { }

    if (-not $healthSupported) {
        Write-Step 'No container HEALTHCHECK defined; starting internal connectivity probe.'
        $probeStart = Get-Date
        $probeSucceeded = $false
        while ((Get-Date) - $probeStart -lt [TimeSpan]::FromSeconds($HealthTimeoutSeconds)) {
            try {
                $tcpClient = New-Object System.Net.Sockets.TcpClient
                $async = $tcpClient.BeginConnect('localhost', $Port, $null, $null)
                if ($async.AsyncWaitHandle.WaitOne(3000) -and $tcpClient.Connected) {
                    $tcpClient.Close(); $probeSucceeded = $true; break
                }
                $tcpClient.Close()
            }
            catch { }
            Start-Sleep -Seconds 2
        }
        if (-not $probeSucceeded) { Fail 'Connectivity probe failed within health timeout.' }
        else { Write-Step 'Connectivity probe succeeded.' }
    }
    else {
        Write-Step 'Waiting for container health status=healthy'
        $healthStart = Get-Date
        $status = $null
        while ((Get-Date) - $healthStart -lt [TimeSpan]::FromSeconds($HealthTimeoutSeconds)) {
            try {
                $status = docker inspect -f '{{ .State.Health.Status }}' $ContainerName 2>$null
                if ($status -eq 'healthy') { Write-Step 'Container reported healthy'; break }
                if ($status -eq 'unhealthy') { Fail 'Container health status=unhealthy' }
            }
            catch { }
            Start-Sleep -Seconds 2
        }
        if ($status -ne 'healthy') { Fail 'Timed out waiting for healthy status.' }
    }
}

Add-Type -AssemblyName System.Data
$server = "localhost,$Port"
$saConnStr = "Server=$server;Database=master;User Id=sa;Password=$SaPasswordPlain;TrustServerCertificate=true;Encrypt=true;"
$conn = New-Object System.Data.SqlClient.SqlConnection $saConnStr
$saConnectStart = Get-Date
$saConnected = $false
while ((Get-Date) - $saConnectStart -lt [TimeSpan]::FromSeconds(30)) {
    try { $conn.Open(); $saConnected = $true; break } catch { Start-Sleep -Seconds 2 }
}
if (-not $saConnected) { Fail 'Cannot connect as sa after retries.' }

function Add-OrRotateLogin {
    param(
        [Parameter(Mandatory)][string]$Login,
        [Parameter(Mandatory)][SecureString]$Password,
        [switch]$Rotate
    )
    $PasswordPlain = Convert-Secure $Password
    $escaped = $Login.Replace(']', ']]')
    $check = $conn.CreateCommand(); $check.CommandText = 'SELECT 1 FROM sys.server_principals WHERE name=@n'; $p = $check.Parameters.Add('@n', [System.Data.SqlDbType]::NVarChar, 128); $p.Value = $Login
    $exists = $check.ExecuteScalar()
    if (-not $exists) {
        $pwdEsc = $PasswordPlain.Replace("'", "''")
        $cmd = $conn.CreateCommand(); $cmd.CommandText = "CREATE LOGIN [$escaped] WITH PASSWORD = N'$pwdEsc', CHECK_POLICY=ON, CHECK_EXPIRATION=ON;"
        try { $cmd.ExecuteNonQuery() | Out-Null; Write-Step "Created login $Login" }
        catch { Fail ("Failed to create login {0}: {1}" -f $Login, $_) }
    }
    elseif ($Rotate) {
        $pwdEsc = $PasswordPlain.Replace("'", "''")
        $cmd = $conn.CreateCommand(); $cmd.CommandText = "ALTER LOGIN [$escaped] WITH PASSWORD = N'$pwdEsc';"
        try { $cmd.ExecuteNonQuery() | Out-Null; Write-Step "Rotated password for $Login" } catch { Fail ("Failed to rotate password for {0}: {1}" -f $Login, $_) }
    }
}

# Monitor password (create or rotate)
if ($RotateMonitorPassword) {
    Add-OrRotateLogin -Login $MonitorLogin -Password (ConvertTo-SecureString $MonitorPasswordPlain -AsPlainText -Force) -Rotate
}
else {
    Add-OrRotateLogin -Login $MonitorLogin -Password (ConvertTo-SecureString $MonitorPasswordPlain -AsPlainText -Force)
}

# Grant VIEW SERVER STATE
$escapedMon = $MonitorLogin.Replace(']', ']]')
$perm = $conn.CreateCommand(); $perm.CommandText = "GRANT VIEW SERVER STATE TO [$escapedMon]";
try { $perm.ExecuteNonQuery() | Out-Null } catch { }
Write-Step "Granted VIEW SERVER STATE to $MonitorLogin"

if ($CreateAppUser) {
    if (-not $AppUserPasswordPlain) { Fail '-CreateAppUser specified but -AppUserPasswordPlain missing.' }
    Add-OrRotateLogin -Login $AppUser -Password (ConvertTo-SecureString $AppUserPasswordPlain -AsPlainText -Force)
    if ($AppDatabase -and $AppDatabase -ne 'master') {
        $dbCheck = $conn.CreateCommand(); $dbCheck.CommandText = 'IF DB_ID(@d) IS NULL BEGIN DECLARE @sql nvarchar(4000)=N''CREATE DATABASE ''+QUOTENAME(@d); EXEC (@sql); END'; $pd = $dbCheck.Parameters.Add('@d', [System.Data.SqlDbType]::NVarChar, 128); $pd.Value = $AppDatabase; $dbCheck.ExecuteNonQuery() | Out-Null
    }
    $escapedApp = $AppUser.Replace(']', ']]')
    $userCmd = $conn.CreateCommand(); $userCmd.CommandText = "USE [$AppDatabase]; IF NOT EXISTS (SELECT 1 FROM sys.database_principals WHERE name=@u) BEGIN CREATE USER [$escapedApp] FOR LOGIN [$escapedApp] WITH DEFAULT_SCHEMA=dbo; END"; $pu = $userCmd.Parameters.Add('@u', [System.Data.SqlDbType]::NVarChar, 128); $pu.Value = $AppUser; $userCmd.ExecuteNonQuery() | Out-Null
    foreach ($role in 'db_datareader', 'db_datawriter') {
        $roleCmd = $conn.CreateCommand(); $roleCmd.CommandText = "USE [$AppDatabase]; EXEC sp_addrolemember N'$role', N'$escapedApp';"; try { $roleCmd.ExecuteNonQuery() | Out-Null } catch { }
    }
    Write-Step "Provisioned app user $AppUser in $AppDatabase with reader/writer roles"
}

# Validate monitor login
try {
    $monConn = New-Object System.Data.SqlClient.SqlConnection ("Server=$server;Database=master;User Id=$MonitorLogin;Password=$MonitorPasswordPlain;TrustServerCertificate=true;Encrypt=true;")
    $monConn.Open(); $cmd = $monConn.CreateCommand(); $cmd.CommandText = 'SELECT 1'; $null = $cmd.ExecuteScalar(); $monConn.Dispose(); Write-Step 'Monitor login validation succeeded'
}
catch { Write-Warning 'Monitor login validation failed.' }

$conn.Dispose()

Write-Host "--- OUTPUT SUMMARY ---" -ForegroundColor Green
Write-Host "Monitor Login: $MonitorLogin" -ForegroundColor Green
Write-Host "Monitor Password: $MonitorPasswordPlain" -ForegroundColor Yellow
if ($CreateAppUser) {
    Write-Host "App User: $AppUser" -ForegroundColor Green
    Write-Host "App User Password: $AppUserPasswordPlain" -ForegroundColor Yellow
    Write-Host "App Database: $AppDatabase" -ForegroundColor Green
}
Write-Host "GitHub Secrets to set:" -ForegroundColor Cyan
Write-Host "  MSSQL_MONITOR_USER=$MonitorLogin" -ForegroundColor Cyan
Write-Host "  MSSQL_MONITOR_PASSWORD=<value above>" -ForegroundColor Cyan
Write-Host "  MSSQL_SERVER=localhost,$Port" -ForegroundColor Cyan
if ($CreateAppUser) { Write-Host "  (Application) DB_USER=$AppUser / DB_PASSWORD=<app password> / DB_NAME=$AppDatabase" -ForegroundColor Cyan }

Write-Step 'Completed reset + provisioning.'
exit 0
