const axios = require('axios');
const { Document, Packer, Paragraph, TextRun, HeadingLevel } = require('docx');

const OLLAMA_API_URL = 'http://localhost:11434/api/generate';
const DEFAULT_MODEL = 'llama3'; // Change to your preferred model

/**
 * Generate resume using AI (Ollama)
 */
async function generateResume(linkedInData, jobDescription) {
    try {
        // Normalize LinkedIn data
        const profile = normalizeLinkedInData(linkedInData);
        
        // Step 1: Content Selection Phase
        const selectedContent = await selectRelevantContent(profile, jobDescription);
        
        // Step 2: Generate formatted resume (pass original profile for name/contact info)
        const resume = await formatResume(selectedContent, profile, jobDescription);
        
        return resume;
    } catch (error) {
        console.error('Error generating resume:', error);
        throw new Error(`Failed to generate resume: ${error.message}`);
    }
}

/**
 * Step 1: AI selects most relevant content from LinkedIn profile
 */
async function selectRelevantContent(profile, jobDescription) {
    const prompt = `You are an expert resume writer. Given the following LinkedIn profile and job description, select ONLY the most relevant content that should appear on a one-page resume.

LinkedIn Profile:
Name: ${profile.name}
Headline: ${profile.headline}
Summary: ${profile.summary}
Experiences (${profile.experiences.length} total):
${profile.experiences.map((exp, i) => `${i + 1}. ${exp.title} at ${exp.company} (${exp.duration})
   Description: ${exp.description}
   Bullets: ${exp.bullets.join('; ')}`).join('\n')}
Education:
${profile.education.map(edu => `- ${edu.degree} from ${edu.institution} (${edu.year})`).join('\n')}
Skills: ${profile.skills.join(', ')}
Certifications: ${profile.certifications.join(', ')}

Job Description:
${jobDescription}

Your task:
1. Select only the 2-4 most relevant work experiences (prioritize by relevance to job)
2. For each selected experience, choose 2-4 most relevant bullet points
3. Select only job-relevant skills (prioritize by job requirements)
4. Include education (condensed if needed)
5. Include certifications only if highly relevant and space allows

CRITICAL: You MUST respond with ONLY valid JSON. No explanations, no markdown, no code blocks. Just pure JSON.

Respond in this EXACT JSON format (replace placeholders with actual data):
{
  "selectedExperiences": [
    {
      "title": "Job Title",
      "company": "Company Name",
      "duration": "Date Range",
      "selectedBullets": ["bullet1", "bullet2"]
    }
  ],
  "selectedSkills": ["skill1", "skill2"],
  "includeEducation": true,
  "includeCertifications": false,
  "summaryFocus": "brief 2-3 line summary focusing on job relevance"
}

Remember: Return ONLY the JSON object, nothing else.`;

    const response = await callOllama(prompt);
    return parseJSONResponse(response);
}

/**
 * Step 2: Format selected content into ATS-optimized resume
 */
