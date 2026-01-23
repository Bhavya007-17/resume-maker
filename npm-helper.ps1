# npm Helper Script for Windows
# Use this script to run npm commands if npm is not in your PATH

$npmPath = "C:\Program Files\nodejs\npm.cmd"

if (-not (Test-Path $npmPath)) {
    Write-Host "npm not found at: $npmPath" -ForegroundColor Red
    Write-Host "Please install Node.js from https://nodejs.org/" -ForegroundColor Yellow
    exit 1
}

# Run npm with the provided arguments
& $npmPath $args
