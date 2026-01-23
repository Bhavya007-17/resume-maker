const puppeteer = require('puppeteer');

/**
 * Parse JSON-LD structured data from LinkedIn
 */
function parseJsonLdData(jsonLd) {
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
    
    if (jsonLd.name) {
        data.name = typeof jsonLd.name === 'string' ? jsonLd.name : jsonLd.name['@value'] || '';
    }
    
    if (jsonLd.jobTitle || jsonLd.worksFor) {
        data.headline = jsonLd.jobTitle || (jsonLd.worksFor && jsonLd.worksFor.name) || '';
    }
    
    if (jsonLd.address) {
        data.location = typeof jsonLd.address === 'string' 
            ? jsonLd.address 
            : jsonLd.address.addressLocality || '';
    }
    
    if (jsonLd.description) {
        data.summary = typeof jsonLd.description === 'string' 
            ? jsonLd.description 
            : jsonLd.description['@value'] || '';
    }
    
    return data;
}

/**
 * Scrapes LinkedIn profile data
 * Note: LinkedIn may require authentication. This is a basic implementation.
 */
async function scrapeLinkedInProfile(url) {
    let browser;
    
    try {
        const fs = require('fs');
        const path = require('path');
        const os = require('os');
        
        // Find system Chrome first (more reliable)
        const possibleChromePaths = [
            'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
            'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
            process.env.LOCALAPPDATA + '\\Google\\Chrome\\Application\\chrome.exe'
        ];
        
        let chromePath = null;
        for (const chromePathOption of possibleChromePaths) {
            if (fs.existsSync(chromePathOption)) {
                chromePath = chromePathOption;
                break;
            }
        }
        
        // Set up launch options with permissions and security flags
        // Use headless: 'new' for better compatibility, or false for debugging
        const DEBUG_MODE = process.env.LINKEDIN_DEBUG === 'true';
        let launchOptions = {
            headless: DEBUG_MODE ? false : 'new',
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--disable-gpu',
                '--disable-web-security',
                '--disable-features=IsolateOrigins,site-per-process'
            ],
            ignoreDefaultArgs: ['--disable-extensions'],
            timeout: 30000
        };
        
        // Use system Chrome if found, otherwise let Puppeteer use its bundled Chrome
        if (chromePath) {
            launchOptions.executablePath = chromePath;
        }
        
        // Try to launch browser
        try {
            browser = await puppeteer.launch(launchOptions);
        } catch (launchError) {
            // If permission error, try with user data directory in temp folder
            if (launchError.message.includes('EPERM') || launchError.message.includes('permission')) {
                const userDataDir = path.join(os.tmpdir(), 'puppeteer-chrome-' + Date.now());
                launchOptions.userDataDir = userDataDir;
                
                try {
                    browser = await puppeteer.launch(launchOptions);
                } catch (retryError) {
                    throw new Error(`Permission error launching Chrome. This may be due to:\n1. Antivirus blocking Chrome\n2. Windows security settings\n3. Insufficient permissions\n\nTry using the "Upload JSON" or "Manual Input" options instead of URL scraping.`);
                }
            } else if (launchError.message.includes('Chrome') || launchError.message.includes('not found')) {
                throw new Error('Chrome browser not found. Please either:\n1. Install Chrome browser from https://www.google.com/chrome/\n2. Use the "Upload JSON" or "Manual Input" options instead');
            } else {
                throw launchError;
            }
        }
        
        const page = await browser.newPage();
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
        
        // Navigate to LinkedIn profile
        await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
        
        // Wait for profile content to load
        await page.waitForTimeout(3000);
        
        // Check if we're on a login page or blocked
        const pageTitle = await page.title();
        const pageUrl = page.url();
        if (pageUrl.includes('challenge') || pageUrl.includes('login') || pageTitle.toLowerCase().includes('sign in')) {
            throw new Error('LinkedIn requires authentication. Please use the "Upload JSON" or "Manual Input" tabs instead, or export your LinkedIn data manually.');
        }
        
        // Try to extract from embedded JavaScript data (LinkedIn often embeds data in script tags)
        let profile = await page.evaluate(() => {
            // Look for JSON-LD structured data
            const jsonLdScripts = document.querySelectorAll('script[type="application/ld+json"]');
            for (const script of jsonLdScripts) {
                try {
                    const data = JSON.parse(script.textContent);
                    if (data['@type'] === 'Person' || data['@type'] === 'ProfilePage') {
                        return { type: 'jsonld', data: data };
                    }
                } catch (e) {
                    // Continue to next script
                }
            }
            
            // Look for embedded JSON data in script tags (LinkedIn often uses this)
            const scripts = document.querySelectorAll('script:not([type])');
            for (const script of scripts) {
                const text = script.textContent;
                // Look for common LinkedIn data patterns
                if (text.includes('profile') || text.includes('experience') || text.includes('education')) {
                    // Try to extract JSON objects
                    const jsonMatches = text.match(/\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/g);
                    if (jsonMatches) {
                        for (const match of jsonMatches) {
                            try {
                                const parsed = JSON.parse(match);
                                if (parsed.name || parsed.firstName || parsed.experiences || parsed.positions) {
                                    return { type: 'embedded', data: parsed };
                                }
                            } catch (e) {
                                // Not valid JSON, continue
                            }
                        }
                    }
                }
            }
            
            return null;
        });
        
        // If embedded data found, try to parse it
        if (profile) {
            if (profile.type === 'jsonld') {
                profile = parseJsonLdData(profile.data);
            } else if (profile.type === 'embedded') {
                // Try to normalize embedded data
                let name = profile.data.name || '';
                if (!name && (profile.data.firstName || profile.data.lastName)) {
                    name = [profile.data.firstName, profile.data.lastName].filter(Boolean).join(' ');
                }
                
                profile = {
                    name: name,
                    headline: profile.data.headline || profile.data.jobTitle || '',
                    summary: profile.data.summary || profile.data.about || '',
                    location: profile.data.location || profile.data.locationName || '',
                    experiences: profile.data.experiences || profile.data.positions || profile.data.experience || [],
                    education: profile.data.education || profile.data.educations || [],
                    skills: profile.data.skills || profile.data.skillList || [],
                    certifications: profile.data.certifications || profile.data.certificates || [],
                    projects: profile.data.projects || []
                };
            }
        }
        
        // If we still don't have data, fall back to DOM scraping
        if (!profile || (!profile.name && profile.experiences && profile.experiences.length === 0)) {
            // Fallback to DOM scraping with multiple selector strategies
            profile = await page.evaluate(() => {
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
                
                // Helper function to try multiple selectors
                function trySelectors(selectors) {
                    for (const selector of selectors) {
                        const el = document.querySelector(selector);
                        if (el) {
                            const text = el.textContent.trim();
                            if (text) return text;
                        }
                    }
                    return '';
                }
                
                // Extract name - try multiple strategies
                data.name = trySelectors([
                    'h1.text-heading-xlarge',
                    'h1[data-generated-suggestion-target]',
                    'h1.pv-text-details__left-panel h1',
                    'h1.top-card-layout__title',
                    'h1.break-words',
                    'main h1',
                    'h1'
                ]);
                
                // Extract headline
                data.headline = trySelectors([
                    '.text-body-medium.break-words',
                    '.pv-text-details__left-panel .text-body-medium',
                    '.top-card-layout__headline',
                    '.ph5.pb5 .text-body-medium',
                    '[data-generated-suggestion-target] + .text-body-medium',
                    '.top-card__headline'
                ]);
                
                // Extract location
                data.location = trySelectors([
                    '.text-body-small.inline.t-black--light.break-words',
                    '.pv-text-details__left-panel .text-body-small',
                    '.top-card__subline-item',
                    '.top-card-layout__first-subline',
                    'span[data-test-id="location"]'
                ]);
                
                // Extract summary/about - try multiple approaches
                const aboutSelectors = [
                    '#about ~ .pvs-list',
                    '#about ~ section',
                    '.pv-about-section .pv-about__summary-text',
                    'section[data-section="about"]',
                    '#about ~ .display-flex',
                    '[data-section="about"] .pvs-list__outer-container'
                ];
                
                for (const selector of aboutSelectors) {
                    const aboutEl = document.querySelector(selector);
                    if (aboutEl) {
                        const text = aboutEl.textContent.trim();
                        if (text && text.length > 20) {
                            data.summary = text;
                            break;
                        }
                    }
                }
                
                // Extract experiences - multiple strategies
                const experienceSelectors = [
                    '#experience ~ .pvs-list',
                    'section[data-section="experience"]',
                    '#experience ~ section',
                    '[data-section="experience"] .pvs-list',
                    'section[id*="experience"]'
                ];
                
                for (const sectionSelector of experienceSelectors) {
                    const experienceSection = document.querySelector(sectionSelector);
                    if (experienceSection) {
                        // Try multiple item selectors
                        const itemSelectors = [
                            '.pvs-list__item',
                            '.experience-item',
                            'li.pvs-list__item',
                            '.pvs-entity',
                            '[data-view-name="profile-component-entity"]'
                        ];
                        
                        let items = [];
                        for (const itemSel of itemSelectors) {
                            items = experienceSection.querySelectorAll(itemSel);
                            if (items.length > 0) break;
                        }
                        
                        items.forEach(item => {
                            // Try to extract title
                            const titleSelectors = [
                                '.mr1.t-bold span[aria-hidden="true"]',
                                '.t-bold span[aria-hidden="true"]',
                                '.t-bold span',
                                'span[aria-hidden="true"].t-bold',
                                'h3 span',
                                '.entity-result__title-text span'
                            ];
                            
                            let title = '';
                            for (const sel of titleSelectors) {
                                const el = item.querySelector(sel);
                                if (el) {
                                    title = el.textContent.trim();
                                    if (title) break;
                                }
                            }
                            
                            // Try to extract company
                            const companySelectors = [
                                '.t-14.t-normal span[aria-hidden="true"]',
                                '.t-normal span[aria-hidden="true"]',
                                '.entity-result__primary-subtitle',
                                '.pvs-list__outer-container .t-14.t-normal span'
                            ];
                            
                            let company = '';
                            for (const sel of companySelectors) {
                                const el = item.querySelector(sel);
                                if (el) {
                                    const text = el.textContent.trim();
                                    // Skip if it looks like a date
                                    if (text && !text.match(/^\d{4}|\d+\s+(year|month|day)/i)) {
                                        company = text;
                                        break;
                                    }
                                }
                            }
                            
                            // Try to extract duration
                            const durationSelectors = [
                                '.t-14.t-normal.t-black--light span[aria-hidden="true"]',
                                '.t-black--light span',
                                '.pvs-list__outer-container .t-14.t-normal.t-black--light',
                                '.entity-result__metadata-item'
                            ];
                            
                            let duration = '';
                            for (const sel of durationSelectors) {
                                const el = item.querySelector(sel);
                                if (el) {
                                    duration = el.textContent.trim();
                                    if (duration) break;
                                }
                            }
                            
                            // Extract description/bullets
                            const bullets = [];
                            const bulletSelectors = [
                                '.pvs-list__outer-container ul li',
                                '.description li',
                                '.pvs-list__outer-container .t-14.t-normal span[aria-hidden="true"]'
                            ];
                            
                            for (const sel of bulletSelectors) {
                                const bulletEls = item.querySelectorAll(sel);
                                if (bulletEls.length > 0) {
                                    bulletEls.forEach(bullet => {
                                        const text = bullet.textContent.trim();
                                        if (text && text.length > 10 && !text.match(/^\d{4}/)) {
                                            bullets.push(text);
                                        }
                                    });
                                    if (bullets.length > 0) break;
                                }
                            }
                            
                            if (title || company) {
                                data.experiences.push({
                                    title: title || 'Position',
                                    company: company,
                                    duration: duration,
                                    description: bullets.join(' '),
                                    bullets: bullets
                                });
                            }
                        });
                        
                        if (data.experiences.length > 0) break;
                    }
                }
                
                // Extract education
                const educationSelectors = [
                    '#education ~ .pvs-list',
                    'section[data-section="education"]',
                    '#education ~ section',
                    '[data-section="education"] .pvs-list'
                ];
                
                for (const sectionSelector of educationSelectors) {
                    const educationSection = document.querySelector(sectionSelector);
                    if (educationSection) {
                        const educationItems = educationSection.querySelectorAll('.pvs-list__item, li.pvs-list__item');
                        educationItems.forEach(item => {
                            const degreeEl = item.querySelector('.mr1.t-bold span[aria-hidden="true"], .t-bold span, h3 span');
                            const schoolEl = item.querySelector('.t-14.t-normal span[aria-hidden="true"], .t-normal span');
                            const yearEl = item.querySelector('.t-14.t-normal.t-black--light span[aria-hidden="true"], .t-black--light span');
                            
                            const degree = degreeEl ? degreeEl.textContent.trim() : '';
                            const institution = schoolEl ? schoolEl.textContent.trim() : '';
                            const year = yearEl ? yearEl.textContent.trim() : '';
                            
                            if (degree || institution) {
                                data.education.push({
                                    degree: degree,
                                    institution: institution,
                                    year: year
                                });
                            }
                        });
                        if (data.education.length > 0) break;
                    }
                }
                
                // Extract skills
                const skillsSelectors = [
                    '#skills ~ .pvs-list',
                    'section[data-section="skills"]',
                    '#skills ~ section',
                    '[data-section="skills"] .pvs-list'
                ];
                
                for (const sectionSelector of skillsSelectors) {
                    const skillsSection = document.querySelector(sectionSelector);
                    if (skillsSection) {
                        const skillItems = skillsSection.querySelectorAll('.pvs-list__item, li.pvs-list__item, .skill-category-entity__skill-wrapper');
                        skillItems.forEach(item => {
                            const skillSelectors = [
                                '.mr1.t-bold span[aria-hidden="true"]',
                                '.t-bold span[aria-hidden="true"]',
                                '.t-bold span',
                                'span[aria-hidden="true"]',
                                '.skill-category-entity__skill-title'
                            ];
                            
                            for (const sel of skillSelectors) {
                                const skillEl = item.querySelector(sel);
                                if (skillEl) {
                                    const skillText = skillEl.textContent.trim();
                                    if (skillText && skillText.length > 0 && !data.skills.includes(skillText)) {
                                        data.skills.push(skillText);
                                        break;
                                    }
                                }
                            }
                        });
                        if (data.skills.length > 0) break;
                    }
                }
                
                return data;
            });
        }
        
        // Additional debugging - check what we actually got
        const pageContent = await page.evaluate(() => {
            return {
                title: document.title,
                hasMain: !!document.querySelector('main'),
                hasProfile: !!document.querySelector('h1'),
                bodyText: document.body.textContent.substring(0, 200)
            };
        });
        
        console.log('Page info:', pageContent);
        
        // Validate and normalize the profile data
        if (!profile) {
            profile = {
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
        }
        
        // Ensure all arrays exist
        profile.experiences = profile.experiences || [];
        profile.education = profile.education || [];
        profile.skills = profile.skills || [];
        profile.certifications = profile.certifications || [];
        profile.projects = profile.projects || [];
        
        // Log what we extracted for debugging
        console.log('Extracted LinkedIn data:', {
            name: profile.name || '(empty)',
            headline: profile.headline || '(empty)',
            location: profile.location || '(empty)',
            summaryLength: profile.summary ? profile.summary.length : 0,
            experiencesCount: profile.experiences.length,
            educationCount: profile.education.length,
            skillsCount: profile.skills.length
        });
        
        // Check if we got any meaningful data
        const hasData = profile.name || 
                       profile.headline || 
                       profile.experiences.length > 0 || 
                       profile.education.length > 0 || 
                       profile.skills.length > 0;
        
        if (!hasData) {
            console.warn('⚠️ No data extracted. LinkedIn may require authentication or the page structure has changed.');
        }
        
        return profile;
    } catch (error) {
        console.error('Scraping error:', error);
        throw new Error(`Failed to scrape LinkedIn profile: ${error.message}`);
    } finally {
        if (browser) {
            await browser.close();
        }
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

module.exports = {
    scrapeLinkedInProfile,
    normalizeLinkedInData
};
