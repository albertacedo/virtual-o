# One entry point for the checks and the documentation preview.
#
# Usage (from the repository root):
#   ./tasks.ps1 -Check                  # docs + whatever the project has
#   ./tasks.ps1 -Check -SkipDocs        # project checks only (used by CI after the docs job)
#   ./tasks.ps1 -Check -AuditSkills     # also compare external skills with upstream
#   ./tasks.ps1 -Serve                  # local documentation preview
#
# The script detects the stack: .NET solutions, package.json, tests/ and Unity projects.

[CmdletBinding()]
param(
    [switch]$Check,
    [switch]$Serve,
    [switch]$CI,
    [switch]$SkipDocs,
    [switch]$AuditSkills
)

$ErrorActionPreference = 'Stop'
$root = $PSScriptRoot
Push-Location $root

$failures = New-Object System.Collections.Generic.List[string]

function Test-Command([string]$Name) {
    return [bool](Get-Command $Name -ErrorAction SilentlyContinue)
}

function Invoke-Check([string]$Name, [scriptblock]$Action) {
    Write-Host ''
    Write-Host "== $Name ==" -ForegroundColor Cyan
    & $Action
    if ($null -ne $LASTEXITCODE -and $LASTEXITCODE -ne 0) {
        $script:failures.Add($Name)
    }
}

try {
    if ($Serve) {
        if (-not (Test-Command python)) {
            throw 'python not found. Install the dependencies with: python -m pip install -r requirements.txt'
        }
        & python -m mkdocs serve
        exit $LASTEXITCODE
    }

    if (-not $Check) {
        Write-Host 'Usage:'
        Write-Host '  ./tasks.ps1 -Check [-SkipDocs] [-AuditSkills] [-CI]'
        Write-Host '  ./tasks.ps1 -Serve'
        exit 0
    }

    if ($CI) { $env:CI = 'true' }

    if (-not $SkipDocs) {
        if (-not (Test-Command python)) {
            throw 'python not found. Install the dependencies with: python -m pip install -r requirements.txt'
        }
        Invoke-Check 'docs (mkdocs build --strict)' { & python -m mkdocs build --strict }
    }

    # .NET
    $solutions = @()
    $solutions += @(Get-ChildItem -Path $root -Filter '*.sln' -File -ErrorAction SilentlyContinue)
    $solutions += @(Get-ChildItem -Path $root -Filter '*.slnx' -File -ErrorAction SilentlyContinue)
    if ($solutions.Count -gt 0) {
        if (Test-Command dotnet) {
            Invoke-Check 'dotnet build' { & dotnet build --nologo --verbosity quiet }
            $testProjects = @(Get-ChildItem -Path $root -Recurse -Filter '*Tests.csproj' -File -ErrorAction SilentlyContinue)
            if ($testProjects.Count -gt 0) {
                Invoke-Check 'dotnet test' { & dotnet test --nologo --verbosity quiet }
            }
        }
        else {
            Write-Warning 'Solution found but dotnet is not installed: skipped.'
        }
    }

    # Node
    if (Test-Path (Join-Path $root 'package.json')) {
        if (Test-Command npm) {
            if (Test-Path (Join-Path $root 'package-lock.json')) {
                Invoke-Check 'npm ci' { & npm ci }
            }
            Invoke-Check 'npm test' { & npm test --if-present }
            Invoke-Check 'npm run lint' { & npm run lint --if-present }
        }
        else {
            Write-Warning 'package.json found but npm is not installed: skipped.'
        }
    }

    # Python tests
    if (Test-Path (Join-Path $root 'tests')) {
        if (Test-Command python) {
            Invoke-Check 'pytest' { & python -m pytest -q }
        }
    }

    # Unity
    if ((Test-Path (Join-Path (Join-Path $root 'ProjectSettings') 'ProjectVersion.txt')) -and ($env:OS -eq 'Windows_NT')) {
        $compileCheck = Join-Path (Join-Path $root 'tools') 'compile-check.ps1'
        if (Test-Path $compileCheck) {
            Invoke-Check 'unity compile check' {
                & powershell -NoProfile -ExecutionPolicy Bypass -File $compileCheck
            }
        }
        else {
            Write-Warning 'Unity project found but tools/compile-check.ps1 is missing: skipped.'
        }
    }

    if ($AuditSkills) {
        $skillsCheck = Join-Path (Join-Path $root 'tools') 'skills-check.ps1'
        if (Test-Path $skillsCheck) {
            Invoke-Check 'skills audit' {
                & powershell -NoProfile -ExecutionPolicy Bypass -File $skillsCheck
            }
        }
    }

    Write-Host ''
    if ($failures.Count -gt 0) {
        Write-Host "FAILED: $($failures -join ', ')" -ForegroundColor Red
        exit 1
    }

    Write-Host 'All checks passed.' -ForegroundColor Green
    exit 0
}
finally {
    Pop-Location
}
