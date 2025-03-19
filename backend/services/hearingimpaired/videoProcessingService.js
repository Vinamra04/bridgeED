const { SpeechClient } = require('@google-cloud/speech');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const axios = require('axios');
const fs = require('fs').promises;
const { spawn } = require('child_process');
const path = require('path');

class VideoProcessingService {
    constructor() {
        this.speechClient = new SpeechClient({
            credentials: JSON.parse(process.env.GOOGLE_CLOUD_CREDENTIALS)
        });
        this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        this.model = this.genAI.getGenerativeModel({ model: 'gemini-pro' });
    }

    async extractAudio(videoPath) {
        return new Promise((resolve, reject) => {
            const outputPath = path.join(path.dirname(videoPath), `audio_${Date.now()}.wav`);
            
            const ffmpeg = spawn('ffmpeg', [
                '-i', videoPath,
                '-vn',
                '-acodec', 'pcm_s16le',
                '-ar', '16000',
                '-ac', '1',
                outputPath
            ]);

            ffmpeg.on('close', async (code) => {
                if (code !== 0) {
                    reject(new Error('Failed to extract audio'));
                    return;
                }
                try {
                    const audioBuffer = await fs.readFile(outputPath);
                    await fs.unlink(outputPath); // Clean up
                    resolve(audioBuffer);
                } catch (error) {
                    reject(error);
                }
            });
        });
    }

    async generateClosedCaptions(videoPath) {
        try {
            const audioBuffer = await this.extractAudio(videoPath);
            
            const audio = {
                content: audioBuffer.toString('base64')
            };
            
            const config = {
                encoding: 'LINEAR16',
                sampleRateHertz: 16000,
                languageCode: 'en-US',
                enableAutomaticPunctuation: true,
                enableWordTimeOffsets: true
            };

            const [response] = await this.speechClient.recognize({ audio, config });
            
            // Generate SRT format captions
            let srtContent = '';
            let captionNumber = 1;
            
            response.results.forEach(result => {
                const words = result.alternatives[0].words;
                words.forEach(word => {
                    const startTime = this.formatSRTTime(
                        word.startTime.seconds + word.startTime.nanos / 1e9
                    );
                    const endTime = this.formatSRTTime(
                        word.endTime.seconds + word.endTime.nanos / 1e9
                    );
                    
                    srtContent += `${captionNumber}\n`;
                    srtContent += `${startTime} --> ${endTime}\n`;
                    srtContent += `${word.word}\n\n`;
                    
                    captionNumber++;
                });
            });

            return {
                srtContent,
                plainTranscript: response.results
                    .map(result => result.alternatives[0].transcript)
                    .join('\n')
            };
        } catch (error) {
            console.error('Error in generateClosedCaptions:', error);
            throw new Error('Failed to generate closed captions');
        }
    }

    async convertToSignLanguage(text) {
        try {
            const response = await axios.post(process.env.SIGN_LANGUAGE_API_ENDPOINT, {
                text,
                apiKey: process.env.SIGN_LANGUAGE_API_KEY,
                format: 'video',
                quality: 'high'
            });

            return response.data.videoUrl;
        } catch (error) {
            console.error('Error in convertToSignLanguage:', error);
            throw new Error('Failed to convert to sign language');
        }
    }

    async summarizeContent(text) {
        try {
            const prompt = `Please provide a clear and concise summary of the following content,
                          making it easily understandable for hearing impaired individuals:
                          
                          ${text}`;
            
            const result = await this.model.generateContent(prompt);
            const response = await result.response;
            return response.text();
        } catch (error) {
            console.error('Error in summarizeContent:', error);
            throw new Error('Failed to summarize content');
        }
    }

    formatSRTTime(seconds) {
        const date = new Date(seconds * 1000);
        const hours = date.getUTCHours().toString().padStart(2, '0');
        const minutes = date.getUTCMinutes().toString().padStart(2, '0');
        const secs = date.getUTCSeconds().toString().padStart(2, '0');
        const ms = date.getUTCMilliseconds().toString().padStart(3, '0');
        
        return `${hours}:${minutes}:${secs},${ms}`;
    }

    async processVideo(videoPath, outputType = 'captions') {
        try {
            switch (outputType) {
                case 'captions': {
                    const captions = await this.generateClosedCaptions(videoPath);
                    return {
                        type: 'captions',
                        srtContent: captions.srtContent,
                        plainTranscript: captions.plainTranscript
                    };
                }
                case 'sign_language': {
                    const captions = await this.generateClosedCaptions(videoPath);
                    const signLanguageUrl = await this.convertToSignLanguage(captions.plainTranscript);
                    return {
                        type: 'sign_language',
                        videoUrl: signLanguageUrl,
                        originalTranscript: captions.plainTranscript
                    };
                }
                case 'summary': {
                    const captions = await this.generateClosedCaptions(videoPath);
                    const summary = await this.summarizeContent(captions.plainTranscript);
                    return {
                        type: 'summary',
                        summary,
                        originalTranscript: captions.plainTranscript
                    };
                }
                default:
                    throw new Error('Invalid output type specified');
            }
        } catch (error) {
            console.error('Error in processVideo:', error);
            throw new Error('Failed to process video');
        }
    }
}

module.exports = new VideoProcessingService(); 