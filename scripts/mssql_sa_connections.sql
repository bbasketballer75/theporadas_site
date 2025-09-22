-- Active connections using sa (or filter by any login)
SELECT
  s.session_id,
  s.login_name,
  s.host_name,
  s.program_name,
  c.client_net_address,
  c.local_net_address,
  c.net_transport,
  s.status,
  s.login_time,
  s.last_request_end_time
FROM sys.dm_exec_sessions s
JOIN sys.dm_exec_connections c ON s.session_id = c.session_id
WHERE s.login_name = 'sa'
ORDER BY s.session_id;
