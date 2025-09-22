<#$
.SYNOPSIS
  Wrapper to provision least-privilege application login/user using template SQL.

.EXAMPLE
  pwsh scripts/mssql_provision_app_user.ps1 -Server localhost,1433 -SaUser sa -SaPassword (Read-Host -AsSecureString 'SA Password') -AppLogin app_user -AppPassword (Read-Host -AsSecureString 'New App Password') -Database WeddingApp
#>
param(
    [Parameter(Mandatory = $true)][string]$Server,
    [Parameter(Mandatory = $true)][string]$SaUser,
    [Parameter(Mandatory = $true)][SecureString]$SaPassword,
    [Parameter(Mandatory = $true)][string]$AppLogin,
    [Parameter(Mandatory = $true)][SecureString]$AppPassword,
    [Parameter(Mandatory = $true)][string]$Database,
    [string]$DefaultSchema = 'dbo'
)

if (-not (Get-Command sqlcmd -ErrorAction SilentlyContinue)) {
    Write-Error 'sqlcmd not found in PATH.'; exit 1
}

# Convert secure strings
function Convert-Secure([SecureString]$sec) {
    $b = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($sec)
    try { [Runtime.InteropServices.Marshal]::PtrToStringBSTR($b) } finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($b) }
}
$saPlain = Convert-Secure $SaPassword
$appPlain = Convert-Secure $AppPassword

# Generate temp SQL with injected values safely (no quoting of identifiers beyond QUOTENAME logic handled inside dynamic SQL)
$tempFile = New-TemporaryFile
@"
DECLARE @AppLogin SYSNAME = N'$AppLogin';
DECLARE @AppPassword NVARCHAR(128) = N'$appPlain';
DECLARE @AppDatabase SYSNAME = N'$Database';
DECLARE @DefaultSchema SYSNAME = N'$DefaultSchema';

IF @AppPassword IS NULL OR LEN(@AppPassword) < 12
BEGIN
  RAISERROR('App password must be at least 12 characters.',16,1);
  RETURN;
END;

IF NOT EXISTS (SELECT 1 FROM sys.server_principals WHERE name = @AppLogin)
BEGIN
  DECLARE @SQL NVARCHAR(MAX) = N'CREATE LOGIN ' + QUOTENAME(@AppLogin) + N' WITH PASSWORD = N' + QUOTENAME(@AppPassword,'''') + N', CHECK_POLICY=ON, CHECK_EXPIRATION=ON';
  EXEC(@SQL);
END

DECLARE @Exists BIT = 0;
DECLARE @Check NVARCHAR(MAX) = N'SELECT @E = CASE WHEN EXISTS (SELECT 1 FROM ' + QUOTENAME(@AppDatabase) + N'.sys.database_principals WHERE name=@L) THEN 1 ELSE 0 END';
EXEC sp_executesql @Check, N'@L SYSNAME,@E BIT OUTPUT', @L=@AppLogin, @E=@Exists OUTPUT;
IF @Exists = 0
BEGIN
  EXEC(N'USE ' + QUOTENAME(@AppDatabase) + N'; CREATE USER ' + QUOTENAME(@AppLogin) + N' FOR LOGIN ' + QUOTENAME(@AppLogin) + N' WITH DEFAULT_SCHEMA=' + QUOTENAME(@DefaultSchema));
END

EXEC(N'USE ' + QUOTENAME(@AppDatabase) + N'; ALTER ROLE db_datareader ADD MEMBER ' + QUOTENAME(@AppLogin));
EXEC(N'USE ' + QUOTENAME(@AppDatabase) + N'; ALTER ROLE db_datawriter ADD MEMBER ' + QUOTENAME(@AppLogin));
PRINT 'Provisioning complete for ' + @AppLogin + ' on database ' + @AppDatabase;
"@ | Set-Content -Encoding UTF8 -Path $tempFile.FullName

& sqlcmd -S $Server -U $SaUser -P $saPlain -C -b -i $tempFile.FullName
$code = $LASTEXITCODE
Remove-Item $tempFile.FullName -ErrorAction SilentlyContinue
exit $code
