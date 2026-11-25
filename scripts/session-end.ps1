# Session close-out helper.
#
# Runs the project checks, backs up local data, commits everything and pushes to main.
# With the GitHub Actions workflow, Pages redeploys on its own.
#
# Usage (from the repository root):
#   .\scripts\session-end.ps1 -Message "Session YYYY-MM-DD: <summary>"
#
# Use -SkipChecks, -SkipBackup or -SkipPush only when you know why.

[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [string]$Message,

    [switch]$SkipChecks,
    [switch]$SkipBackup,
    [switch]$SkipPush
)

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
Push-Location $root

try {
    if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
        throw 'git was not found in PATH.'
    }

    if (-not $SkipChecks) {
        $tasks = Join-Path $root 'tasks.ps1'
        if (Test-Path $tasks) {
            Write-Host 'Running project checks...' -ForegroundColor Cyan
            & powershell -NoProfile -ExecutionPolicy Bypass -File $tasks -Check
            if ($LASTEXITCODE -ne 0) {
                throw 'Project checks failed; do not close the session.'
            }
        }
        else {
            Write-Warning 'tasks.ps1 not found: no checks were run.'
        }
    }

    if (-not $SkipBackup) {
        $backup = Join-Path (Join-Path $root 'scripts') 'backup.ps1'
        if (Test-Path $backup) {
            Write-Host 'Backing up local data...' -ForegroundColor Cyan
            & powershell -NoProfile -ExecutionPolicy Bypass -File $backup
            if ($LASTEXITCODE -ne 0) {
                throw 'Backup failed. Fix it before closing the session.'
            }
        }
    }

    $today = Get-Date -Format 'yyyy-MM-dd'
    $sessionNote = Get-ChildItem (Join-Path (Join-Path $root 'docs') 'sessions') -Filter "$today-*.md" -ErrorAction SilentlyContinue
    if (-not $sessionNote) {
        Write-Warning "No session note for $today in docs/sessions. Did you write it?"
    }

    git add -A
    $staged = @(git diff --cached --name-only)

    if ($staged.Count -eq 0) {
        Write-Host 'Nothing to commit.' -ForegroundColor Yellow
    }
    else {
        if (-not ($staged -contains 'docs/status.md')) {
            Write-Warning 'docs/status.md was not modified. Did you mark the finished tasks and add new ones?'
        }

        git commit -m $Message | Out-Null
        if ($LASTEXITCODE -ne 0) { throw 'git commit failed.' }
        Write-Host "Committed: $Message ($($staged.Count) files)" -ForegroundColor Green
    }

    if (-not $SkipPush) {
        git push
        if ($LASTEXITCODE -ne 0) { throw 'git push failed.' }
        Write-Host 'Pushed to origin.' -ForegroundColor Green
        Write-Host 'Docs: https://albertacedo.github.io/virtual-o/' -ForegroundColor Cyan
    }
}
finally {
    Pop-Location
}
