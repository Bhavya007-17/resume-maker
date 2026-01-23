// Main application logic
let linkedInData = null;
let jobDescription = '';
let generatedResume = null;

// Make generatedResume accessible globally for export.js
window.generatedResume = generatedResume;

// Tab switching
document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const tabName = btn.dataset.tab;
        
        // Remove active class from all tabs and contents
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        
        // Add active class to clicked tab and corresponding content
        btn.classList.add('active');
        document.getElementById(`${tabName}-tab`).classList.add('active');
    });
});

// LinkedIn URL fetch
document.getElementById('fetch-linkedin').addEventListener('click', async () => {
    const url = document.getElementById('linkedin-url').value.trim();
    const statusEl = document.getElementById('linkedin-status');
    
    if (!url) {
        showStatus(statusEl, 'Please enter a LinkedIn URL', 'error');
        return;
    }
    
    showStatus(statusEl, 'Fetching LinkedIn profile...', 'info');
    
    try {
        const response = await fetch('http://localhost:3000/api/scrape-linkedin', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ url })
        });
        
        const data = await response.json();
        
        if (data.success) {
            linkedInData = data.profile;
            console.log('LinkedIn data received:', data.profile); // Debug
            
            // Check if we actually got meaningful data
            const hasData = data.profile && (
                data.profile.name ||
                data.profile.headline ||
                (data.profile.experiences && data.profile.experiences.length > 0) ||
                (data.profile.education && data.profile.education.length > 0) ||
                (data.profile.skills && data.profile.skills.length > 0)
            );
            
            if (hasData) {
                showStatus(statusEl, 'LinkedIn profile fetched successfully!', 'success');
                displayLinkedInData(data.profile);
            } else {
                showStatus(statusEl, 'Profile fetched but no data extracted. LinkedIn may require authentication. Try "Upload JSON" or "Manual Input" tabs.', 'error');
                displayLinkedInData(data.profile); // Still show it for debugging
            }
        } else {
            showStatus(statusEl, `Error: ${data.error}`, 'error');
        }
    } catch (error) {
        showStatus(statusEl, `Error fetching profile: ${error.message}`, 'error');
    }
});

// JSON file upload
document.getElementById('json-upload').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    const statusEl = document.getElementById('linkedin-status');
    
    if (!file) return;
    
    try {
        const text = await file.text();
        const parsed = JSON.parse(text);
        
        // Handle LinkedIn export format - might be nested
        if (parsed.Profile && parsed.Profile.length > 0) {
            linkedInData = parsed.Profile[0];
        } else if (parsed.profile) {
            linkedInData = parsed.profile;
        } else {
            linkedInData = parsed;
        }
        
        console.log('Loaded LinkedIn data from file:', linkedInData);
        showStatus(statusEl, 'LinkedIn data loaded successfully!', 'success');
        displayLinkedInData(linkedInData);
    } catch (error) {
        showStatus(statusEl, `Error parsing JSON: ${error.message}`, 'error');
        console.error('JSON parse error:', error);
    }
});

