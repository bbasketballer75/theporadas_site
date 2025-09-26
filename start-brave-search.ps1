$envPath = "C:/Users/Austin/Documents/theporadas_site/.env"
$braveApiKey = (Get-Content $envPath | Select-String '^BRAVE_API_KEY=' | ForEach-Object { $_.ToString().Split('=')[1].Trim() })
if (-not $braveApiKey) {
    Write-Error "BRAVE_API_KEY not found in $envPath"; exit 1
}
$env:BRAVE_API_KEY = $braveApiKey
Start-Process -NoNewWindow -Wait -FilePath "npx.cmd" -ArgumentList "-y @modelcontextprotocol/server-brave-search"
