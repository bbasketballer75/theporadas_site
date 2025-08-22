param(
    [string]$RepoRoot = "C:/Users/Austin/Downloads/wedding-website",
    [switch]$DryRun
)

$ErrorActionPreference = 'Stop'

function Save-Backup {
    param([string]$Path)
    if (Test-Path -LiteralPath $Path) {
        $bak = "$Path.bak"
        Copy-Item -LiteralPath $Path -Destination $bak -Force
    }
}

function Update-File {
    param([string]$Path, [scriptblock]$Transformer)
    if (-not (Test-Path -LiteralPath $Path)) { Write-Host "Skip (missing): $Path" -ForegroundColor Yellow; return }
    $orig = Get-Content -Raw -LiteralPath $Path -ErrorAction Stop
    $new = & $Transformer $orig
    if ($new -ne $orig) {
        if ($DryRun) { Write-Host "Would patch: $Path" -ForegroundColor Cyan }
        else {
            Save-Backup -Path $Path
            Set-Content -LiteralPath $Path -Value $new -NoNewline -Encoding UTF8
            Write-Host "Patched: $Path" -ForegroundColor Green
        }
    }
    else {
        Write-Host "No change: $Path" -ForegroundColor DarkGray
    }
}

# 1) Fix hooks in CustomYouTubePlayer.jsx
$ytPath = Join-Path $RepoRoot "src/components/CustomYouTubePlayer.jsx"
Update-File $ytPath { param($c)
    $out = $c
    # Memoize chapters array
    $out = [Regex]::Replace($out, "const\s+chapters\s*=\s*\[(?s:.*?)\];", { param($m)
            $body = $m.Value
            if ($body -match "React\.useMemo\(") { return $body }
            $body = $body -replace "^const\s+chapters\s*=\s*\[", "const chapters = React.useMemo(() => ["
            $body = $body -replace ";\s*$", "], []);"
            return $body
        }, [System.Text.RegularExpressions.RegexOptions]::Singleline)
    # Wrap startTimeUpdater with useCallback and deps [chapters]
    $out = [Regex]::Replace($out, "const\s+startTimeUpdater\s*=\s*\(playerInstance\)\s*=>\s*\{(?s:.*?)\n\s*\};", { param($m)
            $body = $m.Value
            if ($body -match "React\.useCallback\(") { return $body -replace "\]\);\s*$", "], [chapters]);" }
            $body = $body -replace "const\s+startTimeUpdater\s*=\s*\(playerInstance\)\s*=>\s*\{", "const startTimeUpdater = React.useCallback((playerInstance) => {"
            $body = [Regex]::Replace($body, "\n\s*\};\s*$", "
  }, [chapters]);", [System.Text.RegularExpressions.RegexOptions]::Singleline)
            return $body
        }, [System.Text.RegularExpressions.RegexOptions]::Singleline)
    # Add startTimeUpdater to initPlayer deps
    $out = [Regex]::Replace($out, "(const\s+initPlayer\s*=\s*React\.useCallback\(\(\)\s*=>\s*\{(?s:.*?)\},\s*\[)([^\]]*)(\]\);)", {
            param($m)
            $deps = $m.Groups[2].Value
            if ($deps -notmatch "startTimeUpdater") { $deps = ($deps.Trim()) + ", startTimeUpdater" }
            return $m.Groups[1].Value + $deps + $m.Groups[3].Value
        }, [System.Text.RegularExpressions.RegexOptions]::Singleline)
    return $out
}

# 2) Fix hooks in RealTimeActivityFeed.jsx
$feedPath = Join-Path $RepoRoot "src/components/RealTimeActivityFeed.jsx"
Update-File $feedPath { param($c)
    $out = $c
    # Ensure useMemo import
    $out = $out -replace "import\s+\{\s*useEffect,\s*useRef,\s*useState\s*\}\s*from\s*'react';", "import { useEffect, useRef, useState, useMemo } from 'react';"
    # Memoize mockActivities array
    $out = [Regex]::Replace($out, "const\s+mockActivities\s*=\s*\[(?s:.*?)\];", { param($m)
            $body = $m.Value
            if ($body -match "useMemo\(") { return $body }
            $body = $body -replace "^const\s+mockActivities\s*=\s*\[", "const mockActivities = useMemo(() => ["
            $body = $body -replace ";\s*$", "], []);"
            return $body
        }, [System.Text.RegularExpressions.RegexOptions]::Singleline)
    # Add mockActivities to effect deps
    $out = [Regex]::Replace($out, "useEffect\(\(\)\s*=>\s*\{(?s:.*?)return\s*\(\)\s*=>\s*clearInterval\(interval\);\s*\n\s*\},\s*\[\]\);", { param($m)
            $val = $m.Value
            return ($val -replace "\[\]\);\s*$", "[mockActivities]);")
        }, [System.Text.RegularExpressions.RegexOptions]::Singleline)
    return $out
}

Write-Host "Done. If no errors above, re-run lint in the repo root:" -ForegroundColor Cyan
Write-Host "  cd `"$RepoRoot`"; npm run -s lint" -ForegroundColor Yellow
