require('dotenv').config();
const { google } = require('googleapis');
const path = require('path');

const keyFilePath = path.join(__dirname, 'click-aiesec-bot-a88efdfd735b.json');
const auth = new google.auth.GoogleAuth({
    keyFile: keyFilePath,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

async function checkRows() {
    const sheets = google.sheets({ version: 'v4', auth });
    const resGeneral = await sheets.spreadsheets.values.get({
        spreadsheetId: process.env.SHEET_ID,
        range: 'General!A:A',
    });
    const resCS = await sheets.spreadsheets.values.get({
        spreadsheetId: process.env.SHEET_ID,
        range: 'CS!A:A',
    });
    console.log('General rows:', resGeneral.data.values?.length || 0);
    console.log('CS rows:', resCS.data.values?.length || 0);
}

checkRows().catch(console.error);
