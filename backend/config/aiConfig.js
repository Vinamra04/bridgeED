const { TextToSpeechClient } = require('@google-cloud/text-to-speech');
const { SpeechClient } = require('@google-cloud/speech');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// Configuration object for all AI services
const aiConfig = {
    // Gemini AI Configuration
    gemini: {
        apiKey: process.env.GEMINI_API_KEY,
        modelName: 'gemini-pro', // Default model
        maxTokens: 2048,
        temperature: 0.7,
        initialize: () => {
            const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
            return genAI.getGenerativeModel({ model: aiConfig.gemini.modelName });
        }
    },

    // Google Cloud Text-to-Speech Configuration
    textToSpeech: {
        credentials: process.env.GOOGLE_CLOUD_CREDENTIALS,
        initialize: () => {
            return new TextToSpeechClient({
                credentials: JSON.parse(process.env.GOOGLE_CLOUD_CREDENTIALS)
            });
        },
        defaultConfig: {
            voice: {
                languageCode: 'en-US',
                ssmlGender: 'NEUTRAL'
            },
            audioConfig: {
                audioEncoding: 'MP3'
            }
        }
    },

    // Google Cloud Speech-to-Text Configuration
    speechToText: {
        credentials: process.env.GOOGLE_CLOUD_CREDENTIALS,
        initialize: () => {
            return new SpeechClient({
                credentials: JSON.parse(process.env.GOOGLE_CLOUD_CREDENTIALS)
            });
        },
        defaultConfig: {
            config: {
                encoding: 'LINEAR16',
                sampleRateHertz: 16000,
                languageCode: 'en-US'
            }
        }
    },

    // Sign Language API Configuration
    signLanguage: {
        apiKey: process.env.SIGN_LANGUAGE_API_KEY,
        apiEndpoint: process.env.SIGN_LANGUAGE_API_ENDPOINT,
        defaultConfig: {
            outputFormat: 'video',
            quality: 'high',
            speed: 1.0
        }
    }
};

module.exports = aiConfig; 