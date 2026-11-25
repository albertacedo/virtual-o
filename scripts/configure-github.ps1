# Configure the GitHub repository: Pages, security and branch protection.
#
# Run once per repository, after the first push. Some features are not available on every
# GitHub plan; the script reports what failed instead of hiding it.
#
# Usage (from the repository root):
#   .\scripts\configure-github.ps1
#   .\scripts\configure-github.ps1 -Owner albertacedo -Repository my-project

[CmdletBinding()]
param(
    [string]$Owner,
    [string]$Repository
)

$ErrorActionPreference = 'Continue'
$root = Split-Path -Parent $PSScriptRoot
Push-Location $root

try {
    if (-not (Get-Command gh -ErrorAction SilentlyContinue)) {
        throw 'gh was not found in PATH. Install GitHub CLI first.'
    }

    gh auth status | Out-Null
    if ($LASTEXITCODE -ne 0) {
        throw 'gh is not authenticated. Run: gh auth login'
    }

    if (-not $Owner -or -not $Repository) {
        $remote = git remote get-url origin 2>$null
        if ($remote -match '^https://github\.com/([^/]+)/(.+?)(\.git)?$') {
            if (-not $Owner) { $Owner = $Matches[1] }
            if (-not $Repository) { $Repository = $Matches[2] }
        }
    }

    if (-not $Owner -or -not $Repository) {
        throw 'Could not read the repository from origin. Pass -Owner and -Repository.'
    }

    $repo = "$Owner/$Repository"
    Write-Host "Configuring $repo" -ForegroundColor Cyan

    function Try-Api([string]$Description, [scriptblock]$Action) {
        & $Action | Out-Null
        if ($LASTEXITCODE -eq 0) {
            Write-Host "  ok      $Description" -ForegroundColor Green
        }
        else {
            Write-Warning "  failed  $Description"
        }
    }

    # GitHub Pages, built by the docs workflow.
    Try-Api 'GitHub Pages (workflow build)' {
        gh api --method POST "repos/$repo/pages" -f build_type=workflow
        if ($LASTEXITCODE -ne 0) {
            gh api --method PUT "repos/$repo/pages" -f build_type=workflow
        }
    }

    # Secret scanning and push protection. Public repositories have this for free.
    $security = '{"security_and_analysis":{"secret_scanning":{"status":"enabled"},"secret_scanning_push_protection":{"status":"enabled"}}}'
    Try-Api 'secret scanning and push protection' {
        $security | gh api --method PATCH "repos/$repo" --input -
    }

    # Dependabot alerts and automatic security updates.
    Try-Api 'Dependabot alerts' {
        gh api --method PUT "repos/$repo/vulnerability-alerts"
    }
    Try-Api 'Dependabot security updates' {
        gh api --method PUT "repos/$repo/automated-security-fixes"
    }

    # Branch protection: no force pushes, no deletion, linear history.
    # Status checks are not required because this workflow pushes directly to main;
    # if you move to pull requests, add required_status_checks here.
    $protection = @{
        required_status_checks        = $null
        enforce_admins                = $false
        required_pull_request_reviews = $null
        restrictions                  = $null
        allow_force_pushes            = $false
        allow_deletions               = $false
        required_linear_history       = $true
    } | ConvertTo-Json -Depth 5

    Try-Api 'branch protection on main' {
        $protection | gh api --method PUT "repos/$repo/branches/main/protection" --input -
    }

    Write-Host ''
    Write-Host 'Done. Review any failed line above: it may need a paid plan or a manual setting.' -ForegroundColor Yellow
}
finally {
    Pop-Location
}
