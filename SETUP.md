# Quick Setup Guide

## Prerequisites

1. **Node.js** (v16 or higher) - [Download](https://nodejs.org/)
2. **Ollama** - [Download](https://ollama.ai/)

## Installation Steps

### 1. Install Ollama and Pull a Model

**If Ollama is in your PATH:**
```bash
ollama pull llama3
```

**If Ollama is NOT in your PATH (Windows):**
```powershell
# Use the full path:
$env:LOCALAPPDATA\Programs\Ollama\ollama.exe pull llama3

# Or use the helper script:
.\ollama-helper.ps1 pull llama3
```

**To add Ollama to PATH (optional):**
1. Open System Properties → Environment Variables
2. Add `%LOCALAPPDATA%\Programs\Ollama` to your PATH
3. Restart your terminal

**Other models you can use:**
```bash
ollama pull mistral      # Smaller, faster
ollama pull codellama    # Code-focused
```

### 2. Install Backend Dependencies

**If npm is in your PATH:**
```bash
cd backend
npm install
```

**If npm is NOT in your PATH (Windows):**
```powershell
cd backend
# Use the full path:
& "C:\Program Files\nodejs\npm.cmd" install

# Or use the helper script:
..\npm-helper.ps1 install
```

**To add Node.js/npm to PATH (optional):**
1. Open System Properties → Environment Variables
2. Add `C:\Program Files\nodejs` to your PATH
3. Restart your terminal

### 3. Start the Server

**If npm is in your PATH:**
```bash
# From the backend directory:
npm start

# Or from the root directory:
npm start
```

**If npm is NOT in your PATH:**
```powershell
# From the backend directory:
& "C:\Program Files\nodejs\npm.cmd" start

# Or use the helper script:
..\npm-helper.ps1 start
```

The server will start on `http://localhost:3000`

### 4. Open the Application

Open your browser and navigate to:
```
http://localhost:3000
```

## Usage

1. **Input LinkedIn Data** (choose one method):
   - **Option A**: Paste your LinkedIn profile URL and click "Fetch Profile"
   - **Option B**: Upload a LinkedIn data export JSON file
   - **Option C**: Manually paste LinkedIn profile data in JSON format

2. **Paste Job Description**: Enter the complete job description

3. **Generate Resume**: Click "Generate Resume" - the AI will:
   - Analyze your complete LinkedIn profile
   - Select only the most relevant content
   - Generate ATS-optimized bullet points
   - Format to exactly one page

4. **Export**: Download as PDF, DOCX, or TXT

## Troubleshooting

### Ollama Connection Error
- Make sure Ollama is running:
  ```powershell
  # If Ollama is in PATH:
  ollama serve
  
  # If Ollama is NOT in PATH (Windows):
  & "$env:LOCALAPPDATA\Programs\Ollama\ollama.exe" serve
  
  # Or use the helper script:
  .\ollama-helper.ps1 serve
  ```
- Verify a model is installed:
  ```powershell
  & "$env:LOCALAPPDATA\Programs\Ollama\ollama.exe" list
  ```
- Check if Ollama is accessible: Open `http://localhost:11434/api/tags` in your browser

### LinkedIn Scraping Issues
- **Chrome not found error**: Puppeteer needs Chrome browser. See `INSTALL_CHROME.md` for installation instructions
- LinkedIn may require authentication - use the JSON export option instead
- Export your LinkedIn data: Settings & Privacy → Data Privacy → Get a copy of your data
- Or manually paste your profile information

### PowerShell Execution Policy Error
If you get "running scripts is disabled" error when using helper scripts:
```powershell
# Run this once to allow scripts (requires admin or user policy change):
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser

# Or use the full path directly instead:
& "$env:LOCALAPPDATA\Programs\Ollama\ollama.exe" serve
```

### Port Already in Use
- Change the port in `backend/server.js` (line 7)
- Update frontend API calls to use the new port

## Notes

- The AI processing may take 1-2 minutes depending on your system
- Ensure you have sufficient RAM for Ollama (models require 4-8GB+)
- For best results, use a recent model like Llama 3 or Mistral
