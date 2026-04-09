param(
    [switch]$SkipDependencyInstall,
    [switch]$SkipHttpCheck
)

$ErrorActionPreference = "Stop"

$appRoot = Split-Path -Parent $PSScriptRoot
$nodeExe = Join-Path $appRoot "runtime\node\node.exe"
$npmCmd = Join-Path $appRoot "runtime\node\npm.cmd"
$serverJs = Join-Path $appRoot "server.js"

Write-Host "[verify] App root: $appRoot"

if (-not (Test-Path $nodeExe)) {
    throw "Portable runtime missing: $nodeExe"
}
if (-not (Test-Path $npmCmd)) {
    throw "Portable npm missing: $npmCmd"
}
if (-not (Test-Path $serverJs)) {
    throw "server.js missing: $serverJs"
}

Write-Host "[verify] Portable node: $nodeExe"
& $nodeExe -v
Write-Host "[verify] Portable npm: $npmCmd"
& $npmCmd -v

if (-not $SkipDependencyInstall) {
    Write-Host "[verify] Installing dependencies with portable npm"
    Push-Location $appRoot
    try {
        & $npmCmd install
    }
    finally {
        Pop-Location
    }
}

Write-Host "[verify] Running test suite"
Push-Location $appRoot
try {
    & $npmCmd test
    & $npmCmd run verify:migration
}
finally {
    Pop-Location
}

if (-not $SkipHttpCheck) {
    Write-Host "[verify] Starting server for HTTP check"
    Push-Location $appRoot
    try {
        $serverProcess = Start-Process -FilePath $nodeExe -ArgumentList "server.js" -PassThru -WindowStyle Hidden
        Start-Sleep -Seconds 2

        try {
            $response = Invoke-WebRequest -Uri "http://localhost:3000" -UseBasicParsing -TimeoutSec 8
            if ($response.StatusCode -lt 200 -or $response.StatusCode -ge 400) {
                throw "Unexpected status code: $($response.StatusCode)"
            }
            Write-Host "[verify] HTTP check passed: $($response.StatusCode)"
        }
        finally {
            if ($serverProcess -and -not $serverProcess.HasExited) {
                Stop-Process -Id $serverProcess.Id -Force
            }
        }
    }
    finally {
        Pop-Location
    }
}

Write-Host "[verify] Portable runtime verification successful"
