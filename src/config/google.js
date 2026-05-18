const { google } = require('googleapis');
const path = require('path');

// Configure the Google Auth credentials using the service account JSON
const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];

const getGoogleAuth = () => {
    try {
        const keyFilePath = path.join(__dirname, '../../click-aiesec-bot-a88efdfd735b.json');
        
        const auth = new google.auth.GoogleAuth({
            keyFile: keyFilePath,
            scopes: SCOPES,
        });

        return auth;
    } catch (error) {
        console.error('Error loading Google Auth credentials. Ensure service-account.json exists in root directory.', error);
        throw error;
    }
};

module.exports = { getGoogleAuth };
