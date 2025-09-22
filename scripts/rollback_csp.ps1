[CmdletBinding(SupportsShouldProcess)]
param(
    [string]$File = "vercel.json",
    [switch]$WhatIfMode
)

# Restores 'unsafe-inline' to style-src in CSP main header quickly.
if (-not (Test-Path $File)) { Write-Error "File not found: $File"; exit 1 }

$json = Get-Content $File -Raw | ConvertFrom-Json
$updated = $false
foreach ($h in $json.headers) {
    foreach ($hdr in $h.headers) {
        if ($hdr.key -eq 'Content-Security-Policy' -and $hdr.value -notmatch "'unsafe-inline'") {
            $hdr.value = $hdr.value -replace "style-src 'self'", "style-src 'self' 'unsafe-inline'"
            $updated = $true
        }
    }
}
if (-not $updated) { Write-Host 'No change required.'; exit 0 }
if ($PSCmdlet.ShouldProcess($File, 'Restore unsafe-inline in CSP')) {
    ($json | ConvertTo-Json -Depth 10) | Set-Content $File
    Write-Host 'Rollback applied.'
}
else {
    Write-Host 'WhatIf: rollback would modify CSP to include unsafe-inline.'
}
