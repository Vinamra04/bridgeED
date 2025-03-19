const { GoogleGenerativeAI } = require('@google/generative-ai');

class TextProcessingService {
    constructor() {
        this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        this.model = this.genAI.getGenerativeModel({ model: 'gemini-pro' });
    }

    async summarizeAndExplain(text) {
        try {
            const prompt = `Please provide both a summary and detailed explanation of the following text. 
                          Format the response in two sections:
                          
                          1. Summary (brief overview)
                          2. Detailed Explanation (break down complex concepts, use simple language)
                          
                          Text to process:
                          ${text}`;
            
            const result = await this.model.generateContent(prompt);
            const response = await result.response;
            return {
                processedText: response.text(),
                originalText: text
            };
        } catch (error) {
            console.error('Error in summarizeAndExplain:', error);
            throw new Error('Failed to summarize and explain text');
        }
    }

    async processTextFile(text) {
        try {
            const result = await this.summarizeAndExplain(text);
            return {
                summary: result.processedText,
                originalText: result.originalText,
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            console.error('Error in processTextFile:', error);
            throw new Error('Failed to process text file');
        }
    }
}

module.exports = new TextProcessingService(); 