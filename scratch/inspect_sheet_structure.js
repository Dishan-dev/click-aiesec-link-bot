require('dotenv').config();
const { google } = require('googleapis');
const path = require('path');

const keyFilePath = path.join(__dirname, '../click-aiesec-bot-a88efdfd735b.json');
const auth = new google.auth.GoogleAuth({
    keyFile: keyFilePath,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

async function inspectSheet() {
    const sheets = google.sheets({ version: 'v4', auth });
    
    // Get spreadsheet details to see sheet names
    const spreadsheet = await sheets.spreadsheets.get({
        spreadsheetId: process.env.SHEET_ID,
    });
    console.log('Sheet Names:', spreadsheet.data.sheets.map(s => s.properties.title));

    const response = await sheets.spreadsheets.values.get({
        spreadsheetId: process.env.SHEET_ID,
        range: 'General!A1:Z10', // Assuming General is the sheet name based on scratch_read_headers
    });
    
    const rows = response.data.values;
    if (rows && rows.length > 0) {
        console.log('First 10 rows:');
        rows.forEach((row, i) => {
            console.log(`Row ${i + 1}:`, JSON.stringify(row));
        });
    } else {
        console.log('No data found in General!A1:Z10');
        
        // Try Sheet1 if General fails
        const response2 = await sheets.spreadsheets.values.get({
            spreadsheetId: process.env.SHEET_ID,
            range: 'Sheet1!A1:Z10',
        });
        const rows2 = response2.data.values;
        if (rows2) {
             console.log('First 10 rows (Sheet1):');
             rows2.forEach((row, i) => {
                console.log(`Row ${i + 1}:`, JSON.stringify(row));
            });
        }
    }
}

inspectSheet().catch(console.error);
