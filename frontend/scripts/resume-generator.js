// Resume generation using AI
async function generateResume(linkedInData, jobDescription) {
    try {
        const response = await fetch('http://localhost:3000/api/generate-resume', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                linkedInData,
                jobDescription
            })
        });
        
        if (!response.ok) {
            throw new Error(`Server error: ${response.statusText}`);
        }
        
        const data = await response.json();
        return data.resume;
    } catch (error) {
        console.error('Error generating resume:', error);
        throw error;
    }
}
