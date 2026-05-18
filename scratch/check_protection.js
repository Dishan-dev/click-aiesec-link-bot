require('dotenv').config();
const { google } = require('googleapis');
const path = require('path');

const keyFilePath = path.join(__dirname, '../click-aiesec-bot-a88efdfd735b.json');
const auth = new google.auth.GoogleAuth({
    keyFile: keyFilePath,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

async function checkProtection() {
    const sheets = google.sheets({ version: 'v4', auth });
    const response = await sheets.spreadsheets.get({
        spreadsheetId: process.env.SHEET_ID,
    });
    
    const sheet = response.data.sheets.find(s => s.properties.title === 'CS');
    console.log('Sheet properties:', JSON.stringify(sheet.properties, null, 2));
    
    if (sheet.protectedRanges) {
        console.log('Protected Ranges:', JSON.stringify(sheet.protectedRanges, null, 2));
    } else {
        console.log('No protected ranges found on this sheet object (might be at spreadsheet level).');
    }
}

checkProtection().catch(console.error);
