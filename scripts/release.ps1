# Tag and publish a release.
#
# Usage (from the repository root):
#   .\scripts\release.ps1 -Version 1.2.0
#
# Requires a clean working tree, green checks and a pushed main branch.

[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [string]$Version,

    [switch]$SkipChecks
)

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
Push-Location $root

try {
    if ($Version -notmatch '^\d+\.\d+\.\d+$') {
        throw 'Version must be MAJOR.MINOR.PATCH (for example 1.2.0).'
    }
    $tag = "v$Version"

    $branch = git rev-parse --abbrev-ref HEAD
    if ($branch -ne 'main') {
        throw "Release from main, not from $branch."
    }

    $dirty = @(git status --porcelain)
    if ($dirty.Count -gt 0) {
        throw 'Working tree is not clean. Commit or stash before releasing.'
    }

    if (-not $SkipChecks) {
        & powershell -NoProfile -ExecutionPolicy Bypass -File (Join-Path $root 'tasks.ps1') -Check
        if ($LASTEXITCODE -ne 0) { throw 'Checks failed; release aborted.' }
    }

    git push origin main
    if ($LASTEXITCODE -ne 0) { throw 'Could not push main before tagging.' }

    $existing = git tag --list $tag
    if ($existing) { throw "$tag already exists." }

    git tag -a $tag -m "Release $tag"
    if ($LASTEXITCODE -ne 0) { throw 'Could not create the tag.' }

    git push origin $tag
    if ($LASTEXITCODE -ne 0) { throw 'Could not push the tag.' }

    if (Get-Command gh -ErrorAction SilentlyContinue) {
        gh release create $tag --title $tag --generate-notes
        if ($LASTEXITCODE -ne 0) {
            Write-Warning 'Tag pushed, but the GitHub release failed. Create it by hand.'
        }
    }
    else {
        Write-Warning 'gh not found: tag pushed without a GitHub release.'
    }

    Write-Host "Released $tag" -ForegroundColor Green
}
finally {
    Pop-Location
}
