const { SpeechClient } = require('@google-cloud/speech');
const textProcessingService = require('./textProcessingService');
const geminiService = require('./geminiService');
const fs = require('fs').promises;

class AudioProcessingService {
    constructor() {
        this.client = new SpeechClient({
            credentials: JSON.parse(process.env.GOOGLE_CLOUD_CREDENTIALS)
        });
    }

    async speechToText(audioBuffer, encoding = 'LINEAR16', sampleRateHertz = 16000) {
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

            const request = {
                audio: audio,
                config: config
            };

            const [response] = await this.client.recognize(request);
            const transcription = response.results
                .map(result => result.alternatives[0].transcript)
                .join('\n');

            return transcription;
        } catch (error) {
            console.error('Error in speechToText:', error);
            throw new Error('Failed to convert speech to text');
        }
    }

    async processAudioFile(audioBuffer, encoding, sampleRateHertz, shouldSimplify = false) {
        try {
            // Convert audio to text
            const transcription = await this.speechToText(audioBuffer, encoding, sampleRateHertz);
            
            // Process the transcribed text
            let processedText = transcription;
            if (shouldSimplify) {
                processedText = await geminiService.simplifyAndSummarize(transcription);
            }

            // Convert processed text back to speech
            const outputFileName = `processed_audio_${Date.now()}.mp3`;
            const audioPath = await textProcessingService.textToSpeech(processedText, outputFileName);

            return {
                originalTranscription: transcription,
                processedText,
                audioPath,
                simplified: shouldSimplify
            };
        } catch (error) {
            console.error('Error in processAudioFile:', error);
            throw new Error('Failed to process audio file');
        }
    }
}

module.exports = new AudioProcessingService(); 