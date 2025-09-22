<#
.SYNOPSIS
  Find Docker container(s) by an internal network IP (e.g. 172.18.0.3) and show names, IDs, networks.

.EXAMPLE
  pwsh scripts/find_container_by_ip.ps1 -Ip 172.18.0.3

.NOTES
  Requires Docker CLI in PATH.
#>
param(
    [Parameter(Mandatory = $false)][string]$Ip,
    [switch]$ListAll,
    [switch]$IncludeStopped,
    [switch]$ShowNetworks
)

if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    Write-Error 'Docker CLI not found in PATH.'
    exit 1
}

$psArgs = @('ps', '-q')
if ($IncludeStopped) { $psArgs = @('ps', '-aq') }
$containers = docker @psArgs
if (-not $containers) {
    Write-Host 'No running containers.'
    exit 0
}

$results = @()
foreach ($id in $containers) {
    $inspectRaw = docker inspect $id
    if (-not $inspectRaw) { continue }
    $inspect = $inspectRaw | ConvertFrom-Json
    foreach ($netName in $inspect.NetworkSettings.Networks.PSObject.Properties.Name) {
        $netData = $inspect.NetworkSettings.Networks.$netName
        $ipAddr = $netData.IPAddress
        if ($ListAll -or (-not [string]::IsNullOrWhiteSpace($Ip) -and ($ipAddr -eq $Ip -or $ipAddr -like "$Ip*"))) {
            $results += [pscustomobject]@{
                ContainerID = $id.Substring(0, 12)
                Name        = ($inspect.Name).TrimStart('/')
                Network     = $netName
                IPAddress   = $ipAddr
                Image       = $inspect.Config.Image
                Created     = $inspect.Created
                Status      = ($inspect.State.Status)
            }
        }
    }
}

if ($ListAll -and -not $results) {
    Write-Host 'No containers with network interfaces.'
    exit 0
}

if (-not $ListAll -and [string]::IsNullOrWhiteSpace($Ip)) {
    Write-Error 'Provide -Ip <value> or use -ListAll.'
    exit 1
}

if ($results.Count -eq 0) {
    if ($ListAll) { Write-Host 'No results.' } else { Write-Host "No container match for IP pattern '$Ip'" }
    exit 0
}

if ($ShowNetworks) {
    $results | Sort-Object Network, IPAddress | Format-Table -AutoSize
}
else {
    $results | Sort-Object IPAddress | Format-Table ContainerID, Name, IPAddress, Status, Image -AutoSize
}
