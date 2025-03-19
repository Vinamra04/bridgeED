const { TextToSpeechClient } = require('@google-cloud/text-to-speech');
const geminiService = require('./geminiService');
const fs = require('fs').promises;
const path = require('path');

class TextProcessingService {
    constructor() {
        this.client = new TextToSpeechClient({
            credentials: JSON.parse(process.env.GOOGLE_CLOUD_CREDENTIALS)
        });
    }

    async textToSpeech(text, outputFileName) {
        try {
            const request = {
                input: { text },
                voice: {
                    languageCode: 'en-US',
                    ssmlGender: 'NEUTRAL',
                    name: 'en-US-Neural2-C' // Using a neural voice for better quality
                },
                audioConfig: {
                    audioEncoding: 'MP3',
                    speakingRate: 1.0,
                    pitch: 0.0,
                    volumeGainDb: 0.0
                }
            };

            const [response] = await this.client.synthesizeSpeech(request);
            const outputPath = path.join(__dirname, '../../uploads/temp', outputFileName);
            await fs.writeFile(outputPath, response.audioContent, 'binary');
            return outputPath;
        } catch (error) {
            console.error('Error in textToSpeech:', error);
            throw new Error('Failed to convert text to speech');
        }
    }

    async processTextFile(text, shouldSimplify = false) {
        try {
            let processedText = text;
            
            if (shouldSimplify) {
                processedText = await geminiService.simplifyAndSummarize(text);
            }

            const outputFileName = `processed_${Date.now()}.mp3`;
            const audioPath = await this.textToSpeech(processedText, outputFileName);
            
            return {
                audioPath,
                processedText,
                simplified: shouldSimplify
            };
        } catch (error) {
            console.error('Error in processTextFile:', error);
            throw new Error('Failed to process text file');
        }
    }
}

module.exports = new TextProcessingService(); 