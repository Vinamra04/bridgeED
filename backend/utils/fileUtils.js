const path = require('path');

const fileCategories = {
    TEXT: ['txt', 'rtf'],
    PDF: ['pdf'],
    DOCUMENT: ['doc', 'docx'],
    PRESENTATION: ['ppt', 'pptx'],
    AUDIO: ['mp3', 'wav', 'ogg', 'm4a'],
    VIDEO: ['mp4', 'mov', 'avi', 'mkv'],
    UNKNOWN: ['unknown']
};

const detectFileCategory = (filename) => {
    const extension = path.extname(filename).toLowerCase().slice(1);
    
    for (const [category, extensions] of Object.entries(fileCategories)) {
        if (extensions.includes(extension)) {
            return category;
        }
    }
    return 'UNKNOWN';
};

const generateUniqueFileName = (originalName) => {
    const timestamp = Date.now();
    const extension = path.extname(originalName);
    const baseName = path.basename(originalName, extension);
    return `${baseName}_${timestamp}${extension}`;
};

module.exports = {
    fileCategories,
    detectFileCategory,
    generateUniqueFileName
}; 