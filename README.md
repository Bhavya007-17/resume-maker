# Resume Maker

AI-powered resume builder that intelligently selects and formats content from your LinkedIn profile to create a one-page, ATS-optimized resume based on job descriptions.

## 🚀 Features

- **Multiple Input Methods**: 
  - LinkedIn URL scraping (with fallback options)
  - JSON file upload (LinkedIn data export)
  - **Smart text parser** - Just paste your LinkedIn profile text and it automatically organizes it!
- **AI-Powered Content Selection**: Intelligently selects most relevant content from your full LinkedIn profile
- **One-Page Optimization**: Automatically fits content to exactly one page
- **ATS-Friendly**: Optimized for Applicant Tracking Systems with keyword matching
- **Local Processing**: All data stays on your machine - privacy-focused
- **Multiple Export Formats**: PDF, DOCX, and TXT

## Features

- **LinkedIn Integration**: Upload LinkedIn data via URL scraping, JSON export, or manual input
- **AI-Powered Selection**: Intelligently selects most relevant content from your full LinkedIn profile
- **One-Page Optimization**: Automatically fits content to exactly one page
- **ATS-Friendly**: Optimized for Applicant Tracking Systems with keyword matching
- **Local Processing**: All data stays on your machine - privacy-focused

## Setup

### Prerequisites

- Node.js (v16 or higher)
- npm
- Ollama installed locally ([Download Ollama](https://ollama.ai/))

### Installation

1. Install backend dependencies:
```bash
cd backend

# If npm is in PATH:
npm install

# If npm is NOT in PATH (Windows PowerShell):
& "C:\Program Files\nodejs\npm.cmd" install
```

2. Install Ollama and pull a model:
```bash
# Install Ollama from https://ollama.ai/

# If Ollama is in PATH:
ollama pull llama3

# If Ollama is NOT in PATH (Windows PowerShell):
$env:LOCALAPPDATA\Programs\Ollama\ollama.exe pull llama3
```

3. Start the backend server:
```bash
# If npm is in PATH:
npm start

# If npm is NOT in PATH (Windows PowerShell):
& "C:\Program Files\nodejs\npm.cmd" start

# Server runs on http://localhost:3000
```

4. Open `frontend/index.html` in your browser

## Usage

1. **Input LinkedIn Data**: 
   - Option 1: Paste your LinkedIn profile URL
   - Option 2: Upload LinkedIn data export JSON file
   - Option 3: Manually paste LinkedIn profile sections

2. **Provide Job Description**: Paste the job description you're applying for

3. **Generate Resume**: Click "Generate Resume" - the AI will:
   - Analyze your complete LinkedIn profile
   - Match it against the job description
   - Select only the most relevant experiences and skills
   - Generate ATS-optimized bullet points
   - Format to exactly one page

4. **Export**: Download your resume as PDF, DOCX, or TXT

## Project Structure

```
resume-maker/
├── frontend/          # Frontend HTML/CSS/JS
├── backend/           # Node.js server
└── README.md
```

## Technology Stack

- Frontend: Vanilla JavaScript, HTML5, CSS3
- Backend: Node.js, Express
- AI: Ollama (local)
- Scraping: Puppeteer (requires Chrome browser)
- Export: jsPDF, docx library

## Troubleshooting

### Chrome Browser Required
Puppeteer needs Chrome to scrape LinkedIn. Either:
1. Install Google Chrome browser (recommended), or
2. See `INSTALL_CHROME.md` for Puppeteer Chrome installation

### PowerShell Script Execution
If helper scripts are blocked, use full paths directly or run:
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```
