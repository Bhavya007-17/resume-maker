# Ollama Helper Script for Windows
# Use this script to run Ollama commands if Ollama is not in your PATH

$ollamaPath = "$env:LOCALAPPDATA\Programs\Ollama\ollama.exe"

if (-not (Test-Path $ollamaPath)) {
    Write-Host "Ollama not found at: $ollamaPath" -ForegroundColor Red
    Write-Host "Please install Ollama from https://ollama.ai/" -ForegroundColor Yellow
    exit 1
}

# Run ollama with the provided arguments
& $ollamaPath $args
