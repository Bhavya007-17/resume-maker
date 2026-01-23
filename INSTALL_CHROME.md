# Installing Chrome for Puppeteer

Puppeteer needs Chrome browser to scrape LinkedIn profiles. You have two options:

## Option 1: Install Chrome Browser (Recommended)

1. Download and install Google Chrome from: https://www.google.com/chrome/
2. The scraper will automatically detect and use it

## Option 2: Install Chrome via Puppeteer

Run this command in the backend directory:

```powershell
cd backend
& "C:\Program Files\nodejs\npm.cmd" exec -- npx puppeteer browsers install chrome
```

**Note:** This requires Node.js to be in your PATH. If you get an error, you can:
1. Add Node.js to PATH (see SETUP.md), or
2. Use Option 1 above (install Chrome browser directly)

## After Installation

Once Chrome is installed, restart the server and try scraping LinkedIn profiles again.
