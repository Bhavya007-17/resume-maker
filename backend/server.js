const express = require('express');
const cors = require('cors');
const path = require('path');
const scraper = require('./scraper');
const resumeGenerator = require('./resume-generator');

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../frontend')));

// Serve frontend
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// API Routes

// Scrape LinkedIn profile
app.post('/api/scrape-linkedin', async (req, res) => {
    try {
        const { url } = req.body;
        
        if (!url) {
            return res.status(400).json({ 
                success: false, 
                error: 'LinkedIn URL is required' 
            });
        }
        
        const profile = await scraper.scrapeLinkedInProfile(url);
        
        // Log profile data for debugging
        console.log('Scraped profile keys:', Object.keys(profile));
        console.log('Profile has data:', {
            hasName: !!profile.name,
            experiences: profile.experiences?.length || 0,
            education: profile.education?.length || 0,
            skills: profile.skills?.length || 0
        });
        
        res.json({
            success: true,
            profile
        });
    } catch (error) {
        console.error('Error scraping LinkedIn:', error);
        
        // Provide helpful error message
        let errorMessage = error.message || 'Failed to scrape LinkedIn profile';
        
        // Add suggestion for permission errors
        if (errorMessage.includes('EPERM') || errorMessage.includes('permission') || errorMessage.includes('Permission')) {
            errorMessage += '\n\nTip: Use the "Upload JSON" or "Manual Input" tabs as an alternative.';
        }
        
        res.status(500).json({
            success: false,
            error: errorMessage
        });
    }
});

// Generate resume using AI
app.post('/api/generate-resume', async (req, res) => {
    try {
        const { linkedInData, jobDescription } = req.body;
        
        if (!linkedInData) {
            return res.status(400).json({ 
                success: false, 
                error: 'LinkedIn data is required' 
            });
        }
        
        if (!jobDescription) {
            return res.status(400).json({ 
                success: false, 
                error: 'Job description is required' 
            });
        }
        
        const resume = await resumeGenerator.generateResume(linkedInData, jobDescription);
        
        res.json({
            success: true,
            resume
        });
    } catch (error) {
        console.error('Error generating resume:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to generate resume'
        });
    }
});

// Export as DOCX
app.post('/api/export-docx', async (req, res) => {
    try {
        const { resume } = req.body;
        
        if (!resume) {
            return res.status(400).json({ 
                success: false, 
                error: 'Resume data is required' 
            });
        }
        
        const docxBuffer = await resumeGenerator.exportToDocx(resume);
        
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
        res.setHeader('Content-Disposition', 'attachment; filename=resume.docx');
        res.send(docxBuffer);
    } catch (error) {
        console.error('Error exporting DOCX:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to export DOCX'
        });
    }
});

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'Resume Maker API is running' });
});

app.listen(PORT, () => {
    console.log(`Resume Maker server running on http://localhost:${PORT}`);
    console.log(`Open http://localhost:${PORT} in your browser`);
});
