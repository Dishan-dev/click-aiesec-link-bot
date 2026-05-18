require('dotenv').config();
const { google } = require('googleapis');
const path = require('path');

const keyFilePath = path.join(__dirname, 'service-account.json');
const auth = new google.auth.GoogleAuth({
    keyFile: keyFilePath,
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
});

async function readSheet() {
    const sheets = google.sheets({ version: 'v4', auth });
    const response = await sheets.spreadsheets.values.get({
        spreadsheetId: process.env.SHEET_ID,
        range: process.env.SHEET_RANGE,
    });
    const rows = response.data.values;
    if (rows && rows.length > 0) {
        console.log('Last 5 rows:');
        console.log(JSON.stringify(rows.slice(-5), null, 2));
    } else {
        console.log('No data found.');
    }
}

readSheet().catch(console.error);
