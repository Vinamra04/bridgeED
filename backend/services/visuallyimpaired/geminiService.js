const { GoogleGenerativeAI } = require('@google/generative-ai');

class GeminiService {
    constructor() {
        this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        this.model = this.genAI.getGenerativeModel({ model: 'gemini-pro' });
    }

    async simplifyAndSummarize(text) {
        try {
            const prompt = `Please simplify and summarize the following text for a visually impaired person. 
                          Make it clear and concise while maintaining the key information:
                          
                          ${text}`;
            
            const result = await this.model.generateContent(prompt);
            const response = await result.response;
            return response.text();
        } catch (error) {
            console.error('Error in simplifyAndSummarize:', error);
            throw new Error('Failed to simplify and summarize text');
        }
    }

    async generateVideoDescription(videoContext) {
        try {
            const prompt = `Please provide a detailed audio description of this video scene for a visually impaired person.
                          Focus on important visual elements, actions, and context:
                          
                          ${videoContext}`;
            
            const result = await this.model.generateContent(prompt);
            const response = await result.response;
            return response.text();
        } catch (error) {
            console.error('Error in generateVideoDescription:', error);
            throw new Error('Failed to generate video description');
        }
    }
}

module.exports = new GeminiService(); 