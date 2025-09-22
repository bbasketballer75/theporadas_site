<#$
.SYNOPSIS
  Executes a .sql file (batch separated by GO) or inline query against SQL Server using .NET (no sqlcmd dependency).

.PARAMETER Server
  Server name (hostname, host,port or instance syntax).

.PARAMETER Database
  Optional database context (default master).

.PARAMETER User
  SQL Auth login.

.PARAMETER Password
  SecureString password (use Read-Host -AsSecureString).

.PARAMETER File
  Path to .sql file. Supports multiple GO batches.

.PARAMETER Query
  Inline ad‑hoc query (ignored if File is specified).

.EXAMPLE
  pwsh scripts/invoke_sql.ps1 -Server localhost,1433 -User sa -Password (Read-Host -AsSecureString) -File scripts/mssql_create_monitor_login.sql

.EXAMPLE
  pwsh scripts/invoke_sql.ps1 -Server localhost,1433 -User monitor_login -Password (Read-Host -AsSecureString) -Query "SELECT @@VERSION;"
#>
[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)][string]$Server,
    [string]$Database = 'master',
    [Parameter(Mandatory = $true)][string]$User,
    [Parameter(Mandatory = $true)][SecureString]$Password,
    [string]$File,
    [string]$Query,
    [switch]$ShowBatches,
    [switch]$Silent
)

function Convert-Secure([SecureString]$sec) { $b = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($sec); try { [Runtime.InteropServices.Marshal]::PtrToStringBSTR($b) }finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($b) } }
$plain = Convert-Secure $Password

if (-not $File -and -not $Query) { throw 'Provide -File or -Query' }
if ($File -and -not (Test-Path $File)) { throw "File not found: $File" }

$scriptText = if ($File) { Get-Content -LiteralPath $File -Raw } else { $Query }

# Split on lines containing only GO (case-insensitive, ignoring leading/trailing spaces)
$batches = @()
$current = New-Object System.Text.StringBuilder
foreach ($line in ($scriptText -split "`n")) {
    if ($line.Trim() -match '^(?i)GO$') {
        $batches += $current.ToString(); $null = $current.Clear(); continue
    }
    $null = $current.AppendLine($line)
}
if ($current.Length -gt 0) { $batches += $current.ToString() }

Add-Type -AssemblyName System.Data
$connString = "Server=$Server;Database=$Database;User Id=$User;Password=$plain;TrustServerCertificate=true;Encrypt=true;";
$conn = New-Object System.Data.SqlClient.SqlConnection $connString
try {
    $conn.Open()
    for ($i = 0; $i -lt $batches.Count; $i++) {
        $batch = $batches[$i].Trim()
        if (-not $batch) { continue }
        if ($ShowBatches -and -not $Silent) { Write-Host "Executing batch $($i+1)/$($batches.Count)" -ForegroundColor Cyan }
        $cmd = $conn.CreateCommand(); $cmd.CommandText = $batch; $cmd.CommandTimeout = 120
        $reader = $cmd.ExecuteReader()
        $tables = @()
        while ($reader.HasRows) {
            $dt = New-Object System.Data.DataTable
            $dt.Load($reader)
            $tables += , $dt
        }
        $reader.Close()
        if (-not $Silent -and $tables.Count -gt 0) {
            foreach ($t in $tables) {
                $t | Format-Table -AutoSize | Out-String | Write-Host
            }
        }
    }
}
catch {
    Write-Error $_
    exit 1
}
finally {
    $conn.Dispose()
    [Array]::Clear($plain.ToCharArray(), 0, $plain.Length) | Out-Null
}
if (-not $Silent) { Write-Host 'Execution complete.' -ForegroundColor Green }
exit 0