// Intelligent LinkedIn profile text parser
function parseLinkedInText(text) {
    const data = {
        name: '',
        headline: '',
        summary: '',
        location: '',
        experiences: [],
        education: [],
        skills: [],
        certifications: [],
        projects: []
    };
    
    // First, try to parse as JSON
    try {
        const parsed = JSON.parse(text);
        if (parsed.Profile && parsed.Profile.length > 0) {
            return parsed.Profile[0];
        } else if (parsed.profile) {
            return parsed.profile;
        } else if (parsed.name || parsed.experiences || parsed.experience) {
            return parsed;
        }
    } catch (e) {
        // Not JSON, continue with text parsing
    }
    
    // Split into lines for processing
    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    
    let currentSection = '';
    let currentExperience = null;
    let currentEducation = null;
    let inExperience = false;
    let inEducation = false;
    let inSummary = false;
    let summaryLines = [];
    
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const lowerLine = line.toLowerCase();
        
        // Extract name (usually first line or after "Name:")
        if (!data.name && (i < 3 || lowerLine.includes('name:'))) {
            if (lowerLine.includes('name:')) {
                data.name = line.split(':').slice(1).join(':').trim();
            } else if (i === 0 && line.length > 0 && line.length < 100 && 
                      !line.includes('@') && !line.includes('http') && 
                      !line.match(/^\d/) && line.match(/^[A-Z]/)) {
                // First line that looks like a name
                data.name = line;
            }
        }
        
        // Extract headline (often contains job title, "at", "|", or is short descriptive text)
        if (!data.headline && i < 10) {
            if (lowerLine.includes(' at ') || lowerLine.includes(' | ') || 
                lowerLine.includes(' - ') || (line.length < 150 && line.length > 10 && 
                !lowerLine.includes('experience') && !lowerLine.includes('education') && 
                !lowerLine.includes('skill') && !lowerLine.includes('summary') && 
                !lowerLine.includes('about') && !lowerLine.includes('contact') &&
                !lowerLine.includes('location') && !lowerLine.includes('phone') &&
                !lowerLine.includes('email') && line !== data.name)) {
                data.headline = line;
            }
        }
        
        // Extract location
        if (!data.location && (lowerLine.includes('location:') || 
            (line.match(/^[A-Z][a-z]+,\s*[A-Z][a-z]+/) && line.length < 50))) {
            if (lowerLine.includes('location:')) {
                data.location = line.split(':').slice(1).join(':').trim();
            } else {
                data.location = line;
            }
        }
        
        // Detect sections
        if (lowerLine.includes('experience') || lowerLine.includes('work experience') || 
            lowerLine.includes('employment') || lowerLine.includes('positions')) {
            currentSection = 'experience';
            inExperience = true;
            continue;
        }
        
        if (lowerLine.includes('education') || lowerLine.includes('academic')) {
            currentSection = 'education';
            inEducation = true;
            inExperience = false;
            continue;
        }
        
        if (lowerLine.includes('skill') && !lowerLine.includes('experience')) {
            currentSection = 'skills';
            inEducation = false;
            inExperience = false;
            continue;
        }
        
        if (lowerLine.includes('summary') || lowerLine.includes('about') || 
            lowerLine.includes('profile summary')) {
            currentSection = 'summary';
            inSummary = true;
            inExperience = false;
            inEducation = false;
            continue;
        }
        
        if (lowerLine.includes('certification') || lowerLine.includes('certificate')) {
            currentSection = 'certifications';
            continue;
        }
        
        // Parse experience entries
        if (inExperience || currentSection === 'experience') {
            // Look for "Title at Company" format
            if (line.includes(' at ') && !currentExperience) {
                const parts = line.split(' at ');
                if (parts.length >= 2) {
                    if (currentExperience && currentExperience.title) {
                        data.experiences.push(currentExperience);
                    }
                    currentExperience = {
                        title: parts[0].trim(),
                        company: parts.slice(1).join(' at ').trim(),
                        duration: '',
                        description: '',
                        bullets: []
                    };
                    continue;
                }
            }
            
            // Look for job title patterns (standalone title line)
            if (!currentExperience && line.match(/^[A-Z][^•\n]{10,100}$/) && 
                !line.includes('•') && !line.match(/^\d{4}/) && 
                !line.includes(' at ') && !lowerLine.includes('company') &&
                !lowerLine.includes('duration') && line.length < 100) {
                if (currentExperience && currentExperience.title) {
                    data.experiences.push(currentExperience);
                }
                currentExperience = {
                    title: line,
                    company: '',
                    duration: '',
                    description: '',
                    bullets: []
                };
            } else if (currentExperience && line.includes(' at ')) {
                // Extract company from "Title at Company" when we already have title
                const parts = line.split(' at ');
                if (parts.length >= 2) {
                    currentExperience.company = parts.slice(1).join(' at ').trim();
                }
            } else if (currentExperience && (line.includes('Company:') || 
                       lowerLine.includes('company:') || lowerLine.includes('organization:'))) {
                currentExperience.company = line.split(':').slice(1).join(':').trim();
            } else if (currentExperience && (line.match(/^\d{4}/) || 
                       line.match(/\d+\s+(year|month|yr|mo|day)/i) || 
                       line.includes('Present') || line.includes('Current') ||
                       line.match(/\w+\s+\d{4}\s*[-–—]\s*(Present|Current|\d{4})/i) ||
                       line.match(/\d{1,2}\/\d{4}\s*[-–—]\s*(Present|Current|\d{1,2}\/\d{4})/i))) {
                // Date range
                currentExperience.duration = line;
            } else if (currentExperience && (line.startsWith('•') || line.startsWith('-') || 
                       line.startsWith('*') || line.match(/^\d+\./) || line.match(/^[a-z]\)/))) {
                // Bullet point
                const bullet = line.replace(/^[•\-\*\d+\.a-z\)]\s*/, '').trim();
                if (bullet.length > 10 && bullet.length < 500) {
                    currentExperience.bullets.push(bullet);
                }
            } else if (currentExperience && line.length > 20 && line.length < 500 && 
                      !line.includes('http') && !line.match(/^[A-Z][^•\n]{10,80}$/) &&
                      !lowerLine.includes('experience') && !lowerLine.includes('education')) {
                // Description text (paragraph)
                if (currentExperience.description) {
                    currentExperience.description += ' ' + line;
                } else {
                    currentExperience.description = line;
                }
            } else if (currentExperience && line.length > 5 && line.length < 100 &&
                      !line.match(/^\d{4}/) && !line.includes('•') && 
                      !lowerLine.includes('experience') && !lowerLine.includes('education') &&
                      !currentExperience.company) {
                // Might be company name if we don't have one yet
                currentExperience.company = line;
            }
        }
        
        // Parse education entries
        if (inEducation || currentSection === 'education') {
            if (line.match(/^(Bachelor|Master|PhD|Doctorate|Associate|Certificate|Diploma)/i) || 
                line.match(/^[A-Z][a-z]+\s+(of|in|Degree)/i)) {
                if (currentEducation && currentEducation.degree) {
                    data.education.push(currentEducation);
                }
                currentEducation = {
                    degree: line,
                    institution: '',
                    year: ''
                };
            } else if (currentEducation && (line.includes('University') || line.includes('College') || 
                       line.includes('School') || line.includes('Institute'))) {
                currentEducation.institution = line;
            } else if (currentEducation && line.match(/^\d{4}$/)) {
                currentEducation.year = line;
            }
        }
        
        // Parse skills
        if (currentSection === 'skills') {
            // Skills can be comma-separated, bullet points, or one per line
            if (line.includes(',')) {
                const skills = line.split(',').map(s => s.trim()).filter(s => s.length > 0);
                data.skills.push(...skills);
            } else if (line.startsWith('•') || line.startsWith('-') || line.startsWith('*')) {
                const skill = line.replace(/^[•\-\*]\s*/, '').trim();
                if (skill.length > 0 && skill.length < 50) {
                    data.skills.push(skill);
                }
            } else if (line.length > 2 && line.length < 50 && 
                      !line.includes('Experience') && !line.includes('Education') && 
                      !line.includes('Summary') && !line.match(/^\d/)) {
                data.skills.push(line);
            }
        }
        
        // Parse summary
        if (inSummary || currentSection === 'summary') {
            if (line.length > 20 && !line.match(/^[A-Z][^•\n]{10,80}$/) && 
                !lowerLine.includes('experience') && !lowerLine.includes('education')) {
                summaryLines.push(line);
            }
        } else if (!inExperience && !inEducation && currentSection === '' && 
                   line.length > 50 && i > 2 && i < 15 && 
                   !lowerLine.includes('experience') && !lowerLine.includes('education') &&
                   !lowerLine.includes('skill') && !line.match(/^\d{4}/)) {
            // Might be summary text before sections
            summaryLines.push(line);
        }
        
        // Parse certifications
        if (currentSection === 'certifications') {
            if (line.length > 5 && line.length < 200) {
                data.certifications.push(line);
            }
        }
    }
    
    // Add last experience/education if exists
    if (currentExperience && currentExperience.title) {
        data.experiences.push(currentExperience);
    }
    if (currentEducation && currentEducation.degree) {
        data.education.push(currentEducation);
    }
    
    // Combine summary lines
    if (summaryLines.length > 0) {
        data.summary = summaryLines.join(' ').trim();
    }
    
    // Clean up - remove duplicates and empty entries
    data.skills = [...new Set(data.skills.filter(s => s.length > 0 && s.length < 100))];
    data.certifications = data.certifications.filter(c => c.length > 0 && c.length < 200);
    
    // Clean up experience data
    data.experiences = data.experiences.map(exp => {
        if (exp.description && exp.description.length > 500) {
            exp.description = exp.description.substring(0, 500) + '...';
        }
        return exp;
    });
    
    return data;
}

