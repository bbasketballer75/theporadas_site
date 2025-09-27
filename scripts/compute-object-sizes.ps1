# Compute object sizes for objects listed in logs/objects-list.txt
$ErrorActionPreference = 'Continue'
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
$repoRoot = Resolve-Path (Join-Path $scriptDir '..')
Set-Location $repoRoot
$objectsList = Join-Path $repoRoot 'logs\objects-list.txt'
$outFile = Join-Path $repoRoot 'logs\objects-sizes.txt'
if (-not (Test-Path $objectsList)) { Write-Error "Objects list not found: $objectsList"; exit 2 }
if (Test-Path $outFile) { Remove-Item $outFile -Force }
$threshold = 5MB
Get-Content $objectsList | ForEach-Object -Begin { $i = 0 } -Process {
    $line = $_
    if ([string]::IsNullOrWhiteSpace($line)) { return }
    $firstSpace = $line.IndexOf(' ')
    if ($firstSpace -ge 0) { $obj = $line.Substring(0, $firstSpace) } else { $obj = $line }
    try {
        $type = & git cat-file -t $obj 2>$null
    }
    catch {
        $type = $null
    }
    if ($type -eq 'blob') {
        try { $size = [int64](& git cat-file -s $obj) } catch { $size = 0 }
        "$obj $size $line" | Out-File -Append -FilePath $outFile -Encoding UTF8
    }
    $i++
}
Write-Output "Wrote object sizes to: $outFile"
