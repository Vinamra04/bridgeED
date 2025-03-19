const firebaseConfig = require('../config/firebaseConfig');
const { detectFileCategory, generateUniqueFileName } = require('../utils/fileUtils');
const path = require('path');
const fs = require('fs');

const bucket = firebaseConfig.initialize();

const uploadFile = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const file = req.file;
        const fileCategory = detectFileCategory(file.originalname);
        const uniqueFileName = generateUniqueFileName(file.originalname);
        
        // Create the file path in Firebase Storage based on category
        const storagePath = `uploads/${fileCategory.toLowerCase()}/${uniqueFileName}`;
        
        // Upload file to Firebase Storage
        await bucket.upload(file.path, {
            destination: storagePath,
            metadata: {
                contentType: file.mimetype,
                metadata: {
                    originalName: file.originalname,
                    category: fileCategory,
                    uploadedAt: new Date().toISOString()
                }
            }
        });

        // Get the public URL
        const [url] = await bucket.file(storagePath).getSignedUrl({
            action: 'read',
            expires: Date.now() + 7 * 24 * 60 * 60 * 1000 // URL expires in 7 days
        });

        // Clean up the temporary file
        fs.unlinkSync(file.path);

        res.status(200).json({
            message: 'File uploaded successfully',
            fileInfo: {
                originalName: file.originalname,
                category: fileCategory,
                size: file.size,
                mimeType: file.mimetype,
                url: url
            }
        });

    } catch (error) {
        console.error('File upload error:', error);
        
        // Clean up the temporary file if it exists
        if (req.file && req.file.path) {
            fs.unlinkSync(req.file.path);
        }
        
        res.status(500).json({ error: 'File upload failed' });
    }
};

module.exports = {
    uploadFile
}; 