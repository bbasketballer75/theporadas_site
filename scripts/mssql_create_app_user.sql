-- Purpose: Create a least-privileged SQL Login + User for the application
-- Usage:
--   1. Connect as sysadmin (sa or other) inside the container or remote session
--   2. Customize the variables below (DO NOT commit secrets)
--   3. Run: sqlcmd -S localhost -U sa -P "<SA_PASSWORD>" -i scripts/mssql_create_app_user.sql
--   4. Update your application connection string to use the new principal
--
-- Security Notes:
--   - Avoid using 'sa' for application connections
--   - Grant only the minimum required roles/permissions
--   - Rotate the password periodically

/* =============================
   CONFIGURATION (EDIT VALUES)
   ============================= */
DECLARE @AppLogin SYSNAME      = N'app_user';        -- Change if desired
DECLARE @AppPassword NVARCHAR(128) = N'Strong#ChangeMe123!'; -- CHANGE before running
DECLARE @AppDatabase SYSNAME   = N'WeddingApp';      -- Target application database
DECLARE @DefaultSchema SYSNAME = N'dbo';             -- Or create a custom schema

/* =============================
   SAFEGUARDS
   ============================= */
IF @AppPassword = N'Strong#ChangeMe123!'
BEGIN
    RAISERROR('You must change @AppPassword to a strong unique value before running this script.', 16, 1);
    RETURN;
END;

/* =============================
   CREATE LOGIN (if not exists)
   ============================= */
IF NOT EXISTS (SELECT 1 FROM sys.server_principals WHERE name = @AppLogin)
BEGIN
    PRINT 'Creating LOGIN: ' + @AppLogin;
    DECLARE @SQL NVARCHAR(MAX) = N'CREATE LOGIN ' + QUOTENAME(@AppLogin) + N' WITH PASSWORD = N''' + REPLACE(@AppPassword,'''','''''') + N''', CHECK_POLICY = ON, CHECK_EXPIRATION = ON';
    EXEC (@SQL);
END
ELSE
BEGIN
    PRINT 'LOGIN already exists: ' + @AppLogin;
END;

/* =============================
   CREATE DATABASE USER (if not exists)
   ============================= */
DECLARE @DbUserExists BIT = 0;
DECLARE @CheckUserSQL NVARCHAR(MAX) = N'SELECT @ExistsOut = CASE WHEN EXISTS (SELECT 1 FROM ' + QUOTENAME(@AppDatabase) + N'.sys.database_principals WHERE name = @AppLogin) THEN 1 ELSE 0 END';
EXEC sp_executesql @CheckUserSQL, N'@AppLogin SYSNAME, @ExistsOut BIT OUTPUT', @AppLogin=@AppLogin, @ExistsOut=@DbUserExists OUTPUT;

IF @DbUserExists = 0
BEGIN
    PRINT 'Creating USER in database: ' + @AppDatabase;
    DECLARE @CreateUserSQL NVARCHAR(MAX) = N'USE ' + QUOTENAME(@AppDatabase) + N'; CREATE USER ' + QUOTENAME(@AppLogin) + N' FOR LOGIN ' + QUOTENAME(@AppLogin) + N' WITH DEFAULT_SCHEMA=' + QUOTENAME(@DefaultSchema);
    EXEC (@CreateUserSQL);
END
ELSE
BEGIN
    PRINT 'USER already exists in database: ' + @AppDatabase;
END;

/* =============================
   ROLE MEMBERSHIP (adjust as needed)
   ============================= */
DECLARE @GrantSQL NVARCHAR(MAX) = N'USE ' + QUOTENAME(@AppDatabase) + N';
ALTER ROLE db_datareader ADD MEMBER ' + QUOTENAME(@AppLogin) + N';
ALTER ROLE db_datawriter ADD MEMBER ' + QUOTENAME(@AppLogin) + N';';
EXEC (@GrantSQL);
PRINT 'Granted db_datareader & db_datawriter roles.';

/* OPTIONAL: Grant specific EXECUTE on schema or stored procs */
-- Example:
-- USE [YourDb];
-- GRANT EXECUTE ON SCHEMA::[dbo] TO app_user;

PRINT 'Completed principal provisioning. Remember to: \n 1) Change password secret storage\n 2) Update application connection string\n 3) Revoke any unneeded roles later if over-privileged';
