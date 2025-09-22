/*
Purpose: Drop the failed_login_audit Extended Events session if it exists.
Usage:
  sqlcmd -S localhost,1433 -U sa -P <pw> -i scripts/mssql_failed_logins_xevent_drop.sql
*/
IF EXISTS (SELECT 1 FROM sys.server_event_sessions WHERE name = 'failed_login_audit')
BEGIN
    DROP EVENT SESSION [failed_login_audit] ON SERVER;
    PRINT 'Dropped Extended Events session failed_login_audit';
END
ELSE
BEGIN
    PRINT 'Session failed_login_audit not found';
END;
GO
