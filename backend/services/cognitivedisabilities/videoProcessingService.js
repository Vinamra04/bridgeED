const { GoogleGenerativeAI } = require('@google/generative-ai');
const { SpeechClient } = require('@google-cloud/speech');
const { spawn } = require('child_process');
const fs = require('fs').promises;
const path = require('path');
const axios = require('axios');

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

    async extractKeyFrames(videoPath, interval = 5) {
        return new Promise((resolve, reject) => {
            const outputDir = path.join(path.dirname(videoPath), 'frames');
            const outputPattern = path.join(outputDir, 'frame_%d.jpg');
            
            // Create frames directory if it doesn't exist
            if (!fs.existsSync(outputDir)) {
                fs.mkdirSync(outputDir, { recursive: true });
            }

            const ffmpeg = spawn('ffmpeg', [
                '-i', videoPath,
                '-vf', `fps=1/${interval}`,
                '-frame_pts', '1',
                outputPattern
            ]);

            ffmpeg.on('close', async (code) => {
                if (code !== 0) {
                    reject(new Error('Failed to extract key frames'));
                    return;
                }
                try {
                    const files = await fs.readdir(outputDir);
                    const frames = files.map(file => path.join(outputDir, file));
                    resolve(frames);
                } catch (error) {
                    reject(error);
                }
            });
        });
    }

    async analyzeFrame(framePath) {
        try {
            const frameBuffer = await fs.readFile(framePath);
            const prompt = `Analyze this video frame and describe what's happening in simple terms.
                          Focus on:
                          - Main actions or events
                          - Important objects or people
                          - Any text or symbols
                          - The overall context
                          
                          Make the description easy to understand for someone with cognitive disabilities.`;
            
            const result = await this.model.generateContent([
                { text: prompt },
                { image: frameBuffer.toString('base64') }
            ]);
            const response = await result.response;
            return response.text();
        } catch (error) {
            console.error('Error in analyzeFrame:', error);
            throw new Error('Failed to analyze frame');
        }
    }

    async generateVisualBreakdown(videoPath) {
        try {
            const frames = await this.extractKeyFrames(videoPath);
            const frameAnalyses = await Promise.all(
                frames.map(frame => this.analyzeFrame(frame))
            );

            // Clean up frames
            await Promise.all(frames.map(frame => fs.unlink(frame)));
            await fs.rmdir(path.dirname(frames[0]));

            return frameAnalyses;
        } catch (error) {
            console.error('Error in generateVisualBreakdown:', error);
            throw new Error('Failed to generate visual breakdown');
        }
    }

    async transcribeAndSimplify(audioBuffer) {
        try {
            const audio = {
                content: audioBuffer.toString('base64')
            };
            
            const config = {
                encoding: 'LINEAR16',
                sampleRateHertz: 16000,
                languageCode: 'en-US',
                enableAutomaticPunctuation: true
            };

            const [response] = await this.speechClient.recognize({ audio, config });
            const transcript = response.results
                .map(result => result.alternatives[0].transcript)
                .join('\n');

            // Simplify the transcript
            const prompt = `Simplify this content for someone with cognitive disabilities:
                          - Break down complex ideas
                          - Use simple language
                          - Highlight key points
                          - Add explanations where needed
                          
                          Content:
                          ${transcript}`;
            
            const result = await this.model.generateContent(prompt);
            const simplified = await result.response;
            
            return {
                original: transcript,
                simplified: simplified.text()
            };
        } catch (error) {
            console.error('Error in transcribeAndSimplify:', error);
            throw new Error('Failed to transcribe and simplify audio');
        }
    }

    async processVideo(videoPath) {
        try {
            // Extract audio and analyze frames in parallel
            const [audioBuffer, visualBreakdown] = await Promise.all([
                this.extractAudio(videoPath),
                this.generateVisualBreakdown(videoPath)
            ]);

            // Process audio content
            const transcription = await this.transcribeAndSimplify(audioBuffer);

            // Generate a comprehensive summary
            const summaryPrompt = `Create a comprehensive but simple summary of this video content:
                                - Main topics and ideas
                                - Step-by-step explanations
                                - Visual descriptions
                                - Key takeaways
                                
                                Content:
                                ${transcription.simplified}
                                
                                Visual Scenes:
                                ${visualBreakdown.join('\n')}`;
            
            const summaryResult = await this.model.generateContent(summaryPrompt);
            const summary = await summaryResult.response;

            return {
                summary: summary.text(),
                transcription,
                visualBreakdown,
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            console.error('Error in processVideo:', error);
            throw new Error('Failed to process video');
        }
    }
}

module.exports = new VideoProcessingService(); 