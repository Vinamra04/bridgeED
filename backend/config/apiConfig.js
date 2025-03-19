require('dotenv').config();

const apiConfig = {
    gemini: {
        apiKey: process.env.GEMINI_API_KEY,
        model: 'gemini-pro'
    },
    textToSpeech: {
        apiKey: process.env.TTS_API_KEY,
        defaultVoice: {
            languageCode: 'en-US',
            ssmlGender: 'NEUTRAL',
            name: 'en-US-Neural2-C'
        },
        defaultAudioConfig: {
            audioEncoding: 'MP3',
            speakingRate: 0.9,
            pitch: 0.0,
            volumeGainDb: 2.0
        }
    },
    asl: {
        apiKey: process.env.ASL_API_KEY,
        defaultConfig: {
            format: 'video',
            quality: 'high'
        }
    }
};

module.exports = apiConfig; 