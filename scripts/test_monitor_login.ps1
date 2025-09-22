[CmdletBinding()]
param(
  [string]$Server = 'localhost,14333',
  [Parameter(Mandatory)][string]$MonitorUser,
  [Parameter(Mandatory)][SecureString]$MonitorPassword
)
function Convert-Secure([SecureString]$sec){$b=[Runtime.InteropServices.Marshal]::SecureStringToBSTR($sec);try{[Runtime.InteropServices.Marshal]::PtrToStringBSTR($b)}finally{[Runtime.InteropServices.Marshal]::ZeroFreeBSTR($b)}}
$pwPlain = Convert-Secure $MonitorPassword
Add-Type -AssemblyName System.Data
$conn = New-Object System.Data.SqlClient.SqlConnection ("Server=$Server;Database=master;User Id=$MonitorUser;Password=$pwPlain;TrustServerCertificate=true;Encrypt=true;")
try { $conn.Open() } catch { Write-Error "Cannot connect as monitor login: $_"; exit 1 }
# Attempt a permitted query
$cmd = $conn.CreateCommand(); $cmd.CommandText = 'SELECT COUNT(*) FROM sys.dm_exec_sessions'; try { $count = $cmd.ExecuteScalar() } catch { Write-Error 'VIEW SERVER STATE not granted or DMV inaccessible.'; exit 2 }
Write-Host "[+] VIEW SERVER STATE validated (sessions count=$count)" -ForegroundColor Green
# Attempt a forbidden action (create login) to assert limited privilege
$deny = $conn.CreateCommand(); $deny.CommandText = "CREATE LOGIN [temp_login_forbidden] WITH PASSWORD = 'XyZ!123456789';"; $forbidden = $false
try { $deny.ExecuteNonQuery() | Out-Null; $forbidden = $true } catch { }
if ($forbidden) { Write-Error 'Monitor login improperly has privilege to create logins.'; exit 3 }
Write-Host '[+] Privilege boundary enforced (cannot create login)' -ForegroundColor Green
$conn.Dispose(); exit 0
