const { SpeechClient } = require('@google-cloud/speech');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs').promises;

class AudioProcessingService {
    constructor() {
        this.speechClient = new SpeechClient({
            credentials: JSON.parse(process.env.GOOGLE_CLOUD_CREDENTIALS)
        });
        this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        this.model = this.genAI.getGenerativeModel({ model: 'gemini-pro' });
    }

    async transcribeAudio(audioBuffer, encoding = 'LINEAR16', sampleRateHertz = 16000) {
        try {
            const audio = {
                content: audioBuffer.toString('base64')
            };
            
            const config = {
                encoding: encoding,
                sampleRateHertz: sampleRateHertz,
                languageCode: 'en-US',
                enableAutomaticPunctuation: true,
                model: 'latest_long'
            };

            const [response] = await this.speechClient.recognize({ audio, config });
            return response.results
                .map(result => result.alternatives[0].transcript)
                .join('\n');
        } catch (error) {
            console.error('Error in transcribeAudio:', error);
            throw new Error('Failed to transcribe audio');
        }
    }

    async simplifyTranscript(transcript) {
        try {
            const prompt = `Please simplify this transcript for someone with cognitive disabilities:
                          - Break it into clear, simple sections
                          - Use simple language
                          - Highlight key points
                          - Add explanations for complex terms
                          
                          Transcript:
                          ${transcript}`;
            
            const result = await this.model.generateContent(prompt);
            const response = await result.response;
            return response.text();
        } catch (error) {
            console.error('Error in simplifyTranscript:', error);
            throw new Error('Failed to simplify transcript');
        }
    }

    async extractKeyPoints(transcript) {
        try {
            const prompt = `Please extract and explain the key points from this transcript:
                          - List the most important ideas
                          - Explain each point in simple terms
                          - Add real-world examples where helpful
                          - Organize points by topic
                          
                          Transcript:
                          ${transcript}`;
            
            const result = await this.model.generateContent(prompt);
            const response = await result.response;
            return response.text();
        } catch (error) {
            console.error('Error in extractKeyPoints:', error);
            throw new Error('Failed to extract key points');
        }
    }

    async generateFocusGuide(transcript) {
        try {
            const prompt = `Create a focus guide for this content:
                          - Identify main topics and subtopics
                          - Create study questions
                          - Suggest memory aids
                          - Add visual learning cues (describe them)
                          
                          Content:
                          ${transcript}`;
            
            const result = await this.model.generateContent(prompt);
            const response = await result.response;
            return response.text();
        } catch (error) {
            console.error('Error in generateFocusGuide:', error);
            throw new Error('Failed to generate focus guide');
        }
    }

    async processAudioFile(audioBuffer, encoding, sampleRateHertz) {
        try {
            // First get the transcript
            const transcript = await this.transcribeAudio(audioBuffer, encoding, sampleRateHertz);
            
            // Process transcript in parallel
            const [
                simplifiedTranscript,
                keyPoints,
                focusGuide
            ] = await Promise.all([
                this.simplifyTranscript(transcript),
                this.extractKeyPoints(transcript),
                this.generateFocusGuide(transcript)
            ]);

            return {
                originalTranscript: transcript,
                simplifiedTranscript,
                keyPoints,
                focusGuide,
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            console.error('Error in processAudioFile:', error);
            throw new Error('Failed to process audio file');
        }
    }
}

module.exports = new AudioProcessingService(); 