# MSSQL Login Migration: Replacing `sa` with Least-Privilege User

## Goal

Eliminate application reliance on the `sa` login, stop repeated Error 18456 (State 8) authentication failures, and harden security.

## Symptoms Observed

- Log spam: `Error: 18456, Severity: 14, State: 8` (password mismatch for existing login)
- Source IPs (e.g. `172.18.0.3`, `172.18.0.4`) repeatedly attempting `sa` authentication
- Engine otherwise healthy (databases upgraded, no corruption)

State 8 = correct login name, wrong password.

## Migration Steps

### 1. Identify Offending Container / Service

Use helper script:

```pwsh
pwsh scripts/find_container_by_ip.ps1 -Ip 172.18.0.3
```

Or list all containers with their IPs:

```pwsh
docker ps -q | % { docker inspect -f '{{.Name}} {{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' $_ }
```

### 2. Decide on Database Principal Strategy

Create a dedicated login with only the rights required by the application
(typically CRUD in one database). Avoid `sysadmin` and server-level roles.

### 3. Provision Least-Privilege Login

Edit password and database name in `scripts/mssql_create_app_user.sql`, then run:

```pwsh
sqlcmd -S localhost -U sa -P <SA_PASSWORD> -i scripts/mssql_create_app_user.sql
```

The script:

- Creates LOGIN if absent
- Creates USER in target DB
- Grants `db_datareader` + `db_datawriter` (adjust later to least necessary)

Optional tightening after initial validation:

```sql
REVOKE INSERT, UPDATE, DELETE ON SomeSensitiveTable FROM app_user;
```

### 4. Rotate / Reset the `sa` Password (Optional but Recommended)

Recreate container or run inside SQL:

```sql
ALTER LOGIN sa WITH PASSWORD = 'New#Strong#P@ssw0rd' UNLOCK;
```

Ensure the new password is stored only in vault / secret store. Do **not** keep `sa` in application connection strings.

### 5. Update Application Configuration

Preferred: supply a single consolidated connection string via `SQLSERVER_CONNECTION_STRING`:

```text
Server=localhost,1433;Database=WeddingApp;User Id=app_user;Password=<APP_USER_PASSWORD>;TrustServerCertificate=true;
```

Add `TrustServerCertificate=true` for local dev over Docker to suppress TLS validation warnings (not for production).

### 6. Remove / Stop Offending Old Service

Restart or remove the container still using `sa` credentials so log spam ceases.

### 7. Verify

1. Tail logs:

   ```pwsh
   docker logs -f <mssql_container>
   ```

2. Confirm no new Error 18456 entries for several minutes.
3. Run an application request that exercises DB I/O.
4. Validate least-privileged account cannot perform DDL:

   ```sql
   EXECUTE AS LOGIN = 'app_user';
   BEGIN TRY
     CREATE TABLE dbo.__perm_test(id int);
   END TRY BEGIN CATCH
     SELECT ERROR_NUMBER() AS Err, ERROR_MESSAGE() AS Msg;
   END CATCH;
   REVERT;
   ```

   Expect a permission error.

### 8. (Optional) Harden Further

- Disable `sa` login if policy allows: `ALTER LOGIN sa DISABLE;`
- Enforce password policy/expiration (already ON in script)
- Implement server audit for failed logins

### 9. Ongoing Monitoring (Post-Migration)

Enable the Extended Events session to retain failed login diagnostics beyond the short default trace window:

```bash
sqlcmd -S localhost,1433 -U sa -P <SA_PASSWORD> -i scripts/mssql_failed_logins_xevent_create.sql
```

View captured events (XML payload includes client IP, hostname, principal):

```bash
sqlcmd -S localhost,1433 -U sa -P <SA_PASSWORD> -Q "SELECT CAST(event_data AS XML) AS xd FROM sys.fn_xe_file_target_read_file('failed_login_audit*.xel', NULL, NULL, NULL);"
```

For operational procedures (credential rotation, storm response) see: `docs/internal/mssql-operations-runbook.md`.

## Troubleshooting

| Issue                | Cause                                         | Resolution                                         |
| -------------------- | --------------------------------------------- | -------------------------------------------------- |
| Still seeing State 8 | Another service still using old password      | Re-scan container IPs, update secrets              |
| State 5 errors       | Invalid login name                            | Check typo / principal existence                   |
| State 58 errors      | Could not find a login matching name provided | Ensure login created on server                     |
| TLS warnings         | Self-signed dev cert                          | Use `TrustServerCertificate=true` only in dev      |
| Timeout connecting   | Container not published or firewall block     | Ensure `-p 1433:1433` mapping & host accessibility |

## Reference: Error 18456 States (Common)

- 2 / 5: Invalid login
- 6: Attempt to use Windows login on SQL Auth
- 8: Password mismatch
- 11 / 12: Login valid but server access failure
- 38: Database not accessible

## Next Actions Checklist

- [ ] Identify client container
- [ ] Create `app_user` login
- [ ] Update connection secrets
- [ ] Rotate `sa` password (optional)
- [ ] Restart dependent services
- [ ] Verify logs clean
- [ ] Apply further hardening (disable `sa` / audits)

---

Maintainer note: Keep secrets out of VCS. This doc is operational guidance only.
