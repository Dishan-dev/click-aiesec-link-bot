require('dotenv').config();
const { google } = require('googleapis');
const path = require('path');

const keyFilePath = path.join(__dirname, 'click-aiesec-bot-a88efdfd735b.json');
const auth = new google.auth.GoogleAuth({
    keyFile: keyFilePath,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

async function readCS() {
    const sheets = google.sheets({ version: 'v4', auth });
    const response = await sheets.spreadsheets.values.get({
        spreadsheetId: process.env.SHEET_ID,
        range: 'CS!1:2',
    });
    console.log('CS Row 1:', JSON.stringify(response.data.values[0], null, 2));
    console.log('CS Row 2:', JSON.stringify(response.data.values[1], null, 2));
}

readCS().catch(console.error);