// Manual input - process button
document.getElementById('process-manual-input').addEventListener('click', () => {
    const text = document.getElementById('manual-input').value.trim();
    const statusEl = document.getElementById('linkedin-status');
    
    if (!text) {
        showStatus(statusEl, 'Please paste your LinkedIn profile data', 'error');
        return;
    }
    
    showStatus(statusEl, 'Processing and organizing your profile...', 'info');
    
    try {
        // Parse the text
        linkedInData = parseLinkedInText(text);
        
        console.log('Parsed LinkedIn data:', linkedInData);
        
        // Check if we got meaningful data
        const hasData = linkedInData.name || 
                       linkedInData.headline ||
                       linkedInData.experiences.length > 0 ||
                       linkedInData.education.length > 0 ||
                       linkedInData.skills.length > 0;
        
        if (hasData) {
            showStatus(statusEl, 'Profile organized successfully!', 'success');
            displayLinkedInData(linkedInData);
        } else {
            showStatus(statusEl, 'Could not extract data. Try pasting more complete profile information.', 'error');
            // Still show what we got for debugging
            displayLinkedInData(linkedInData);
        }
    } catch (error) {
        showStatus(statusEl, `Error processing profile: ${error.message}`, 'error');
        console.error('Parse error:', error);
    }
});

