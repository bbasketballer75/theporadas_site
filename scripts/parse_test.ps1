$tokens = $null
$errors = $null
$path = Resolve-Path 'scripts/run_supervisor.ps1'
[void][System.Management.Automation.Language.Parser]::ParseFile($path, [ref]$tokens, [ref]$errors)
if ($errors -and $errors.Count -gt 0) {
    Write-Host 'Syntax errors:' -ForegroundColor Red
    $errors | ForEach-Object { Write-Host $_.Message -ForegroundColor Red }
    exit 1
}
else {
    Write-Host 'No syntax errors' -ForegroundColor Green
}
