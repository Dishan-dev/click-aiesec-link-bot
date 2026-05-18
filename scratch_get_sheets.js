require('dotenv').config();
const { google } = require('googleapis');
const path = require('path');

const keyFilePath = path.join(__dirname, 'click-aiesec-bot-a88efdfd735b.json');
const auth = new google.auth.GoogleAuth({
    keyFile: keyFilePath,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

async function getSheetNames() {
    const sheets = google.sheets({ version: 'v4', auth });
    const response = await sheets.spreadsheets.get({
        spreadsheetId: process.env.SHEET_ID,
    });
    console.log('Sheet names:', response.data.sheets.map(s => s.properties.title));
}

getSheetNames().catch(console.error);
