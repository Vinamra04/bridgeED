const { GoogleGenerativeAI } = require('@google/generative-ai');
const axios = require('axios');
const { TextToSpeechClient } = require('@google-cloud/text-to-speech');
const fs = require('fs').promises;
const path = require('path');
const apiConfig = require('../../config/apiConfig');

class DynamicExerciseService {
    constructor() {
        this.genAI = new GoogleGenerativeAI(apiConfig.gemini.apiKey);
        this.model = this.genAI.getGenerativeModel({ model: apiConfig.gemini.model });
        this.ttsClient = new TextToSpeechClient({
            apiKey: apiConfig.textToSpeech.apiKey
        });
    }

    async generateDynamicCards(topic, difficulty = 'medium') {
        try {
            const prompt = `Create a dynamic card-based exercise about "${topic}" for users with cognitive disabilities.
                          Include:
                          1. Simple, clear instructions
                          2. 5 sets of matching cards
                          3. Visual descriptions for each card
                          4. Progressive difficulty levels
                          5. Memory aids and hints
                          
                          Format as JSON with structure:
                          {
                              "instructions": "text",
                              "cardSets": [
                                  {
                                      "question": "text",
                                      "cards": [
                                          {
                                              "text": "string",
                                              "isCorrect": boolean,
                                              "visualDescription": "string",
                                              "hint": "string"
                                          }
                                      ],
                                      "difficulty": "string"
                                  }
                              ],
                              "progressiveHints": ["string"]
                          }`;

            const result = await this.model.generateContent(prompt);
            const response = await result.response;
            return JSON.parse(response.text());
        } catch (error) {
            console.error('Error in generateDynamicCards:', error);
            throw new Error('Failed to generate dynamic cards');
        }
    }

    async generateVisualAid(description) {
        try {
            // Use ASL API for sign language content
            if (description.toLowerCase().includes('sign language')) {
                const response = await axios.post('https://api.asl.service/generate', {
                    text: description,
                    ...apiConfig.asl.defaultConfig,
                    apiKey: apiConfig.asl.apiKey
                });
                return response.data.videoUrl;
            }

            // Use DALL-E API for other visual aids
            const response = await axios.post(process.env.DALLE_API_ENDPOINT, {
                prompt: `Create a simple, clear, and engaging visual for cognitive disability support: ${description}`,
                n: 1,
                size: '512x512',
                api_key: process.env.DALLE_API_KEY
            });

            return response.data.data[0].url;
        } catch (error) {
            console.error('Error in generateVisualAid:', error);
            throw new Error('Failed to generate visual aid');
        }
    }

    async textToSpeech(text, outputFileName) {
        try {
            const request = {
                input: { text },
                voice: apiConfig.textToSpeech.defaultVoice,
                audioConfig: {
                    ...apiConfig.textToSpeech.defaultAudioConfig,
                    speakingRate: 0.85 // Slightly slower for cognitive disabilities
                }
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

    async generateInteractiveElements(cardSet) {
        try {
            // Generate visual aids for each card
            const visualAids = await Promise.all(
                cardSet.cards.map(card => this.generateVisualAid(card.visualDescription))
            );

            // Generate audio instructions and hints
            const audioElements = {
                question: await this.textToSpeech(cardSet.question, `question_${Date.now()}.mp3`),
                hints: await Promise.all(
                    cardSet.cards.map((card, i) => 
                        this.textToSpeech(card.hint, `hint_${i}_${Date.now()}.mp3`)
                    )
                )
            };

            return {
                visualAids,
                audioElements
            };
        } catch (error) {
            console.error('Error in generateInteractiveElements:', error);
            throw new Error('Failed to generate interactive elements');
        }
    }

    async generateExercise(topic, difficulty = 'medium') {
        try {
            // Generate base content
            const content = await this.generateDynamicCards(topic, difficulty);

            // Generate interactive elements for each card set
            const interactiveElements = await Promise.all(
                content.cardSets.map(cardSet => this.generateInteractiveElements(cardSet))
            );

            // Generate audio for progressive hints
            const progressiveHintAudio = await Promise.all(
                content.progressiveHints.map((hint, i) => 
                    this.textToSpeech(hint, `progressive_hint_${i}_${Date.now()}.mp3`)
                )
            );

            // Generate main instructions audio
            const instructionsAudio = await this.textToSpeech(
                content.instructions,
                `instructions_${Date.now()}.mp3`
            );

            return {
                content,
                interactiveElements,
                audio: {
                    instructions: instructionsAudio,
                    progressiveHints: progressiveHintAudio
                },
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            console.error('Error in generateExercise:', error);
            throw new Error('Failed to generate exercise');
        }
    }
}

module.exports = new DynamicExerciseService(); 