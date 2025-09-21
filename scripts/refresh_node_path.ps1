param(
  [switch]$DryRun
)

Write-Host "Refreshing Node/NPM/NPX PATH (session)" -ForegroundColor Cyan

# Detect common Node installs
$nodePaths = @()
$possible = @(
  "$env:ProgramFiles\nodejs",
  "$env:ProgramFiles(x86)\nodejs",
  "$env:LOCALAPPDATA\Programs\node",
  "$env:USERPROFILE\\scoop\apps\nodejs-lts\current",
  "$env:USERPROFILE\\scoop\apps\nodejs\current",
  "$env:NVM_SYMLINK"
) | Where-Object { $_ -and (Test-Path $_) }

foreach ($p in $possible) {
  if (Test-Path "$p\node.exe") { $nodePaths += $p }
}

# If using fnm/nvm, attempt to locate current version shim
if ($env:NODEHOME -and (Test-Path $env:NODEHOME)) { $nodePaths += $env:NODEHOME }

$nodePaths = $nodePaths | Select-Object -Unique

if ($DryRun) {
  Write-Host "[DryRun] Would add the following to PATH if missing:" -ForegroundColor Yellow
  $nodePaths | ForEach-Object { Write-Host " - $_" }
}
else {
  $current = [System.Environment]::GetEnvironmentVariable('PATH', 'Process')
  $parts = $current.Split(';') | Where-Object { $_ -ne '' }
  foreach ($p in $nodePaths) {
    if (-not ($parts -contains $p)) { $parts += $p }
  }
  $newPath = ($parts | Select-Object -Unique) -join ';'
  [System.Environment]::SetEnvironmentVariable('PATH', $newPath, 'Process')
}

# Emit a lightweight preflight JSON similar to repo preflight expectations
$diagDir = "artifacts"
if (-not (Test-Path $diagDir)) { New-Item -ItemType Directory -Path $diagDir | Out-Null }
$diagFile = Join-Path $diagDir "preflight_test_diag.json"

$nodeCmd = (Get-Command node.exe -ErrorAction SilentlyContinue)
$hasConcrete = $null -ne $nodeCmd
$payload = @{ nodePathDiagnostics = @{ hasConcreteNode = $hasConcrete; path = if ($hasConcrete) { $nodeCmd.Path } else { $null } } }
$payload | ConvertTo-Json -Depth 5 | Set-Content -Path $diagFile -Encoding UTF8

Write-Host "Done." -ForegroundColor Green
exit 0
