# Environment Variables Documentation

This document lists all environment variables defined in `.env`, organized by sections matching the file structure. Each variable includes its purpose, how to obtain the value, examples, security notes, and setup instructions.

## 1. Core Secrets (REQUIRED for those services)

These variables are essential for core functionality and must be set for the respective services to work.

### NOTION_API_KEY

**Purpose:** Internal integration token for Notion API access, enabling database queries and page operations.

**How to obtain:**

1. Go to [Notion Developers](https://developers.notion.com/)
2. Create a new integration
3. Copy the API key (starts with 'secret\_')

**Example:** `NOTION_API_KEY=secret_abc123def456ghi789`

**Security Notes:**

- Never commit this to version control
- Rotate regularly (every 6-12 months)
- Use least privilege - only grant necessary database/page access

**Setup Instructions:**

1. Create Notion integration at developers.notion.com
2. Share relevant pages/databases with the integration
3. Set the environment variable in your deployment environment

### TAVILY_API_KEY

**Purpose:** API key for Tavily search service, used for web search and content extraction.

**How to obtain:**

1. Sign up at [Tavily](https://tavily.com/)
2. Navigate to API keys section
3. Generate a new API key

**Example:** `TAVILY_API_KEY=tvly-abc123def456ghi789`

**Security Notes:**

- Store securely, never in plain text files
- Monitor usage to detect unauthorized access
- Use separate keys for development/production

**Setup Instructions:**

1. Create account at tavily.com
2. Generate API key in dashboard
3. Set variable before running search-related features

### MEM0_API_KEY

**Purpose:** API key for Mem0 memory service, enabling persistent memory storage and retrieval.

**How to obtain:**

1. Register at [Mem0](https://mem0.ai/)
2. Access API keys in your account settings
3. Create a new key

**Example:** `MEM0_API_KEY=m0-abc123def456ghi789`

**Security Notes:**

- Encrypt in transit and at rest
- Implement rate limiting on API calls
- Audit access logs regularly

**Setup Instructions:**

1. Sign up for Mem0 service
2. Generate API key
3. Configure variable for memory operations

### SQLSERVER_CONNECTION_STRING

**Purpose:** Connection string for SQL Server database access.

**How to obtain:**

1. Set up SQL Server instance (local or cloud)
2. Configure database credentials
3. Construct connection string with server, database, user, and password

**Example:** `SQLSERVER_CONNECTION_STRING=Server=localhost,1433;Database=WeddingApp;User Id=sa;Password=YourPassword123;`

**Security Notes:**

- Use parameterized queries to prevent SQL injection
- Encrypt connection strings in production
- Use managed identities when possible instead of passwords

**Setup Instructions:**

1. Install/configure SQL Server
2. Create database and user
3. Construct secure connection string
4. Test connectivity before deployment

## 2. Optional External Integrations

These variables enable additional features but are not required for core functionality.

### GITHUB_TOKEN

**Purpose:** GitHub personal access token for repository operations and API access.

**How to obtain:**

1. Go to GitHub Settings > Developer settings > Personal access tokens
2. Generate new token with 'repo' scope
3. Copy the token

**Example:** `GITHUB_TOKEN=ghp_abc123def456ghi789jkl012`

**Security Notes:**

- Use fine-grained tokens with minimal scopes
- Rotate tokens every 30-90 days
- Never share tokens in public repositories

**Setup Instructions:**

1. Create GitHub PAT with required scopes
2. Store securely (consider using GitHub secrets for CI/CD)
3. Set variable for GitHub API operations

### GH_TOKEN

**Purpose:** Alternative GitHub token variable (used by some tooling).

**How to obtain:** Same as GITHUB_TOKEN above.

**Example:** `GH_TOKEN=github_pat_abc123def456ghi789`

**Security Notes:** Same as GITHUB_TOKEN.

**Setup Instructions:** Same as GITHUB_TOKEN.

## 3. MCP Server / Tooling Configuration (non-secret)

Configuration for MCP (Model Context Protocol) servers and tooling.

### MCP_FS_ROOT

**Purpose:** Root directory for filesystem sandbox, restricting file access to a specific path.

**How to obtain:** Define the desired sandbox directory path.

**Example:** `MCP_FS_ROOT=./mcp_fs_sandbox`

**Security Notes:**

- Keep as restrictive as possible
- Use absolute paths for production
- Regularly audit accessed files

**Setup Instructions:**

1. Create the sandbox directory
2. Set path relative to project root
3. Ensure proper permissions

### MCP_MEMORY_BANK_DIR

**Purpose:** Directory for memory bank storage.

**How to obtain:** Specify the memory storage directory.

**Example:** `MCP_MEMORY_BANK_DIR=memory-bank`

**Security Notes:**

- Ensure directory has appropriate permissions
- Consider encryption for sensitive data

**Setup Instructions:**

1. Create the directory
2. Set relative path
3. Configure backup procedures

### MCP_PYTHON_BIN

**Purpose:** Path to Python binary for MCP operations.

**How to obtain:** System Python path or virtual environment path.

**Example:** `MCP_PYTHON_BIN=python` or `MCP_PYTHON_BIN=/usr/bin/python3`

**Security Notes:**

- Use system Python or trusted virtual environment
- Avoid user-writable Python installations

**Setup Instructions:**

1. Install Python if needed
2. Verify Python version compatibility
3. Set correct path

### MCP_PY_TIMEOUT_MS

**Purpose:** Timeout for Python operations in milliseconds.

**How to obtain:** Set based on expected operation duration.

**Example:** `MCP_PY_TIMEOUT_MS=3000`

**Security Notes:** N/A

**Setup Instructions:** Adjust based on performance requirements.

### MCP_PW_SESSION_LIMIT

**Purpose:** Maximum concurrent Playwright sessions.

**How to obtain:** Set based on system resources.

**Example:** `MCP_PW_SESSION_LIMIT=5`

**Security Notes:** Prevent resource exhaustion.

**Setup Instructions:** Tune based on available memory/CPU.

### MCP_PW_NAV_TIMEOUT_MS

**Purpose:** Navigation timeout for Playwright in milliseconds.

**How to obtain:** Set based on page load times.

**Example:** `MCP_PW_NAV_TIMEOUT_MS=15000`

**Security Notes:** N/A

**Setup Instructions:** Adjust for slow-loading pages.

### MCP_PT_SESSION_LIMIT

**Purpose:** Maximum concurrent Puppeteer sessions.

**How to obtain:** Set based on system resources.

**Example:** `MCP_PT_SESSION_LIMIT=5`

**Security Notes:** Prevent resource exhaustion.

**Setup Instructions:** Tune based on available resources.

### MCP_PT_NAV_TIMEOUT_MS

**Purpose:** Navigation timeout for Puppeteer in milliseconds.

**How to obtain:** Set based on page load times.

**Example:** `MCP_PT_NAV_TIMEOUT_MS=15000`

**Security Notes:** N/A

**Setup Instructions:** Adjust for slow-loading pages.

### MCP_KG_MAX_TRIPLES

**Purpose:** Maximum triples for knowledge graph.

**How to obtain:** Set based on memory constraints.

**Example:** `MCP_KG_MAX_TRIPLES=5000`

**Security Notes:** N/A

**Setup Instructions:** Adjust based on use case.

### MCP_MAX_LINE_LEN

**Purpose:** Maximum line length for processing.

**How to obtain:** Set based on file size limits.

**Example:** `MCP_MAX_LINE_LEN=200000`

**Security Notes:** Prevent memory issues with large files.

**Setup Instructions:** Tune for expected file sizes.

### MCP_ERROR_METRICS

**Purpose:** Enable error telemetry (0=disabled, 1=enabled).

**How to obtain:** Set to 1 for monitoring, 0 to disable.

**Example:** `MCP_ERROR_METRICS=0`

**Security Notes:** Consider privacy implications.

**Setup Instructions:** Enable for debugging, disable in production.

### MCP_ERRORS_VERBOSE

**Purpose:** Verbose error reporting mode.

**How to obtain:** Set to 'summary' or 'full'.

**Example:** `MCP_ERRORS_VERBOSE=summary`

**Security Notes:** Avoid exposing sensitive information.

**Setup Instructions:** Use 'summary' for production.

## 4. Quality Gates & Thresholds (tune via history)

Coverage and performance thresholds for quality assurance.

### GATE_MIN_STATEMENTS

**Purpose:** Minimum statement coverage percentage required.

**How to obtain:** Based on project history and requirements.

**Example:** `GATE_MIN_STATEMENTS=95`

**Security Notes:** N/A

**Setup Instructions:** Gradually increase from current baseline.

### GATE_MIN_BRANCHES

**Purpose:** Minimum branch coverage percentage required.

**How to obtain:** Based on project history.

**Example:** `GATE_MIN_BRANCHES=90`

**Security Notes:** N/A

**Setup Instructions:** Adjust based on code complexity.

### GATE_MIN_FUNCTIONS

**Purpose:** Minimum function coverage percentage required.

**How to obtain:** Based on project history.

**Example:** `GATE_MIN_FUNCTIONS=95`

**Security Notes:** N/A

**Setup Instructions:** Tune via historical data.

### GATE_MIN_LINES

**Purpose:** Minimum line coverage percentage required.

**How to obtain:** Based on project history.

**Example:** `GATE_MIN_LINES=95`

**Security Notes:** N/A

**Setup Instructions:** Gradually improve over time.

### GATE_LH_CATEGORY_TOLERANCE

**Purpose:** Tolerance for Lighthouse category scores.

**How to obtain:** Set based on acceptable performance variance.

**Example:** `GATE_LH_CATEGORY_TOLERANCE=0.01`

**Security Notes:** N/A

**Setup Instructions:** Adjust for score stability.

### GATE_TOKEN_MAX_NET

**Purpose:** Maximum net token change allowed.

**How to obtain:** Based on project size and CI constraints.

**Example:** `GATE_TOKEN_MAX_NET=800`

**Security Notes:** N/A

**Setup Instructions:** Set based on typical PR sizes.

### LH_ALLOWED_DELTA

**Purpose:** Allowed delta for Lighthouse metrics.

**How to obtain:** Based on performance stability.

**Example:** `LH_ALLOWED_DELTA=0.03`

**Security Notes:** N/A

**Setup Instructions:** Tune for metric variance.

### LH_METRIC_REGRESSION_PCT

**Purpose:** Percentage threshold for metric regression.

**How to obtain:** Based on acceptable performance degradation.

**Example:** `LH_METRIC_REGRESSION_PCT=0.10`

**Security Notes:** N/A

**Setup Instructions:** Set based on performance requirements.

### LH_MIN_GZIP_DELTA_BYTES

**Purpose:** Minimum gzip size delta in bytes.

**How to obtain:** Based on bundle size monitoring.

**Example:** `LH_MIN_GZIP_DELTA_BYTES=1`

**Security Notes:** N/A

**Setup Instructions:** Adjust for size tracking.

### LH_MIN_GZIP_DELTA_PCT

**Purpose:** Minimum gzip size delta percentage.

**How to obtain:** Based on bundle size requirements.

**Example:** `LH_MIN_GZIP_DELTA_PCT=0.05`

**Security Notes:** N/A

**Setup Instructions:** Tune for percentage changes.

### LH_MIN_RAW_DELTA_BYTES

**Purpose:** Minimum raw size delta in bytes.

**How to obtain:** Based on asset size monitoring.

**Example:** `LH_MIN_RAW_DELTA_BYTES=1`

**Security Notes:** N/A

**Setup Instructions:** Adjust for raw size tracking.

### LH_MIN_RAW_DELTA_PCT

**Purpose:** Minimum raw size delta percentage.

**How to obtain:** Based on asset size requirements.

**Example:** `LH_MIN_RAW_DELTA_PCT=0.05`

**Security Notes:** N/A

**Setup Instructions:** Tune for percentage changes.

### MAX_STATEMENT_DROP

**Purpose:** Maximum allowed statement coverage drop.

**How to obtain:** Based on quality requirements.

**Example:** `MAX_STATEMENT_DROP=0.5`

**Security Notes:** N/A

**Setup Instructions:** Set based on acceptable degradation.

### MAX_BRANCH_DROP

**Purpose:** Maximum allowed branch coverage drop.

**How to obtain:** Based on quality requirements.

**Example:** `MAX_BRANCH_DROP=1.0`

**Security Notes:** N/A

**Setup Instructions:** Adjust for branch complexity.

### MAX_FUNCTION_DROP

**Purpose:** Maximum allowed function coverage drop.

**How to obtain:** Based on quality requirements.

**Example:** `MAX_FUNCTION_DROP=0.5`

**Security Notes:** N/A

**Setup Instructions:** Tune based on function coverage.

### MAX_LINE_DROP

**Purpose:** Maximum allowed line coverage drop.

**How to obtain:** Based on quality requirements.

**Example:** `MAX_LINE_DROP=0.5`

**Security Notes:** N/A

**Setup Instructions:** Set based on line coverage goals.

### PER_FILE_WARN_DROP

**Purpose:** Per-file warning threshold for coverage drop.

**How to obtain:** Based on file-level quality standards.

**Example:** `PER_FILE_WARN_DROP=2.0`

**Security Notes:** N/A

**Setup Instructions:** Adjust for file-specific warnings.

### PER_FILE_FAIL_DROP

**Purpose:** Per-file failure threshold for coverage drop.

**How to obtain:** Based on strict quality requirements.

**Example:** `PER_FILE_FAIL_DROP=9999`

**Security Notes:** N/A

**Setup Instructions:** Set high to disable or low for strict enforcement.

## 5. Accessibility / Axe Best Practices

Configuration for accessibility testing and axe-core integration.

### A11Y_INCLUDE_BEST_PRACTICES

**Purpose:** Include axe-core best practice rules.

**How to obtain:** Set to true for comprehensive accessibility testing.

**Example:** `A11Y_INCLUDE_BEST_PRACTICES=true`

**Security Notes:** N/A

**Setup Instructions:** Enable for enhanced accessibility coverage.

### A11Y_BEST_OUTPUT

**Purpose:** Enable output of best practice violations.

**How to obtain:** Set to true to generate violation reports.

**Example:** `A11Y_BEST_OUTPUT=true`

**Security Notes:** N/A

**Setup Instructions:** Enable for detailed reporting.

### A11Y_BEST_OUTPUT_PATH

**Purpose:** Path for best practice violation output file.

**How to obtain:** Specify desired output file path.

**Example:** `A11Y_BEST_OUTPUT_PATH=artifacts/axe-best-practices-violations.json`

**Security Notes:** Ensure directory has write permissions.

**Setup Instructions:** Create artifacts directory if needed.

### A11Y_BEST_ENFORCE

**Purpose:** Enforce best practice rules as failures.

**How to obtain:** Set to true to fail builds on violations.

**Example:** `A11Y_BEST_ENFORCE=false`

**Security Notes:** N/A

**Setup Instructions:** Start with false, enable when ready.

### A11Y_THRESHOLD_HEADING_ORDER

**Purpose:** Threshold for heading order violations.

**How to obtain:** Set based on acceptable violation count.

**Example:** `A11Y_THRESHOLD_HEADING_ORDER=0`

**Security Notes:** N/A

**Setup Instructions:** Set to 0 for strict enforcement.

### A11Y_THRESHOLD_REGION

**Purpose:** Threshold for region violations.

**How to obtain:** Set based on acceptable violation count.

**Example:** `A11Y_THRESHOLD_REGION=0`

**Security Notes:** N/A

**Setup Instructions:** Set to 0 for strict enforcement.

## 6. Coverage / Reporting Options

Configuration for test coverage and reporting.

### COVERAGE_A11Y_SILENT

**Purpose:** Suppress accessibility coverage output.

**How to obtain:** Set to true to reduce log noise.

**Example:** `COVERAGE_A11Y_SILENT=false`

**Security Notes:** N/A

**Setup Instructions:** Set to true in CI environments.

### COVERAGE_A11Y_STRICT

**Purpose:** Enable strict accessibility coverage checking.

**How to obtain:** Set to true for rigorous testing.

**Example:** `COVERAGE_A11Y_STRICT=false`

**Security Notes:** N/A

**Setup Instructions:** Enable for production builds.

### COVERAGE_HTML

**Purpose:** Path to specific coverage HTML file to patch.

**How to obtain:** Specify coverage report file path.

**Example:** `COVERAGE_HTML=coverage/index.html`

**Security Notes:** N/A

**Setup Instructions:** Set when targeting specific coverage files.

## 7. Performance / Debug Flags (leave empty unless needed)

Debug and performance tuning flags.

### DEBUG

**Purpose:** Enable debug mode.

**How to obtain:** Set to any value to enable.

**Example:** `DEBUG=1`

**Security Notes:** Disable in production.

**Setup Instructions:** Use only for development debugging.

### CI

**Purpose:** Indicate CI environment.

**How to obtain:** Set automatically by CI systems.

**Example:** `CI=true`

**Security Notes:** N/A

**Setup Instructions:** Let CI system set this.

### FORCE

**Purpose:** Force operations.

**How to obtain:** Set when needed to override checks.

**Example:** `FORCE=true`

**Security Notes:** Use cautiously.

**Setup Instructions:** Only set when necessary.

### SNAPSHOT_UPDATE

**Purpose:** Update test snapshots.

**How to obtain:** Set during snapshot updates.

**Example:** `SNAPSHOT_UPDATE=true`

**Security Notes:** N/A

**Setup Instructions:** Use with test commands.

### INTERNAL_LANTERN_USE_TRACE

**Purpose:** Use trace data in Lantern.

**How to obtain:** Set for performance analysis.

**Example:** `INTERNAL_LANTERN_USE_TRACE=true`

**Security Notes:** N/A

**Setup Instructions:** Enable for detailed tracing.

### LH_DISABLE_ZLIB_SHIMS

**Purpose:** Disable zlib shims in Lighthouse.

**How to obtain:** Set to disable compression shims.

**Example:** `LH_DISABLE_ZLIB_SHIMS=true`

**Security Notes:** N/A

**Setup Instructions:** Set if compression issues occur.

### LH_FPS_TEST

**Purpose:** Enable FPS testing.

**How to obtain:** Set for frame rate analysis.

**Example:** `LH_FPS_TEST=true`

**Security Notes:** N/A

**Setup Instructions:** Enable for performance testing.

### LANTERN_DEBUG

**Purpose:** Enable Lantern debug mode.

**How to obtain:** Set for debugging Lantern operations.

**Example:** `LANTERN_DEBUG=true`

**Security Notes:** N/A

**Setup Instructions:** Use for troubleshooting.

### PRINT_WORST

**Purpose:** Print worst-case performance data.

**How to obtain:** Set to analyze bottlenecks.

**Example:** `PRINT_WORST=true`

**Security Notes:** N/A

**Setup Instructions:** Enable for performance analysis.

### OOPIFS

**Purpose:** Enable out-of-process iframes.

**How to obtain:** Set for iframe isolation.

**Example:** `OOPIFS=true`

**Security Notes:** N/A

**Setup Instructions:** Enable for security isolation.

### USE_NPM_LINK

**Purpose:** Use npm link for development.

**How to obtain:** Set for local package development.

**Example:** `USE_NPM_LINK=true`

**Security Notes:** N/A

**Setup Instructions:** Use in development environments.

## 8. Local Dev Server / Ports

Server configuration for local development.

### LH_PORT

**Purpose:** Port for Lighthouse development server.

**How to obtain:** Choose available port number.

**Example:** `LH_PORT=5174`

**Security Notes:** Ensure port is not exposed publicly.

**Setup Instructions:** Use default or set to available port.

### FIREBASE_MCP_CHECK_TIMEOUT_MS

**Purpose:** Timeout for Firebase MCP checks.

**How to obtain:** Set based on network conditions.

**Example:** `FIREBASE_MCP_CHECK_TIMEOUT_MS=8000`

**Security Notes:** N/A

**Setup Instructions:** Adjust for slower connections.

## 9. Database Dev Convenience (optional, non-secret examples)

Database configuration for development.

### DB_NAME

**Purpose:** Database name for development.

**How to obtain:** Set desired database name.

**Example:** `DB_NAME=WeddingApp`

**Security Notes:** N/A

**Setup Instructions:** Match your database setup.

### DB_USER

**Purpose:** Database username.

**How to obtain:** Create database user.

**Example:** `DB_USER=wedding_dev`

**Security Notes:** Use strong passwords.

**Setup Instructions:** Create user with appropriate permissions.

### DB_PASSWORD

**Purpose:** Database password.

**How to obtain:** Generate secure password.

**Example:** `DB_PASSWORD=YourSecurePassword123!`

**Security Notes:**

- Never commit to version control
- Use password manager
- Rotate regularly

**Setup Instructions:** Set strong, unique password.

### DB_PORT

**Purpose:** Database port.

**How to obtain:** Use default SQL Server port or custom.

**Example:** `DB_PORT=14333`

**Security Notes:** N/A

**Setup Instructions:** Match your SQL Server configuration.

### DB_HOST

**Purpose:** Database host.

**How to obtain:** Set to localhost or remote host.

**Example:** `DB_HOST=localhost`

**Security Notes:** Use secure connections for remote hosts.

**Setup Instructions:** Set to your database server address.

## 10. Future / Planned Integrations (placeholders)

Planned features and integrations.

### ANALYZER_JSON_OUTPUT

**Purpose:** Path for analyzer JSON output.

**How to obtain:** Specify output file path.

**Example:** `ANALYZER_JSON_OUTPUT=artifacts/quality-latest.json`

**Security Notes:** N/A

**Setup Instructions:** Create artifacts directory.

### CONTEXT7_API_KEY

**Purpose:** API key for Context7 service.

**How to obtain:** Will be provided when service is integrated.

**Example:** `CONTEXT7_API_KEY=ctx7-abc123`

**Security Notes:** Store securely when implemented.

**Setup Instructions:** Placeholder for future integration.

## 11. GitHub App (Code Scanning Alert Polling)

Configuration for GitHub App integration.

### GITHUB_APP_ID

**Purpose:** GitHub App numeric ID.

**How to obtain:**

1. Go to GitHub App settings
2. Copy the App ID number

**Example:** `GITHUB_APP_ID=123456`

**Security Notes:** Keep confidential.

**Setup Instructions:** Obtain from GitHub App dashboard.

### GITHUB_INSTALLATION_ID

**Purpose:** GitHub App installation ID.

**How to obtain:**

1. Install the GitHub App
2. Copy the installation ID

**Example:** `GITHUB_INSTALLATION_ID=789012`

**Security Notes:** Keep confidential.

**Setup Instructions:** Get from installation URL or API.

### GITHUB_APP_PRIVATE_KEY

**Purpose:** Private key for GitHub App authentication.

**How to obtain:**

1. Generate private key in GitHub App settings
2. Download the .pem file
3. Convert to single line with \n escapes

**Example:** `GITHUB_APP_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----\nMIIEpAIBAAKCAQEA...\n-----END RSA PRIVATE KEY-----"`

**Security Notes:**

- Never commit to version control
- Store as secret in deployment environment
- Rotate keys regularly

**Setup Instructions:**

1. Generate private key in GitHub App
2. Convert to environment variable format
3. Set in secure environment

### GITHUB_REPOSITORY

**Purpose:** Target GitHub repository for operations.

**How to obtain:** Set to your repository in format owner/repo.

**Example:** `GITHUB_REPOSITORY=bbasketballer75/theporadas_site`

**Security Notes:** N/A

**Setup Instructions:** Set to your repository name.

## General Security Notes

- **Never commit secrets** to version control. Use `.env` files locally and environment variables/secrets in production.
- **Use different values** for development, staging, and production environments.
- **Rotate credentials** regularly, especially API keys and passwords.
- **Monitor usage** of API keys to detect unauthorized access.
- **Use least privilege** principle for all credentials.
- **Encrypt sensitive data** both in transit and at rest.
- **Audit access logs** regularly for suspicious activity.

## Setup Instructions

1. Copy `.env` to `.env.local` for local development
2. Fill in required secrets with actual values
3. Use environment-specific files (`.env.production`, `.env.staging`) for different deployments
4. Set variables in your deployment platform (Vercel, Netlify, etc.)
5. Test configuration before deploying
6. Regularly review and update credentials

## Additional Notes

- Quality gates should be tuned gradually based on project history
- MCP filesystem root should be as restrictive as possible
- Database credentials should use managed identities when available
- GitHub App configuration is only needed for local code scanning scripts
- Placeholder variables are for future features and can be ignored currently

### SQL Server Credential Guidance

Prefer using the discrete variables (`DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`) or a consolidated `SQLSERVER_CONNECTION_STRING` referencing a least-privileged login (not `sa`). See `docs/internal/mssql-login-migration.md` for the procedure to create and migrate to an application-specific principal. Avoid shipping `sa` credentials in any environment variable or connection string. Rotate credentials regularly and restrict permissions to only required operations.

### MSSQL_APP_USER

**Purpose:** Canonical environment variable naming for the dedicated least-privileged SQL Server login the application uses post-migration.

**Example:** `MSSQL_APP_USER=app_user`

**Security Notes:** Must not be `sa`; ensure only necessary database roles are granted.

**Setup Instructions:** Created via provisioning script `scripts/mssql_provision_app_user.ps1`.

### MSSQL_APP_PASSWORD

**Purpose:** Password for `MSSQL_APP_USER` (stored only in secret management, injected at runtime).

**Example:** `MSSQL_APP_PASSWORD=Gen3r@tedLongRandom!`

**Security Notes:** Never commit; rotate on schedule or incident; length >=16, high entropy.

**Setup Instructions:** Provide secure value before starting app; if rotated, restart application components consuming it.

### GitHub Secrets: SQL Server Monitoring & App Credentials

The GitHub Actions workflow `.github/workflows/mssql-security.yml` can optionally use a
non-`sa` monitoring login and an application login. After running
`scripts/reset_mssql_and_provision_monitor.ps1` (or the individual provisioning scripts), set
these repository secrets:

Required (for monitor-based archival instead of `sa`):

- `MSSQL_SERVER` – Host and port (e.g. `prod-sql.internal:1433` or `localhost,1433` for local)
- `MSSQL_MONITOR_USER` – Monitoring login (VIEW SERVER STATE permission only)
- `MSSQL_MONITOR_PASSWORD` – Password for the monitoring login

Optional (application credentials for future jobs or deploy steps):

- `MSSQL_APP_USER` / `DB_USER` – Choose one naming convention (workflows currently only use monitor vars)
- `MSSQL_APP_PASSWORD` / `DB_PASSWORD`
- `MSSQL_APP_DB` / `DB_NAME`

Do NOT store `sa` credentials unless temporarily required; prefer the monitor login for telemetry
and the app user for application connections.

#### Setting Secrets via GitHub UI

1. Navigate: Repository → Settings → Secrets and variables → Actions → New repository secret.
2. Add each name/value pair above.
3. Re-run `mssql-security` workflow to confirm monitor path is taken (log line: `Using monitor login`).

#### Setting Secrets via GitHub CLI

```powershell
gh secret set MSSQL_SERVER --body "localhost,1433"
gh secret set MSSQL_MONITOR_USER --body "monitor_login"
gh secret set MSSQL_MONITOR_PASSWORD --body "<generated-monitor-password>"
# Optional app credentials
gh secret set MSSQL_APP_USER --body "app_user"
gh secret set MSSQL_APP_PASSWORD --body "<generated-app-password>"
gh secret set MSSQL_APP_DB --body "appdb"
```

#### Rotation Procedure

1. Generate a new password (minimum 32 chars, high entropy) locally.
2. Update login in SQL Server (example):

```powershell
pwsh scripts/invoke_sql.ps1 -Server localhost,1433 -User sa -Password (Read-Host -AsSecureString 'SA PW') -File scripts/rotate_monitor_login.sql
```

Or run an `ALTER LOGIN` in a secure session. 3. Update the corresponding GitHub secret(s) immediately. 4. Invalidate old password (done by ALTER LOGIN) and monitor workflow run for success. 5. Document rotation (timestamp + actor) if required internally.

#### Validation

After setting secrets, dispatch or wait for the scheduled workflow. In logs:

- Presence of `Using monitor login` confirms secrets are loaded.
- Absence of fallback lines referencing `sa` indicates correct least-privilege usage.
- Archival step should produce an artifact without authentication errors.

If secrets are missing, workflow will skip or fallback to `sa` (discouraged). Add missing secrets and re-run.
