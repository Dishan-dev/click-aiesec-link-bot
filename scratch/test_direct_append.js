require('dotenv').config();
const { appendToSheet } = require('../src/services/sheetService');

async function testAppend() {
    console.log('Testing direct sheet append...');
    const testData = {
        link: 'https://example.com/test-' + Date.now(),
        function: 'MISC',
        shortcut: 'test-bot-' + Math.floor(Math.random() * 1000)
    };

    const success = await appendToSheet(testData);
    if (success) {
        console.log('Test PASSED: Row appended successfully.');
    } else {
        console.log('Test FAILED: Row could not be appended.');
        process.exit(1);
    }
}

testAppend().catch(err => {
    console.error('Test error:', err);
    process.exit(1);
});