// Also allow auto-processing on paste (optional - can be removed if too aggressive)
let pasteTimeout;
document.getElementById('manual-input').addEventListener('paste', () => {
    clearTimeout(pasteTimeout);
    pasteTimeout = setTimeout(() => {
        const text = document.getElementById('manual-input').value.trim();
        if (text.length > 50) {
            // Auto-process if substantial text is pasted
            document.getElementById('process-manual-input').click();
        }
    }, 1000);
});

// Generate Resume button
document.getElementById('generate-resume').addEventListener('click', async () => {
    jobDescription = document.getElementById('job-description').value.trim();
    const statusEl = document.getElementById('generation-status');
    
    if (!linkedInData) {
        showStatus(statusEl, 'Please provide LinkedIn data first', 'error');
        return;
    }
    
    if (!jobDescription) {
        showStatus(statusEl, 'Please provide a job description', 'error');
        return;
    }
    
    showStatus(statusEl, 'Generating resume with AI... This may take a minute.', 'info');
    document.getElementById('generate-resume').disabled = true;
    
    try {
        generatedResume = await generateResume(linkedInData, jobDescription);
        
        if (generatedResume) {
            window.generatedResume = generatedResume; // Update global reference
            displayResume(generatedResume);
            document.getElementById('resume-section').style.display = 'block';
            showStatus(statusEl, 'Resume generated successfully!', 'success');
        } else {
            showStatus(statusEl, 'Failed to generate resume', 'error');
        }
    } catch (error) {
        showStatus(statusEl, `Error: ${error.message}`, 'error');
    } finally {
        document.getElementById('generate-resume').disabled = false;
    }
});

// Regenerate button
document.getElementById('regenerate-btn').addEventListener('click', () => {
    document.getElementById('generate-resume').click();
});

// Helper function to show status messages
function showStatus(element, message, type) {
    element.textContent = message;
    element.className = `status-message show ${type}`;
    setTimeout(() => {
        element.classList.remove('show');
    }, 5000);
}

// Display generated resume
function displayResume(resume) {
    const preview = document.getElementById('resume-preview');
    preview.innerHTML = resume.html || formatResumeAsHTML(resume);
    
    // Update page indicator
    const pageLength = calculatePageLength(preview);
    document.getElementById('page-length').textContent = `${pageLength} page${pageLength !== 1 ? 's' : ''}`;
}

