param(
    [string]$ContainerName = 'wedding-sql',
    [string]$Port = '14333',
    [string]$AppUser = 'app_user',
    [string]$AppDatabase = 'appdb'
)
$saPlain = 'Tmp!R3setP@ssw0rd#2025_AA$'
$sa = ConvertTo-SecureString $saPlain -AsPlainText -Force
$portInt = [int]$Port
function New-RandomPassword([int]$Length = 40) {
    $chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*()-_=+[]{}';
    -join ((1..$Length) | ForEach-Object { $chars[(Get-Random -Max $chars.Length)] })
}
$appPwdPlain = New-RandomPassword
$appPwd = ConvertTo-SecureString $appPwdPlain -AsPlainText -Force
Write-Host "[+] Generated random app user password (store securely): $appPwdPlain" -ForegroundColor Yellow
& "$PSScriptRoot/reset_mssql_and_provision_monitor.ps1" -ContainerName $ContainerName -SaPassword $sa -MonitorLogin monitor_login -Port $portInt -CheckHealth -CreateAppUser -AppUser $AppUser -AppDatabase $AppDatabase -AppUserPassword $appPwd -ReadyTimeoutSeconds 120 -HealthTimeoutSeconds 120 -Confirm:$false
