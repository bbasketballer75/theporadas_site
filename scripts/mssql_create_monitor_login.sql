/*
Purpose: Create a constrained monitoring login for failed login archival / monitoring jobs.
Grants: VIEW SERVER STATE (required for certain DMVs) and CONNECT; no data access.

Edit variables below before running (strong password).

Usage:
  sqlcmd -S localhost,1433 -U sa -P <SA_PASSWORD> -i scripts/mssql_create_monitor_login.sql
*/
DECLARE @MonitorLogin SYSNAME = N'monitor_login';
DECLARE @MonitorPassword NVARCHAR(128) = N'ReplaceWith$trongRandomPw1!';

IF @MonitorPassword LIKE N'ReplaceWith%'
BEGIN
  RAISERROR('Update @MonitorPassword with a strong unique secret before executing.',16,1);
  RETURN;
END;

IF NOT EXISTS (SELECT 1 FROM sys.server_principals WHERE name = @MonitorLogin)
BEGIN
  DECLARE @sql NVARCHAR(MAX) = N'CREATE LOGIN ' + QUOTENAME(@MonitorLogin) + N' WITH PASSWORD = N' + QUOTENAME(@MonitorPassword,'''') + N', CHECK_POLICY=ON, CHECK_EXPIRATION=ON;';
  EXEC(@sql);
  PRINT 'Created login ' + @MonitorLogin;
END
ELSE
BEGIN
  PRINT 'Login already exists: ' + @MonitorLogin;
END;

-- Grant minimal permissions
IF NOT EXISTS (
  SELECT 1 FROM sys.server_permissions p
  JOIN sys.server_principals sp ON p.grantee_principal_id = sp.principal_id
  WHERE sp.name=@MonitorLogin AND p.permission_name='VIEW SERVER STATE'
)
BEGIN
  GRANT VIEW SERVER STATE TO [monitor_login];
END;

PRINT 'Monitor login provisioning complete.';
GO
