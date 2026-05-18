const { google } = require('googleapis');
const { getGoogleAuth } = require('../config/google');

// Convert column letter (A, B, C) to zero-based index (0, 1, 2)
const colToIndex = (colLetter) => {
    let index = 0;
    for (let i = 0; i < colLetter.length; i++) {
        index = index * 26 + colLetter.charCodeAt(i) - 64;
    }
    return index - 1;
};

/**
 * Reads the Google Sheet and finds the converted link for the given long URL.
 * It searches from the bottom up to find the latest matching entry.
 * @param {string} longUrl - The original long URL to search for
 * @returns {Promise<string|null>} - The converted link, or null if not found
 */
const findConvertedLink = async (longUrl, entity) => {
    try {
        const auth = getGoogleAuth();
        const sheets = google.sheets({ version: 'v4', auth });

        const spreadsheetId = process.env.SHEET_ID;
        const defaultRange = process.env.SHEET_RANGE || 'General!A:Z';
        const longLinkCol = process.env.LONG_LINK_COLUMN || 'A';
        const convertedLinkCol = process.env.CONVERTED_LINK_COLUMN || 'B';

        if (!spreadsheetId) {
            throw new Error('Google Sheet ID not configured in .env');
        }

        const longLinkIndex = colToIndex(longLinkCol);
        const convertedLinkIndex = colToIndex(convertedLinkCol);

        // 1. Determine which sheet names to check.
        // We first check the entity sheet (if provided and not 'skip'), then the default sheet (General),
        // and finally we check all other sheets in the spreadsheet just in case.
        let sheetNamesToCheck = [];
        
        if (entity && entity.toLowerCase() !== 'skip') {
            sheetNamesToCheck.push(entity.trim());
        }

        // Extract default sheet name from SHEET_RANGE (e.g. 'General!A:Z' -> 'General')
        const defaultSheetName = defaultRange.includes('!') ? defaultRange.split('!')[0] : 'General';
        if (!sheetNamesToCheck.includes(defaultSheetName)) {
            sheetNamesToCheck.push(defaultSheetName);
        }

        // Fetch all actual sheet names from the spreadsheet to ensure we don't query non-existent sheets,
        // and to allow fallback to other sheets if not found in the primary ones.
        const metaResponse = await sheets.spreadsheets.get({ spreadsheetId });
        const allSheetNames = metaResponse.data.sheets.map(s => s.properties.title);

        // Filter our primary list to only include sheets that actually exist
        sheetNamesToCheck = sheetNamesToCheck.filter(name => allSheetNames.includes(name));

        // Add any remaining sheets from the spreadsheet to the end of our check list
        for (const name of allSheetNames) {
            if (!sheetNamesToCheck.includes(name)) {
                sheetNamesToCheck.push(name);
            }
        }

        // 2. Iterate through the sheets and search for the converted link
        for (const sheetName of sheetNamesToCheck) {
            try {
                const response = await sheets.spreadsheets.values.get({
                    spreadsheetId,
                    range: `${sheetName}!A:Z`, // Check full width of the sheet
                });

                const rows = response.data.values;
                if (!rows || rows.length === 0) {
                    continue;
                }

                // Search from bottom to top for the latest matching row
                for (let i = rows.length - 1; i >= 0; i--) {
                    const row = rows[i];
                    
                    if (row[longLinkIndex] && row[longLinkIndex].trim() === longUrl.trim()) {
                        if (row[convertedLinkIndex] && row[convertedLinkIndex].trim() !== '') {
                            console.log(`✔ Found converted link in sheet "${sheetName}": ${row[convertedLinkIndex].trim()}`);
                            return row[convertedLinkIndex].trim();
                        }
                    }
                }
            } catch (sheetErr) {
                console.warn(`Warning: Could not read sheet "${sheetName}":`, sheetErr.message);
            }
        }

        return null;
    } catch (error) {
        console.error('Error fetching data from Google Sheets:', error);
        return null;
    }
};

/**
 * Appends a new row to the Google Sheet with the collected data.
 * @param {object} data - Object containing link, function, and shortcut
 * @returns {Promise<boolean>} - True if successful, false otherwise
 */
const appendToSheet = async (data) => {
    try {
        const auth = getGoogleAuth();
        const sheets = google.sheets({ version: 'v4', auth });

        const spreadsheetId = process.env.SHEET_ID;
        const defaultSheetName = process.env.SHEET_NAME || 'General';

        if (!spreadsheetId) {
            throw new Error('Google Sheet ID not configured in .env');
        }

        const sheetNameToAppend = (data.entity && data.entity.toLowerCase() !== 'skip') ? data.entity.trim() : defaultSheetName;

        // Format: Timestamp, Created By, Entity, Function, Link Keyword, Original Link, Final Link
        const timestamp = new Date().toLocaleString('en-US', { 
            timeZone: 'Asia/Colombo', // Matching user's local time
            hour12: false 
        });
        
        const createdBy = process.env.GOOGLE_FORM_EMAIL || 'bot@aiesec.net';
        const entity = data.entity || '';
        const func = data.function || '';
        const shortcut = data.shortcut || '';
        const originalLink = data.link || '';
        const finalLink = ''; // Engine will fill this

        const row = [timestamp, createdBy, entity, func, shortcut, originalLink, finalLink];

        console.log(`Appending row directly to Google Sheet "${sheetNameToAppend}":`, row);

        await sheets.spreadsheets.values.append({
            spreadsheetId,
            range: `${sheetNameToAppend}!A4:G`,
            valueInputOption: 'USER_ENTERED',
            requestBody: {
                values: [row],
            },
        });

        console.log('✔ Successfully appended row to Google Sheet!');
        return true;
    } catch (error) {
        console.error('Error appending data to Google Sheets:', error);
        return false;
    }
};

module.exports = {
    findConvertedLink,
    appendToSheet
};
