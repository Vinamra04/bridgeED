const geminiService = require('./geminiService');
const textProcessingService = require('./textProcessingService');
const { spawn } = require('child_process');
const fs = require('fs').promises;
const path = require('path');

class VideoProcessingService {
    async extractFrameDescription(videoPath, timestamp) {
        return new Promise((resolve, reject) => {
            const outputPath = path.join(__dirname, '../../uploads/temp', `frame_${timestamp}.jpg`);
            
            const ffmpeg = spawn('ffmpeg', [
                '-ss', timestamp,
                '-i', videoPath,
                '-vframes', '1',
                '-q:v', '2',
                outputPath
            ]);

            ffmpeg.on('close', async (code) => {
                if (code !== 0) {
                    reject(new Error('Failed to extract frame'));
                    return;
                }

                try {
                    const frameBuffer = await fs.readFile(outputPath);
                    const description = await geminiService.generateVideoDescription(frameBuffer.toString('base64'));
                    await fs.unlink(outputPath); // Clean up the temporary frame
                    resolve(description);
                } catch (error) {
                    reject(error);
                }
            });
        });
    }

    async generateAudioDescription(videoPath, interval = 5) {
        try {
            // Get video duration using ffprobe
            const duration = await this.getVideoDuration(videoPath);
            const descriptions = [];

            // Extract frames and generate descriptions at specified intervals
            for (let time = 0; time < duration; time += interval) {
                const description = await this.extractFrameDescription(videoPath, time);
                descriptions.push({ time, description });
            }

            // Combine descriptions into a narrative
            const narrative = descriptions
                .map(d => `At ${this.formatTime(d.time)}: ${d.description}`)
                .join('\n\n');

            // Convert narrative to speech
            const outputFileName = `video_description_${Date.now()}.mp3`;
            const audioPath = await textProcessingService.textToSpeech(narrative, outputFileName);

            return {
                descriptions,
                narrative,
                audioPath
            };
        } catch (error) {
            console.error('Error in generateAudioDescription:', error);
            throw new Error('Failed to generate audio description');
        }
    }

    async getVideoDuration(videoPath) {
        return new Promise((resolve, reject) => {
            const ffprobe = spawn('ffprobe', [
                '-v', 'error',
                '-show_entries', 'format=duration',
                '-of', 'default=noprint_wrappers=1:nokey=1',
                videoPath
            ]);

            let output = '';
            ffprobe.stdout.on('data', (data) => {
                output += data.toString();
            });

            ffprobe.on('close', (code) => {
                if (code !== 0) {
                    reject(new Error('Failed to get video duration'));
                    return;
                }
                resolve(parseFloat(output));
            });
        });
    }

    formatTime(seconds) {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = Math.floor(seconds % 60);
        return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    }

    async processVideo(videoPath) {
        try {
            const result = await this.generateAudioDescription(videoPath);
            
            return {
                audioDescriptionPath: result.audioPath,
                narrative: result.narrative,
                timecodedDescriptions: result.descriptions
            };
        } catch (error) {
            console.error('Error in processVideo:', error);
            throw new Error('Failed to process video');
        }
    }
}

module.exports = new VideoProcessingService(); 