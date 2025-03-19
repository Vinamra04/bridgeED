const { GoogleGenerativeAI } = require('@google/generative-ai');
const { TextToSpeechClient } = require('@google-cloud/text-to-speech');
const fs = require('fs').promises;
const path = require('path');
const apiConfig = require('../../config/apiConfig');

class AudioExerciseService {
    constructor() {
        this.genAI = new GoogleGenerativeAI(apiConfig.gemini.apiKey);
        this.model = this.genAI.getGenerativeModel({ model: apiConfig.gemini.model });
        this.ttsClient = new TextToSpeechClient({
            apiKey: apiConfig.textToSpeech.apiKey
        });
    }

    async generateExerciseContent(topic, difficulty = 'medium') {
        try {
            const prompt = `Create an audio-based exercise for visually impaired users about "${topic}".
                          Include:
                          1. A brief introduction to the topic
                          2. 5 fill-in-the-blank questions
                          3. 5 one-word answer questions
                          4. Clear audio cues for each section
                          
                          Format the response as JSON with the following structure:
                          {
                              "introduction": "text",
                              "fillInBlanks": [
                                  { "question": "text", "answer": "text", "beforeBlank": "text", "afterBlank": "text" }
                              ],
                              "oneWordAnswers": [
                                  { "question": "text", "answer": "text", "hint": "text" }
                              ]
                          }
                          
                          Difficulty level: ${difficulty}`;

            const result = await this.model.generateContent(prompt);
            const response = await result.response;
            return JSON.parse(response.text());
        } catch (error) {
            console.error('Error in generateExerciseContent:', error);
            throw new Error('Failed to generate exercise content');
        }
    }

    async textToSpeech(text, outputFileName) {
        try {
            const request = {
                input: { text },
                voice: apiConfig.textToSpeech.defaultVoice,
                audioConfig: apiConfig.textToSpeech.defaultAudioConfig
            };

            const [response] = await this.ttsClient.synthesizeSpeech(request);
            const outputPath = path.join(__dirname, '../../uploads/temp', outputFileName);
            await fs.writeFile(outputPath, response.audioContent, 'binary');
            return outputPath;
        } catch (error) {
            console.error('Error in textToSpeech:', error);
            throw new Error('Failed to convert text to speech');
        }
    }

    async createAudioCues() {
        try {
            const cues = {
                start: await this.textToSpeech('Exercise starting now. Listen carefully.', 'start_cue.mp3'),
                nextQuestion: await this.textToSpeech('Next question.', 'next_question.mp3'),
                correct: await this.textToSpeech('Correct answer!', 'correct.mp3'),
                incorrect: await this.textToSpeech('Incorrect. Try again.', 'incorrect.mp3'),
                hint: await this.textToSpeech('Here\'s a hint:', 'hint.mp3')
            };
            return cues;
        } catch (error) {
            console.error('Error in createAudioCues:', error);
            throw new Error('Failed to create audio cues');
        }
    }

    async generateExercise(topic, difficulty = 'medium') {
        try {
            const [content, audioCues] = await Promise.all([
                this.generateExerciseContent(topic, difficulty),
                this.createAudioCues()
            ]);

            // Generate audio for all text content
            const audioFiles = {
                introduction: await this.textToSpeech(content.introduction, `intro_${Date.now()}.mp3`),
                fillInBlanks: await Promise.all(content.fillInBlanks.map(async (q, i) => ({
                    ...q,
                    questionAudio: await this.textToSpeech(
                        `Fill in the blank: ${q.beforeBlank} blank ${q.afterBlank}`,
                        `fill_blank_${i}_${Date.now()}.mp3`
                    )
                }))),
                oneWordAnswers: await Promise.all(content.oneWordAnswers.map(async (q, i) => ({
                    ...q,
                    questionAudio: await this.textToSpeech(
                        q.question,
                        `one_word_${i}_${Date.now()}.mp3`
                    ),
                    hintAudio: await this.textToSpeech(
                        q.hint,
                        `hint_${i}_${Date.now()}.mp3`
                    )
                })))
            };

            return {
                content,
                audioFiles,
                audioCues,
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            console.error('Error in generateExercise:', error);
            throw new Error('Failed to generate exercise');
        }
    }
}

module.exports = new AudioExerciseService(); 