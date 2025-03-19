const { GoogleGenerativeAI } = require('@google/generative-ai');
const axios = require('axios');
const path = require('path');
const apiConfig = require('../../config/apiConfig');

class VisualExerciseService {
    constructor() {
        this.genAI = new GoogleGenerativeAI(apiConfig.gemini.apiKey);
        this.model = this.genAI.getGenerativeModel({ model: apiConfig.gemini.model });
    }

    async generateDragDropExercise(topic, difficulty = 'medium') {
        try {
            const prompt = `Create a drag-and-drop exercise about "${topic}" for hearing impaired users.
                          Include:
                          1. A clear visual instruction set
                          2. 5 drag-drop pairs with descriptions
                          3. Visual feedback messages
                          4. Difficulty level: ${difficulty}
                          
                          Format as JSON with structure:
                          {
                              "instructions": "text",
                              "pairs": [
                                  {
                                      "draggable": { "text": "string", "description": "string" },
                                      "target": { "text": "string", "description": "string" }
                                  }
                              ],
                              "feedback": {
                                  "correct": "string",
                                  "incorrect": "string"
                              }
                          }`;

            const result = await this.model.generateContent(prompt);
            const response = await result.response;
            return JSON.parse(response.text());
        } catch (error) {
            console.error('Error in generateDragDropExercise:', error);
            throw new Error('Failed to generate drag-drop exercise');
        }
    }

    async generateMultipleChoice(topic, difficulty = 'medium') {
        try {
            const prompt = `Create a visual multiple-choice exercise about "${topic}" for hearing impaired users.
                          Include:
                          1. Clear visual instructions
                          2. 5 questions with 4 options each
                          3. Visual explanations for each option
                          4. Difficulty level: ${difficulty}
                          
                          Format as JSON with structure:
                          {
                              "instructions": "text",
                              "questions": [
                                  {
                                      "question": "text",
                                      "options": [
                                          { "text": "string", "isCorrect": boolean, "explanation": "string" }
                                      ],
                                      "visualHint": "description for an image"
                                  }
                              ]
                          }`;

            const result = await this.model.generateContent(prompt);
            const response = await result.response;
            return JSON.parse(response.text());
        } catch (error) {
            console.error('Error in generateMultipleChoice:', error);
            throw new Error('Failed to generate multiple-choice exercise');
        }
    }

    async generateVisualHints(description) {
        try {
            // Use ASL API for visual hints when appropriate
            if (description.toLowerCase().includes('sign language')) {
                const response = await axios.post('https://api.asl.service/generate', {
                    text: description,
                    ...apiConfig.asl.defaultConfig,
                    apiKey: apiConfig.asl.apiKey
                });
                return response.data.videoUrl;
            }

            // Use DALL-E API for other visual hints
            const response = await axios.post(process.env.DALLE_API_ENDPOINT, {
                prompt: `Create a clear, simple visual representation of: ${description}`,
                n: 1,
                size: '512x512',
                api_key: process.env.DALLE_API_KEY
            });

            return response.data.data[0].url;
        } catch (error) {
            console.error('Error in generateVisualHints:', error);
            throw new Error('Failed to generate visual hints');
        }
    }

    async generateExercise(topic, type = 'drag-drop', difficulty = 'medium') {
        try {
            let content;
            let visualHints = [];

            if (type === 'drag-drop') {
                content = await this.generateDragDropExercise(topic, difficulty);
                // Generate visual hints for each pair
                visualHints = await Promise.all(content.pairs.map(async pair => ({
                    draggable: await this.generateVisualHints(pair.draggable.description),
                    target: await this.generateVisualHints(pair.target.description)
                })));
            } else if (type === 'multiple-choice') {
                content = await this.generateMultipleChoice(topic, difficulty);
                // Generate visual hints for each question
                visualHints = await Promise.all(content.questions.map(async question => ({
                    questionHint: await this.generateVisualHints(question.visualHint),
                    optionHints: await Promise.all(question.options.map(opt => 
                        this.generateVisualHints(opt.explanation)
                    ))
                })));
            }

            return {
                type,
                content,
                visualHints,
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            console.error('Error in generateExercise:', error);
            throw new Error('Failed to generate exercise');
        }
    }
}

module.exports = new VisualExerciseService(); 