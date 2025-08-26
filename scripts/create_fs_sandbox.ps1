<#
.SYNOPSIS
  Creates/updates an MCP filesystem sandbox directory with optional junctions/symlinks to curated project subfolders.

.DESCRIPTION
  This script helps enforce least-privilege for the filesystem MCP server by provisioning a sandbox directory
  (`mcp_fs_sandbox` by default) and (optionally) linking selected source folders (e.g. content, media) inside it.

.PARAMETER Root
  Repository root path (defaults to script's parent parent directory).

.PARAMETER SandboxName
  Name of the sandbox directory to create (default: mcp_fs_sandbox).

.PARAMETER Link
  One or more relative folder names to link inside the sandbox (e.g. -Link content -Link media). If omitted, no links.

.PARAMETER Force
  Recreate existing links if they already exist.

.EXAMPLE
  pwsh scripts/create_fs_sandbox.ps1 -Link content -Link media

.EXAMPLE
  pwsh scripts/create_fs_sandbox.ps1 -SandboxName fs_edit -Link content

.NOTES
  Uses directory junctions (New-Item -ItemType Junction) for reliability on Windows without elevation.
  Outputs the suggested MCP_FS_ROOT value upon success.
#>

param(
    [string] $Root = (Resolve-Path (Join-Path $PSScriptRoot '..')),
    [string] $SandboxName = 'mcp_fs_sandbox',
    [string[]] $Link,
    [switch] $Force
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Write-Info($msg) { Write-Host "[sandbox] $msg" -ForegroundColor Cyan }
function Write-Warn($msg) { Write-Host "[sandbox] $msg" -ForegroundColor Yellow }
function Write-Err($msg) { Write-Host "[sandbox] $msg" -ForegroundColor Red }

$rootPath = Resolve-Path $Root
if (-not (Test-Path $rootPath)) { Write-Err "Root path not found: $rootPath"; exit 1 }

$sandbox = Join-Path $rootPath $SandboxName
if (-not (Test-Path $sandbox)) {
    Write-Info "Creating sandbox directory: $sandbox"
    New-Item -ItemType Directory -Path $sandbox | Out-Null
}
else {
    Write-Info "Sandbox directory exists: $sandbox"
}

if ($Link) {
    foreach ($rel in $Link) {
        $target = Join-Path $rootPath $rel
        if (-not (Test-Path $target)) { Write-Warn "Skipping missing target '$rel'"; continue }
        $linkPath = Join-Path $sandbox $rel
        if (Test-Path $linkPath) {
            if ($Force) {
                Write-Warn "Removing existing link/path: $linkPath"
                Remove-Item -Recurse -Force $linkPath
            }
            else {
                Write-Info "Link/path already exists (use -Force to recreate): $rel"
                continue
            }
        }
        Write-Info "Creating junction: $rel"
        New-Item -ItemType Junction -Path $linkPath -Target $target | Out-Null
    }
}

Write-Host "`nSandbox ready. Set MCP_FS_ROOT to:" -ForegroundColor Green
Write-Host $sandbox -ForegroundColor Green
Write-Host "`nExample: MCP_FS_ROOT=$sandbox" -ForegroundColor DarkGreen

exit 0
