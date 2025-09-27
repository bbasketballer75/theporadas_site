<#
stop-mcp-containers.ps1

Stop any Docker containers referenced in logs/pids.json (container_<service> or containerid_<service> entries).
#>
$ErrorActionPreference = 'Stop'
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
$repoRoot = Resolve-Path (Join-Path $scriptDir '..')
Set-Location $repoRoot
$logsDir = Join-Path $repoRoot 'logs'
$pidsPath = Join-Path $logsDir 'pids.json'

if (-not (Test-Path $pidsPath)) { Write-Output 'No pids.json found; nothing to stop.'; exit 0 }

$map = @{}
try { $map = Get-Content $pidsPath | ConvertFrom-Json } catch { Write-Warning 'Failed to read pids.json'; exit 1 }

$dockerCmd = Get-Command docker -ErrorAction SilentlyContinue
if (-not $dockerCmd) { Write-Output 'Docker not found; nothing to do.'; exit 0 }

$stoppedAny = $false
# Build a map of services -> { name, id }
$services = @{}
foreach ($prop in $map.PSObject.Properties) {
    if ($prop.Name -like 'container_name_*') {
        $svc = $prop.Name -replace '^container_name_',''
        if (-not $services.ContainsKey($svc)) { $services[$svc] = @{ name = $null; id = $null } }
        $services[$svc].name = $prop.Value
    } elseif ($prop.Name -like 'container_id_*') {
        $svc = $prop.Name -replace '^container_id_',''
        if (-not $services.ContainsKey($svc)) { $services[$svc] = @{ name = $null; id = $null } }
        $services[$svc].id = $prop.Value
    }
}
foreach ($svc in $services.Keys) {
    $entry = $services[$svc]
    if (-not $entry.name -and -not $entry.id) { continue }
    try {
        if ($entry.id) { & docker stop $entry.id | Out-Null; $stopped = $entry.id } else { & docker stop $entry.name | Out-Null; $stopped = $entry.name }
        Write-Output "Stopped container '$stopped' for service $svc"
        $map["container_stopped_at_$svc"] = (Get-Date).ToString('o')
        if ($map.ContainsKey("container_name_$svc")) { $map.Remove("container_name_$svc") }
        if ($map.ContainsKey("container_id_$svc")) { $map.Remove("container_id_$svc") }
        $stoppedAny = $true
    } catch {
        Write-Warning "Failed to stop container for $svc: $_"
    }
}

if ($stoppedAny) {
    # Remove stopped container keys from the pids map and rewrite pids.json
    foreach ($rk in $removedKeys) { if ($map.ContainsKey($rk)) { $map.Remove($rk) } }
    try { $map | ConvertTo-Json -Depth 5 | Set-Content -Path $pidsPath -Encoding UTF8 } catch { Write-Warning "Failed to update pids.json after container cleanup: $_" }
    Write-Output 'Container cleanup attempted; you may also run stop-mcp.ps1 to clean processes.'
} else {
    Write-Output 'No container_name_* or container_id_* entries were recorded in pids.json or none could be stopped.'
}

exit 0
