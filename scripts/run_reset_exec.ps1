param(
    [string]$ContainerName = 'wedding-sql',
    [string]$Port = '14333'
)
$saPlain = 'Tmp!R3setP@ssw0rd#2025_AA$'
$sa = ConvertTo-SecureString $saPlain -AsPlainText -Force
$portInt = [int]$Port
& "$PSScriptRoot/reset_mssql_and_provision_monitor.ps1" -ContainerName $ContainerName -SaPassword $sa -MonitorLogin monitor_login -Port $portInt -CheckHealth -ReadyTimeoutSeconds 120 -HealthTimeoutSeconds 120 -Confirm:$false
