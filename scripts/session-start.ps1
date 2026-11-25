# Bring the working copy up to date and print the session context.
#
# Usage (from the repository root):
#   powershell -File scripts/session-start.ps1
#
# Exit codes: 0 = ready, 1 = a human decision is needed, 2 = no network.

$ErrorActionPreference = 'Continue'
$root = Split-Path -Parent $PSScriptRoot
Push-Location $root

function Write-Step([string]$Text) {
    Write-Host ''
    Write-Host $Text -ForegroundColor Cyan
}

try {
    $remote = git remote
    if (-not $remote) {
        Write-Warning 'No git remote configured. Skipping fetch and pull.'
    }
    else {
        Write-Step 'Fetching origin...'
        git fetch origin
        if ($LASTEXITCODE -ne 0) {
            Write-Warning 'No network: fetch failed. Continue with the local copy.'
            exit 2
        }

        $upstream = git rev-parse --abbrev-ref --symbolic-full-name '@{u}' 2>$null
        if ($LASTEXITCODE -ne 0 -or -not $upstream) {
            Write-Warning 'No upstream branch. Set one with: git push -u origin main'
        }
        else {
            $counts = git rev-list --left-right --count "HEAD...$upstream"
            if ($LASTEXITCODE -eq 0) {
                $parts = $counts -split '\s+'
                $behind = [int]$parts[1]
                if ($behind -gt 0) {
                    $dirty = @(git status --porcelain)
                    if ($dirty.Count -gt 0) {
                        Write-Warning "Local changes and $behind incoming commit(s): pull by hand."
                        git status --short
                        exit 1
                    }
                    Write-Step "Pulling $behind commit(s) from $upstream..."
                    git pull --ff-only
                    if ($LASTEXITCODE -ne 0) {
                        Write-Warning 'Pull refused. Resolve the conflict before working.'
                        exit 1
                    }
                }
            }
        }
    }

    Write-Step 'Working tree'
    $dirty = @(git status --porcelain)
    if ($dirty.Count -gt 0) {
        Write-Warning 'Uncommitted work from a previous session:'
        $dirty | ForEach-Object { Write-Host "  $_" }
    }
    else {
        Write-Host '  clean' -ForegroundColor Green
    }

    Write-Step 'Last commits'
    git log --oneline -7

    Write-Step 'Open tasks (docs/status.md)'
    $status = Join-Path (Join-Path $root 'docs') 'status.md'
    if (Test-Path $status) {
        $tasks = Select-String -Path $status -Pattern '^- \[ \]' -ErrorAction SilentlyContinue
        if ($tasks) { $tasks | ForEach-Object { Write-Host "  $($_.Line)" } }
        else { Write-Warning 'No open tasks found. Read docs/status.md by hand.' }
    }
    else {
        Write-Warning 'docs/status.md not found.'
    }

    Write-Step 'Skills'
    $skills = Get-ChildItem (Join-Path (Join-Path $root '.opencode') 'skills') -Directory -ErrorAction SilentlyContinue
    if ($skills) { $skills | ForEach-Object { Write-Host "  $($_.Name)" } }
    else { Write-Host '  none yet' }

    Write-Step 'Next'
    Write-Host '  Read: docs/status.md, docs/index.md, docs/roadmap.md, docs/architecture.md,'
    Write-Host '        docs/glossary.md, the last three session notes and docs/decisions/.'
    Write-Host '  Then load the skills for today with the skill tool.'
    exit 0
}
finally {
    Pop-Location
}
