/*
Purpose: Create an Extended Events session to capture failed SQL Server logins (Error 18456) with useful metadata.
Safe: Idempotent (drops existing session of same name before create).
Usage (sqlcmd example):
  sqlcmd -S localhost,1433 -U sa -P <password> -i scripts/mssql_failed_logins_xevent_create.sql
View live stream:
  sqlcmd -S localhost,1433 -U sa -P <password> -Q "SELECT CAST(event_data AS XML) AS xd FROM sys.fn_xe_file_target_read_file('failed_login_audit*.xel', NULL, NULL, NULL);"
*/
IF EXISTS (SELECT 1 FROM sys.server_event_sessions WHERE name = 'failed_login_audit')
BEGIN
  DROP EVENT SESSION [failed_login_audit] ON SERVER;
END;
GO

CREATE EVENT SESSION [failed_login_audit] ON SERVER
ADD EVENT sqlserver.error_reported(
    ACTION(
        sqlserver.client_app_name,
        sqlserver.client_hostname,
        sqlserver.client_ip,
        sqlserver.database_id,
        sqlserver.nt_username,
        sqlserver.server_principal_name,
        sqlserver.session_id,
        sqlserver.sql_text
    )
    WHERE ([severity]=(14) AND [error_number]=(18456))
)
ADD TARGET package0.event_file(
    SET filename=N'failed_login_audit', max_file_size=(10), max_rollover_files=(5)
)
WITH (MAX_MEMORY=4096 KB, EVENT_RETENTION_MODE=ALLOW_SINGLE_EVENT_LOSS, MAX_DISPATCH_LATENCY=5 SECONDS, MAX_EVENT_SIZE=0 KB, MEMORY_PARTITION_MODE=NONE, TRACK_CAUSALITY=OFF, STARTUP_STATE=ON);
GO

ALTER EVENT SESSION [failed_login_audit] ON SERVER STATE = START;
GO

PRINT 'Extended Events session failed_login_audit created and started.';
GO