// Format resume object as HTML
function formatResumeAsHTML(resume) {
    let html = '';
    
    if (resume.name) {
        html += `<h1>${escapeHtml(resume.name)}</h1>`;
    }
    
    if (resume.contact) {
        html += `<p>${escapeHtml(resume.contact)}</p>`;
    }
    
    if (resume.summary) {
        html += `<h2>Professional Summary</h2><p>${escapeHtml(resume.summary)}</p>`;
    }
    
    if (resume.experience && resume.experience.length > 0) {
        html += `<h2>Professional Experience</h2>`;
        resume.experience.forEach(exp => {
            html += `<h3>${escapeHtml(exp.title)} - ${escapeHtml(exp.company)}</h3>`;
            if (exp.duration) {
                html += `<p><em>${escapeHtml(exp.duration)}</em></p>`;
            }
            if (exp.bullets && exp.bullets.length > 0) {
                html += `<ul>`;
                exp.bullets.forEach(bullet => {
                    html += `<li>${escapeHtml(bullet)}</li>`;
                });
                html += `</ul>`;
            }
        });
    }
    
    if (resume.education && resume.education.length > 0) {
        html += `<h2>Education</h2>`;
        resume.education.forEach(edu => {
            html += `<h3>${escapeHtml(edu.degree)}</h3>`;
            if (edu.institution) {
                html += `<p>${escapeHtml(edu.institution)}${edu.year ? `, ${edu.year}` : ''}</p>`;
            }
        });
    }
    
    if (resume.skills && resume.skills.length > 0) {
        html += `<h2>Skills</h2><p>${escapeHtml(resume.skills.join(', '))}</p>`;
    }
    
    if (resume.certifications && resume.certifications.length > 0) {
        html += `<h2>Certifications</h2><ul>`;
        resume.certifications.forEach(cert => {
            html += `<li>${escapeHtml(cert)}</li>`;
        });
        html += `</ul>`;
    }
    
    return html;
}

