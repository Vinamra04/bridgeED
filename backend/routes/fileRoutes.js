const express = require('express');
const router = express.Router();
const multer = require('multer');
const { fileCategories } = require('../utils/fileUtils');
const { uploadFile } = require('../controllers/fileController');

// Configure multer for file upload
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/temp'); // Temporary storage before uploading to Firebase
    },
    filename: (req, file, cb) => {
        cb(null, file.originalname);
    }
});

// File filter function
const fileFilter = (req, file, cb) => {
    const allowedMimes = [
        // Text files
        'text/plain',
        // PDF files
        'application/pdf',
        // Document files
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        // Presentation files
        'application/vnd.ms-powerpoint',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        // Audio files
        'audio/mpeg',
        'audio/wav',
        'audio/ogg',
        'audio/mp4',
        // Video files
        'video/mp4',
        'video/quicktime',
        'video/x-msvideo',
        'video/x-matroska'
    ];

    if (allowedMimes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Invalid file type'), false);
    }
};

const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 100 * 1024 * 1024 // 100MB file size limit
    }
});

// File upload route
router.post('/upload', upload.single('file'), uploadFile);

module.exports = router; 