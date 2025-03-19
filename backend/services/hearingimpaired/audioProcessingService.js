const { SpeechClient } = require('@google-cloud/speech');
const fs = require('fs').promises;

class AudioProcessingService {
    constructor() {
        this.client = new SpeechClient({
            credentials: JSON.parse(process.env.GOOGLE_CLOUD_CREDENTIALS)
        });
    }

    async generateTranscript(audioBuffer, encoding = 'LINEAR16', sampleRateHertz = 16000) {
        try {
            const audio = {
                content: audioBuffer.toString('base64')
            };
            
            const config = {
                encoding: encoding,
                sampleRateHertz: sampleRateHertz,
                languageCode: 'en-US',
                enableAutomaticPunctuation: true,
                enableWordTimeOffsets: true, // Enable word-level timestamps
                model: 'latest_long'
            };

            const request = {
                audio: audio,
                config: config
            };

            const [response] = await this.client.recognize(request);
            
            // Process results with word-level timing
            const transcriptWithTiming = response.results.map(result => {
                const words = result.alternatives[0].words || [];
                const text = result.alternatives[0].transcript;
                
                return {
                    text,
                    words: words.map(word => ({
                        word: word.word,
                        startTime: word.startTime.seconds + word.startTime.nanos / 1e9,
                        endTime: word.endTime.seconds + word.endTime.nanos / 1e9
                    }))
                };
            });

            return transcriptWithTiming;
        } catch (error) {
            console.error('Error in generateTranscript:', error);
            throw new Error('Failed to generate transcript');
        }
    }

    async generateCaptions(audioBuffer, encoding, sampleRateHertz) {
        try {
            const transcript = await this.generateTranscript(audioBuffer, encoding, sampleRateHertz);
            
            // Convert transcript to SRT format
            let srtContent = '';
            let captionNumber = 1;
            
            transcript.forEach(segment => {
                segment.words.forEach((word, index) => {
                    const startTime = this.formatSRTTime(word.startTime);
                    const endTime = this.formatSRTTime(word.endTime);
                    
                    srtContent += `${captionNumber}\n`;
                    srtContent += `${startTime} --> ${endTime}\n`;
                    srtContent += `${word.word}\n\n`;
                    
                    captionNumber++;
                });
            });

            return {
                srtContent,
                plainTranscript: transcript.map(segment => segment.text).join('\n')
            };
        } catch (error) {
            console.error('Error in generateCaptions:', error);
            throw new Error('Failed to generate captions');
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

    async processAudioFile(audioBuffer, encoding, sampleRateHertz, outputType = 'transcript') {
        try {
            if (outputType === 'transcript') {
                const transcript = await this.generateTranscript(audioBuffer, encoding, sampleRateHertz);
                return {
                    type: 'transcript',
                    content: transcript.map(segment => segment.text).join('\n'),
                    timestamp: new Date().toISOString()
                };
            } else if (outputType === 'captions') {
                const captions = await this.generateCaptions(audioBuffer, encoding, sampleRateHertz);
                return {
                    type: 'captions',
                    srtContent: captions.srtContent,
                    plainTranscript: captions.plainTranscript,
                    timestamp: new Date().toISOString()
                };
            } else {
                throw new Error('Invalid output type specified');
            }
        } catch (error) {
            console.error('Error in processAudioFile:', error);
            throw new Error('Failed to process audio file');
        }
    }
}

module.exports = new AudioProcessingService(); 