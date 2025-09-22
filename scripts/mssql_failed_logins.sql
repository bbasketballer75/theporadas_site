-- Recent failed SQL logins (leveraging default trace if enabled)
-- NOTE: Default trace may be disabled; alternative is Extended Events.
SELECT TOP 50
       StartTime,
       LoginName,
       HostName,
       ApplicationName,
       TextData AS ErrorText
FROM ::fn_trace_gettable(
       (SELECT CAST(value AS NVARCHAR(260)) FROM sys.fn_trace_getinfo(NULL) WHERE property = 2), DEFAULT)
WHERE EventClass = 20 -- Login Failed
ORDER BY StartTime DESC;