async function formatResume(selectedContent, originalProfile, jobDescription) {
    const prompt = `You are an expert at writing ATS-friendly resumes. Create a one-page resume from the following selected content.

IMPORTANT: Use the EXACT name and information from the LinkedIn profile provided below. Do NOT make up names like "John Doe".

Original LinkedIn Profile:
Name: ${originalProfile.name || 'Not provided'}
Headline: ${originalProfile.headline || 'Not provided'}
Location: ${originalProfile.location || 'Not provided'}

Selected Content:
${JSON.stringify(selectedContent, null, 2)}

Job Description:
${jobDescription}

Requirements:
1. Use the EXACT name from the LinkedIn profile: "${originalProfile.name}". Do NOT create a fake name.
2. Create a professional summary (2-3 lines) that matches the job description, using the headline and summary from the profile
3. For each experience, rewrite bullet points to be:
   - ATS-friendly (use keywords from job description)
   - Quantified (include numbers, percentages, metrics)
   - Action-verb focused (start with strong action verbs)
   - Concise and impactful
4. Format skills to match job requirements
5. Ensure everything fits on exactly one page
6. Use professional, clear language
7. For contact info, use: location from profile (${originalProfile.location || 'Not provided'}) or format as appropriate

CRITICAL: You MUST respond with ONLY valid JSON. No explanations, no markdown, no code blocks. Just pure JSON.

Respond in this EXACT JSON format (replace placeholders with actual data):
{
  "name": "${originalProfile.name}",
  "contact": "location or contact info based on profile",
  "summary": "2-3 line professional summary based on profile headline and job description",
  "experience": [
    {
      "title": "Job Title",
      "company": "Company Name",
      "duration": "Date Range",
      "bullets": ["optimized bullet 1", "optimized bullet 2"]
    }
  ],
  "education": [
    {
      "degree": "Degree Name",
      "institution": "School Name",
      "year": "Year"
    }
  ],
  "skills": ["skill1", "skill2"],
  "certifications": []
}

Remember: Return ONLY the JSON object, nothing else.`;

    const response = await callOllama(prompt);
    const resume = parseJSONResponse(response);
    
    // Ensure we use the actual name from the profile (safeguard against AI making up names)
    if (originalProfile.name && originalProfile.name.trim()) {
        resume.name = originalProfile.name;
    }
    
    // Ensure contact info includes location if available
    if (originalProfile.location && originalProfile.location.trim() && !resume.contact) {
        resume.contact = originalProfile.location;
    }
    
    // Ensure education is included if selectedContent says to include it
    if (selectedContent.includeEducation && originalProfile.education && originalProfile.education.length > 0) {
        // If AI didn't include education, add it from the profile
        if (!resume.education || resume.education.length === 0) {
            resume.education = originalProfile.education.map(edu => ({
                degree: edu.degree || '',
                institution: edu.institution || '',
                year: edu.year || ''
            }));
        }
    }
    
    // Log for debugging (remove in production if needed)
    console.log('Generated resume for:', resume.name);
    console.log('Profile name was:', originalProfile.name);
    
    // Add HTML formatting for preview
    resume.html = formatResumeAsHTML(resume);
    
    return resume;
}

/**
 * Call Ollama API
 */
async function callOllama(prompt, model = DEFAULT_MODEL) {
    try {
        const response = await axios.post(OLLAMA_API_URL, {
            model: model,
            prompt: prompt,
            stream: false,
            options: {
                temperature: 0.7,
                top_p: 0.9
            }
        }, {
            timeout: 120000 // 2 minutes timeout
        });
        
        return response.data.response;
    } catch (error) {
        if (error.code === 'ECONNREFUSED') {
            throw new Error('Ollama is not running. Please start Ollama and ensure a model is installed (e.g., ollama pull llama3)');
        }
        throw new Error(`AI generation failed: ${error.message}`);
    }
}

/**
 * Parse JSON from AI response (handles markdown code blocks and common errors)
 */