// Calculate page length (rough estimate)
function calculatePageLength(element) {
    const height = element.scrollHeight;
    const pageHeight = 1056; // Standard 8.5x11" page at 96 DPI
    return Math.ceil(height / pageHeight);
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Display LinkedIn data in a formatted preview
function displayLinkedInData(data) {
    console.log('Displaying LinkedIn data:', data); // Debug log
    
    const previewSection = document.getElementById('linkedin-preview-section');
    const preview = document.getElementById('linkedin-preview');
    
    if (!data || (typeof data === 'object' && Object.keys(data).length === 0)) {
        console.log('No data to display');
        previewSection.style.display = 'none';
        return;
    }
    
    // Normalize data structure - handle various formats
    const profile = {
        name: data.name || data.fullName || '',
        headline: data.headline || data.headlineText || '',
        summary: data.summary || data.about || data.aboutSection || '',
        location: data.location || data.locationName || '',
        experiences: data.experiences || data.experience || data.positions || [],
        education: data.education || data.educations || [],
        skills: data.skills || data.skillList || [],
        certifications: data.certifications || data.certificates || [],
        projects: data.projects || []
    };
    
    console.log('Normalized profile:', profile); // Debug log
    
    let html = '';
    let hasData = false;
    
    // Name and Headline
    if (profile.name && profile.name.trim()) {
        html += `<div class="preview-item"><strong>Name:</strong> ${escapeHtml(profile.name)}</div>`;
        hasData = true;
    }
    if (profile.headline && profile.headline.trim()) {
        html += `<div class="preview-item"><strong>Headline:</strong> ${escapeHtml(profile.headline)}</div>`;
        hasData = true;
    }
    if (profile.location && profile.location.trim()) {
        html += `<div class="preview-item"><strong>Location:</strong> ${escapeHtml(profile.location)}</div>`;
        hasData = true;
    }
    if (profile.summary && profile.summary.trim()) {
        const summaryText = profile.summary.length > 200 ? profile.summary.substring(0, 200) + '...' : profile.summary;
        html += `<div class="preview-item"><strong>Summary:</strong> ${escapeHtml(summaryText)}</div>`;
        hasData = true;
    }
    
    // Experiences
    if (profile.experiences && Array.isArray(profile.experiences) && profile.experiences.length > 0) {
        html += `<div class="preview-section"><strong>Experiences (${profile.experiences.length}):</strong><ul>`;
        profile.experiences.forEach((exp, i) => {
            const title = exp.title || exp.positionTitle || exp.jobTitle || 'N/A';
            const company = exp.company || exp.companyName || '';
            const duration = exp.duration || exp.dateRange || exp.timePeriod || '';
            
            html += `<li><strong>${i + 1}. ${escapeHtml(title)}</strong>`;
            if (company) {
                html += ` at ${escapeHtml(company)}`;
            }
            if (duration) {
                html += ` (${escapeHtml(duration)})`;
            }
            html += `</li>`;
            
            if (exp.bullets && Array.isArray(exp.bullets) && exp.bullets.length > 0) {
                html += `<ul>`;
                exp.bullets.slice(0, 2).forEach(bullet => {
                    if (bullet && bullet.trim()) {
                        html += `<li>${escapeHtml(bullet)}</li>`;
                    }
                });
                if (exp.bullets.length > 2) {
                    html += `<li><em>...and ${exp.bullets.length - 2} more</em></li>`;
                }
                html += `</ul>`;
            } else if (exp.description && exp.description.trim()) {
                html += `<ul><li>${escapeHtml(exp.description.substring(0, 100))}${exp.description.length > 100 ? '...' : ''}</li></ul>`;
            }
        });
        html += `</ul></div>`;
        hasData = true;
    }
    
    // Education
    if (profile.education && Array.isArray(profile.education) && profile.education.length > 0) {
        html += `<div class="preview-section"><strong>Education (${profile.education.length}):</strong><ul>`;
        profile.education.forEach(edu => {
            const degree = edu.degree || edu.degreeName || edu.fieldOfStudy || 'N/A';
            const institution = edu.institution || edu.schoolName || edu.school || '';
            const year = edu.year || edu.graduationYear || '';
            
            html += `<li>${escapeHtml(degree)}`;
            if (institution) {
                html += ` from ${escapeHtml(institution)}`;
            }
            if (year) {
                html += ` (${escapeHtml(year)})`;
            }
            html += `</li>`;
        });
        html += `</ul></div>`;
        hasData = true;
    }
    
    // Skills
    if (profile.skills && Array.isArray(profile.skills) && profile.skills.length > 0) {
        html += `<div class="preview-section"><strong>Skills (${profile.skills.length}):</strong><div class="skills-container">`;
        const skillsToShow = profile.skills.slice(0, 20);
        skillsToShow.forEach(skill => {
            const skillName = typeof skill === 'string' ? skill : (skill.name || skill.skillName || String(skill));
            if (skillName && skillName.trim()) {
                html += `<span class="skill-tag">${escapeHtml(skillName)}</span>`;
            }
        });
        if (profile.skills.length > 20) {
            html += ` <span class="skill-more">...and ${profile.skills.length - 20} more</span>`;
        }
        html += `</div></div>`;
        hasData = true;
    }
    
    // Certifications
    if (profile.certifications && Array.isArray(profile.certifications) && profile.certifications.length > 0) {
        html += `<div class="preview-section"><strong>Certifications (${profile.certifications.length}):</strong><ul>`;
        profile.certifications.forEach(cert => {
            const certName = typeof cert === 'string' ? cert : (cert.name || cert.certificationName || JSON.stringify(cert));
            html += `<li>${escapeHtml(certName)}</li>`;
        });
        html += `</ul></div>`;
        hasData = true;
    }
    
    // Projects
    if (profile.projects && Array.isArray(profile.projects) && profile.projects.length > 0) {
        html += `<div class="preview-section"><strong>Projects (${profile.projects.length}):</strong><ul>`;
        profile.projects.forEach(project => {
            const projectName = project.name || project.title || project.projectName || JSON.stringify(project);
            html += `<li>${escapeHtml(projectName)}</li>`;
        });
        html += `</ul></div>`;
        hasData = true;
    }
    
    // If no data found, show a message with raw data for debugging
    if (!hasData) {
        html = `<div class="preview-item" style="color: #6c757d;">
            <p style="font-weight: 600; margin-bottom: 10px;">⚠️ No structured data found in the LinkedIn profile.</p>
            <p style="margin-bottom: 10px;">This could mean:</p>
            <ul style="margin-left: 20px; margin-bottom: 15px;">
                <li>LinkedIn scraping requires authentication (try "Upload JSON" or "Manual Input" tabs)</li>
                <li>The profile structure doesn't match expected format</li>
                <li>The scraper couldn't extract data from the page</li>
            </ul>
            <details style="margin-top: 10px;">
                <summary style="cursor: pointer; color: #667eea; font-weight: 600;">🔍 View Raw Data (for debugging)</summary>
                <pre style="background: #f8f9fa; padding: 15px; border-radius: 4px; overflow-x: auto; font-size: 0.85em; margin-top: 10px; max-height: 300px; overflow-y: auto;">${escapeHtml(JSON.stringify(data, null, 2))}</pre>
            </details>
        </div>`;
        hasData = true; // Show the section even if empty, so user can see the message
    }
    
    preview.innerHTML = html;
    previewSection.style.display = 'block';
    
    // Scroll to preview section
    previewSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}
