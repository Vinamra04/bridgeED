const admin = require('firebase-admin');

const firebaseConfig = {
    initialize: () => {
        if (!admin.apps.length) {
            admin.initializeApp({
                credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)),
                storageBucket: process.env.FIREBASE_STORAGE_BUCKET
            });
        }
        return admin.storage().bucket();
    }
};

module.exports = firebaseConfig; 