function parseJSONResponse(response) {
    // Remove markdown code blocks if present
    let jsonString = response.trim();
    if (jsonString.startsWith('```json')) {
        jsonString = jsonString.replace(/```json\n?/g, '').replace(/```\n?/g, '');
    } else if (jsonString.startsWith('```')) {
        jsonString = jsonString.replace(/```\n?/g, '');
    }
    
    // Remove any leading/trailing text that's not JSON
    const jsonMatch = jsonString.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
        jsonString = jsonMatch[0];
    }
    
    // Fix common JSON issues
    // Replace single quotes with double quotes for property names and string values
    jsonString = jsonString.replace(/'/g, '"');
    
    // Fix unquoted property names (but be careful not to break already valid JSON)
    jsonString = jsonString.replace(/([{,]\s*)([a-zA-Z_][a-zA-Z0-9_]*)\s*:/g, '$1"$2":');
    
    // Fix trailing commas
    jsonString = jsonString.replace(/,(\s*[}\]])/g, '$1');
    
    // Fix comments (remove them)
    jsonString = jsonString.replace(/\/\/.*$/gm, '');
    jsonString = jsonString.replace(/\/\*[\s\S]*?\*\//g, '');
    
    // Check if JSON is incomplete (missing closing braces)
    const openBraces = (jsonString.match(/\{/g) || []).length;
    const closeBraces = (jsonString.match(/\}/g) || []).length;
    const openBrackets = (jsonString.match(/\[/g) || []).length;
    const closeBrackets = (jsonString.match(/\]/g) || []).length;
    
    // Add missing closing brackets/braces if needed
    if (closeBrackets < openBrackets) {
        jsonString += ']'.repeat(openBrackets - closeBrackets);
    }
    if (closeBraces < openBraces) {
        jsonString += '}'.repeat(openBraces - closeBraces);
    }
    
    try {
        return JSON.parse(jsonString);
    } catch (error) {
        console.error('JSON Parse Error:', error.message);
        console.error('Attempted to parse:', jsonString.substring(0, 500));
        
        // Try one more time with more aggressive fixes
        try {
            // Remove any text before first { and after last }
            const firstBrace = jsonString.indexOf('{');
            const lastBrace = jsonString.lastIndexOf('}');
            if (firstBrace !== -1) {
                if (lastBrace !== -1 && lastBrace > firstBrace) {
                    jsonString = jsonString.substring(firstBrace, lastBrace + 1);
                } else {
                    // Missing closing brace, try to add it
                    jsonString = jsonString.substring(firstBrace);
                    // Count braces and add missing ones
                    const openCount = (jsonString.match(/\{/g) || []).length;
                    const closeCount = (jsonString.match(/\}/g) || []).length;
                    if (closeCount < openCount) {
                        jsonString += '}'.repeat(openCount - closeCount);
                    }
                }
                return JSON.parse(jsonString);
            }
        } catch (retryError) {
            console.error('Retry parse also failed:', retryError.message);
            console.error('Full response (first 1000 chars):', response.substring(0, 1000));
        }
        
        throw new Error(`Failed to parse AI response as JSON: ${error.message}. The AI may have returned invalid or incomplete JSON.`);
    }
}

/**
 * Normalize LinkedIn data structure
 */
function normalizeLinkedInData(data) {
    return {
        name: data.name || '',
        headline: data.headline || '',
        summary: data.summary || data.about || '',
        location: data.location || '',
        experiences: data.experiences || data.experience || [],
        education: data.education || [],
        skills: data.skills || [],
        certifications: data.certifications || [],
        projects: data.projects || []
    };
}

/**
 * Format resume as HTML for preview
 */
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

/**
 * Escape HTML
 */
function escapeHtml(text) {
    if (!text) return '';
    const div = { textContent: text };
    return String(text)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

/**
 * Export resume to DOCX
 */
async function exportToDocx(resume) {
    const children = [];
    
    // Name
    if (resume.name) {
        children.push(
            new Paragraph({
                text: resume.name,
                heading: HeadingLevel.HEADING_1
            })
        );
    }
    
    // Contact
    if (resume.contact) {
        children.push(
            new Paragraph({
                text: resume.contact
            })
        );
    }
    
    // Summary
    if (resume.summary) {
        children.push(
            new Paragraph({
                text: 'Professional Summary',
                heading: HeadingLevel.HEADING_2
            }),
            new Paragraph({
                text: resume.summary
            })
        );
    }
    
    // Experience
    if (resume.experience && resume.experience.length > 0) {
        children.push(
            new Paragraph({
                text: 'Professional Experience',
                heading: HeadingLevel.HEADING_2
            })
        );
        
        resume.experience.forEach(exp => {
            const titleText = `${exp.title} - ${exp.company}`;
            children.push(
                new Paragraph({
                    text: titleText,
                    heading: HeadingLevel.HEADING_3
                })
            );
            
            if (exp.duration) {
                children.push(
                    new Paragraph({
                        text: exp.duration,
                        italics: true
                    })
                );
            }
            
            if (exp.bullets && exp.bullets.length > 0) {
                exp.bullets.forEach(bullet => {
                    children.push(
                        new Paragraph({
                            text: `• ${bullet}`,
                            bullet: { level: 0 }
                        })
                    );
                });
            }
        });
    }
    
    // Education
    if (resume.education && resume.education.length > 0) {
        children.push(
            new Paragraph({
                text: 'Education',
                heading: HeadingLevel.HEADING_2
            })
        );
        
        resume.education.forEach(edu => {
            const eduText = `${edu.degree}${edu.institution ? `, ${edu.institution}` : ''}${edu.year ? `, ${edu.year}` : ''}`;
            children.push(
                new Paragraph({
                    text: eduText
                })
            );
        });
    }
    
    // Skills
    if (resume.skills && resume.skills.length > 0) {
        children.push(
            new Paragraph({
                text: 'Skills',
                heading: HeadingLevel.HEADING_2
            }),
            new Paragraph({
                text: resume.skills.join(', ')
            })
        );
    }
    
    // Certifications
    if (resume.certifications && resume.certifications.length > 0) {
        children.push(
            new Paragraph({
                text: 'Certifications',
                heading: HeadingLevel.HEADING_2
            })
        );
        
        resume.certifications.forEach(cert => {
            children.push(
                new Paragraph({
                    text: `• ${cert}`,
                    bullet: { level: 0 }
                })
            );
        });
    }
    
    const doc = new Document({
        sections: [{
            children: children
        }]
    });
    
    const buffer = await Packer.toBuffer(doc);
    return buffer;
}

module.exports = {
    generateResume,
    exportToDocx
};
