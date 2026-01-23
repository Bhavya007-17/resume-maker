# GitHub Repository Setup Instructions

## Step 1: Create GitHub Repository

1. Go to [GitHub](https://github.com) and sign in
2. Click the "+" icon in the top right corner
3. Select "New repository"
4. Repository name: `resume-maker` (or `resume-makere` if you prefer)
5. Description: "AI-powered resume builder that creates one-page, ATS-optimized resumes from LinkedIn profiles"
6. Choose **Public** or **Private** (your choice)
7. **DO NOT** initialize with README, .gitignore, or license (we already have these)
8. Click "Create repository"

## Step 2: Connect Local Repository to GitHub

After creating the repository, GitHub will show you commands. Use these commands in PowerShell:

```powershell
cd "c:\Users\bhavy\OneDrive\Desktop\Resume maker"

# Add the remote repository (replace YOUR_USERNAME with your GitHub username)
git remote add origin https://github.com/YOUR_USERNAME/resume-maker.git

# Or if you prefer SSH:
# git remote add origin git@github.com:YOUR_USERNAME/resume-maker.git

# Push to GitHub
git branch -M main
git push -u origin main
```

## Step 3: Verify

1. Go to your GitHub repository page
2. Verify all files are uploaded
3. Check that sensitive data is not included (node_modules should be excluded by .gitignore)

## Notes

- The `.gitignore` file is already configured to exclude:
  - `node_modules/` directories
  - `.env` files
  - Log files
  - OS-specific files
  - IDE files

- All sensitive data has been removed from the codebase
- Localhost URLs are fine (they're just default dev server addresses)
