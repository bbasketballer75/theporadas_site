param(
  [string]$ContainerName = 'wedding-sql',
  [string]$Port = '14333'
)
$saPlain = 'Temp!ResetP@ssw0rd123456789'
$sa = ConvertTo-SecureString $saPlain -AsPlainText -Force
$portInt = [int]$Port
& "$PSScriptRoot/reset_mssql_and_provision_monitor.ps1" -ContainerName $ContainerName -SaPassword $sa -MonitorLogin monitor_login -Port $portInt -CheckHealth -WhatIf
