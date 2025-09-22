# MSSQL Operations Runbook

Status: Internal  
Audience: Engineering & Operations

## Scope

Operational procedures for the project SQL Server instance (local dev containers or hosted instance) covering:

- Provisioning & least privilege
- Monitoring failed logins
- Detecting residual `sa` usage
- Credential rotation
- Incident response for authentication storms

## 1. Provisioning Flow (Summary)

1. Start SQL container (see `scripts/mssql_docker_compose_example.yml`).
2. Run: `pwsh scripts/mssql_provision_app_user.ps1 ...` (creates login + user, grants reader/writer).
3. Update application env: `MSSQL_APP_USER`, `MSSQL_APP_PASSWORD`.
4. Redeploy/restart application.
5. (Optional) Disable or deny connect to `sa` after validation.

## 2. Monitoring Failed Logins

### Default Trace (Lightweight, short retention)

Run:

```pwsh
pwsh scripts/mssql_query.ps1 -Server <S> -User sa -Password (Read-Host -AsSecureString) -File scripts/mssql_failed_logins.sql
```

Limitation: Rolls over quickly; not suitable for long-term.

### Extended Events (Persistent Rolling Files)

Create session (idempotent):

```bash
sqlcmd -S <server> -U sa -P <pw> -i scripts/mssql_failed_logins_xevent_create.sql
```

Read events:

```bash
sqlcmd -S <server> -U sa -P <pw> -Q "SELECT CAST(event_data AS XML) AS xd FROM sys.fn_xe_file_target_read_file('failed_login_audit*.xel', NULL, NULL, NULL);"
```

Filter for offending principal inside XML (`error_number=18456`).

### If `sqlcmd` Is Not Installed

You can execute any provided `.sql` script with the PowerShell fallback:

```pwsh
pwsh scripts/invoke_sql.ps1 -Server <server,port> -User sa -Password (Read-Host -AsSecureString) -File scripts/mssql_failed_logins_xevent_create.sql
```

Install `sqlcmd` later (Windows):

```pwsh
winget install --id Microsoft.DatabaseTools.Sqlcmd -e
```

Or use Docker (ephemeral client):

```bash
docker run --rm -v $PWD/scripts:/scripts mcr.microsoft.com/mssql-tools /opt/mssql-tools/bin/sqlcmd \
   -S <server,port> -U sa -P '<SA_PASSWORD>' -i /scripts/mssql_failed_logins_xevent_create.sql
```

## 3. Detect Active `sa` Usage

```pwsh
pwsh scripts/mssql_query.ps1 -Server <S> -User sa -Password (Read-Host -AsSecureString) -File scripts/mssql_sa_connections.sql
```

Terminate suspicious session once app user is live:

```sql
KILL <session_id>;
```

## 4. Credential Rotation Procedure

1. Generate new strong password (>=16 chars, high entropy).
2. In SQL:

   ```sql
   ALTER LOGIN [<app_login>] WITH PASSWORD = '<new>';
   ```

3. Update secret storage / env vars (do not commit plaintext).
4. Restart application services.
5. Validate connectivity.
6. Invalidate prior password window (monitor for continued failed logins => potential leakage).

## 5. Disabling `sa`

After full migration & validation:

```sql
ALTER LOGIN [sa] DISABLE; -- or DENY CONNECT SQL TO [sa];
```

Keep a break-glass path (securely stored) if disabling may break maintenance automation.

## 6. Authentication Storm Response

1. Identify source IP/container:

   ```pwsh
   pwsh scripts/find_container_by_ip.ps1 -ListAll -ShowNetworks
   ```

2. Inspect Extended Events output for client_app_name & client_ip.
3. Block offending network path (container stop / firewall rule).
4. If password spray suspected: rotate app credentials immediately (Section 4).
5. Increase log retention if forensics required (copy `.xel` files).

## 7. CI Guardrail

Run in pipeline:

```pwsh
pwsh scripts/enforce_no_sa_usage.ps1
```

Fails build if `sa` appears in non-whitelisted code paths.

### Nightly Archival Job

Workflow: `.github/workflows/mssql-security.yml` (scheduled) executes:

- `scripts/archive_failed_logins.ps1` (captures Extended Events or trace fallback)
- Uploads artifacts under `failed-login-archive`

Secrets required (set in repository settings):

- `MSSQL_SA_PASSWORD` – strong administrative password
- `MSSQL_SERVER` – server address (e.g. `prod-sql.internal:1433`)

Optional secrets (preferred over `sa`):

- `MSSQL_MONITOR_USER` – dedicated monitoring login (created via `scripts/mssql_create_monitor_login.sql`)
- `MSSQL_MONITOR_PASSWORD` – strong password for monitoring login

If monitor secrets are absent, workflow falls back to `sa`.

### Creating the Monitoring Login

1. Edit `scripts/mssql_create_monitor_login.sql` and set a strong password.
2. Run:

   ```bash
   sqlcmd -S <server> -U sa -P <SA_PASSWORD> -i scripts/mssql_create_monitor_login.sql
   ```

3. Store credentials as GitHub repository secrets: `MSSQL_MONITOR_USER`, `MSSQL_MONITOR_PASSWORD`.
4. Remove any direct archival dependence on `sa` once validated.

## 8. Routine Checklist

| Frequency       | Action                                              |
| --------------- | --------------------------------------------------- |
| Daily (if prod) | Review failed login Extended Events sample          |
| Weekly          | Confirm no `sa` sessions; rotate if policy requires |
| Quarterly       | Review role grants & prune unused logins            |

## 9. Future Enhancements

- Add alerting integration (tail `.xel` -> webhook).
- Migrate Extended Events to central log store.
- Add hashed secrets management via KMS.

## 10. References

- `docs/internal/mssql-login-migration.md`
- `ENVIRONMENT_VARIABLES.md`
- Scripts in `scripts/` prefixed `mssql_`
- XEvent create: `scripts/mssql_failed_logins_xevent_create.sql`
- XEvent drop: `scripts/mssql_failed_logins_xevent_drop.sql`
- Archive script: `scripts/archive_failed_logins.ps1`
- CI Workflow: `.github/workflows/mssql-security.yml`
