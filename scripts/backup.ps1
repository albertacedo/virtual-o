# Copy every path in backup.targets into a timestamped folder.
#
# Usage (from the repository root):
#   .\scripts\backup.ps1
#   .\scripts\backup.ps1 -Destination D:\Backups\project
#
# Exit codes: 0 = all targets copied, 1 = at least one target was missing or failed.

[CmdletBinding()]
param(
    [string]$Destination
)

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$targetsFile = Join-Path $root 'backup.targets'

if (-not (Test-Path $targetsFile)) {
    Write-Host 'No backup.targets file: nothing to back up.'
    exit 0
}

$lines = @(Get-Content $targetsFile | Where-Object {
    $_.Trim() -ne '' -and -not $_.Trim().StartsWith('#')
})

if ($lines.Count -eq 0) {
    Write-Host 'backup.targets has no active entries: nothing to back up.'
    exit 0
}

if (-not $Destination) {
    $Destination = Join-Path (Join-Path $root 'Backups') (Get-Date -Format 'yyyy-MM-dd_HHmmssfff')
}
New-Item -ItemType Directory -Path $Destination -Force | Out-Null

$manifest = New-Object System.Collections.Generic.List[string]
$manifest.Add("# Backup $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')")
$manifest.Add('')

$failed = 0
foreach ($entry in $lines) {
    $relative = $entry.Trim()
    $source = if ([System.IO.Path]::IsPathRooted($relative)) { $relative } else { Join-Path $root $relative }

    if (-not (Test-Path $source)) {
        Write-Warning "Missing: $relative"
        $manifest.Add("MISSING $relative")
        $failed++
        continue
    }

    if ([System.IO.Path]::IsPathRooted($relative)) {
        $targetPath = Join-Path $Destination (Split-Path $relative -Leaf)
    }
    else {
        $targetPath = Join-Path $Destination $relative
    }

    $parent = Split-Path $targetPath -Parent
    New-Item -ItemType Directory -Path $parent -Force | Out-Null
    Copy-Item -Path $source -Destination $targetPath -Recurse -Force
    $manifest.Add("OK $relative")
    Write-Host "  copied $relative" -ForegroundColor Green

    if (-not [System.IO.Path]::IsPathRooted($relative)) {
        git check-ignore -q $relative 2>$null
        if ($LASTEXITCODE -eq 1) {
            Write-Warning "Not ignored by Git: $relative. Add it to .gitignore."
            $manifest.Add("WARNING not-ignored $relative")
        }
    }
}

$manifest.Add('')
$manifest.Add("Failed: $failed")
Set-Content -Path (Join-Path $Destination 'manifest.txt') -Value $manifest -Encoding UTF8

Write-Host "Backup written to $Destination" -ForegroundColor Cyan

if ($failed -gt 0) { exit 1 }
exit 0
