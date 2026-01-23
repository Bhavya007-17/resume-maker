// Export functionality for PDF, DOCX, and TXT

// Get current resume data (from app.js scope or parse from HTML)
function getCurrentResume() {
    // Try to get from app.js scope if available
    if (typeof generatedResume !== 'undefined' && generatedResume) {
        return generatedResume;
    }
    // Otherwise parse from HTML
    return parseResumeFromHTML();
}

// Export as PDF
document.getElementById('export-pdf').addEventListener('click', async () => {
    const resumePreview = document.getElementById('resume-preview');
    
    // Load jsPDF dynamically
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
    document.head.appendChild(script);
    
    script.onload = () => {
        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF({
            orientation: 'portrait',
            unit: 'pt',
            format: 'letter'
        });
        
        // Get HTML content
        const content = resumePreview.innerHTML;
        
        // Convert HTML to text for PDF (simplified)
        const textContent = resumePreview.innerText || resumePreview.textContent;
        const lines = pdf.splitTextToSize(textContent, 500);
        
        let y = 40;
        pdf.setFontSize(24);
        pdf.text('Resume', 40, y);
        y += 30;
        
        pdf.setFontSize(11);
        lines.forEach(line => {
            if (y > 750) {
                pdf.addPage();
                y = 40;
            }
            pdf.text(line, 40, y);
            y += 15;
        });
        
        pdf.save('resume.pdf');
    };
});

// Export as DOCX
document.getElementById('export-docx').addEventListener('click', async () => {
    try {
        const response = await fetch('http://localhost:3000/api/export-docx', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                resume: getCurrentResume()
            })
        });
        
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'resume.docx';
        a.click();
        window.URL.revokeObjectURL(url);
    } catch (error) {
        alert(`Error exporting DOCX: ${error.message}`);
    }
});

// Export as TXT
document.getElementById('export-txt').addEventListener('click', () => {
    const resumePreview = document.getElementById('resume-preview');
    const textContent = resumePreview.innerText || resumePreview.textContent;
    
    const blob = new Blob([textContent], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'resume.txt';
    a.click();
    window.URL.revokeObjectURL(url);
});

// Helper to parse resume from HTML
function parseResumeFromHTML() {
    const preview = document.getElementById('resume-preview');
    const resume = {
        name: preview.querySelector('h1')?.textContent || '',
        summary: '',
        experience: [],
        education: [],
        skills: []
    };
    
    // Parse sections (simplified)
    const sections = preview.querySelectorAll('h2');
    sections.forEach(section => {
        const sectionTitle = section.textContent.toLowerCase();
        const nextSection = section.nextElementSibling;
        
        if (sectionTitle.includes('summary')) {
            resume.summary = nextSection?.textContent || '';
        } else if (sectionTitle.includes('experience')) {
            // Parse experience items
            let current = nextSection;
            while (current && current.tagName !== 'H2') {
                if (current.tagName === 'H3') {
                    const [title, company] = current.textContent.split(' - ');
                    resume.experience.push({
                        title: title?.trim() || '',
                        company: company?.trim() || '',
                        bullets: []
                    });
                } else if (current.tagName === 'UL') {
                    const bullets = Array.from(current.querySelectorAll('li')).map(li => li.textContent);
                    if (resume.experience.length > 0) {
                        resume.experience[resume.experience.length - 1].bullets = bullets;
                    }
                }
                current = current.nextElementSibling;
            }
        }
    });
    
    return resume;
}
