const puppeteer = require('puppeteer');
const path = require('path');
require('dotenv').config();

(async () => {
    console.log('====================================================');
    console.log('             INITIALIZING LOGIN SESSION              ');
    console.log('====================================================');
    console.log('Launching browser for login...');
    console.log('Please log in to your @aiesec.net account in the browser window that opens.');
    
    const dataDir = process.env.DATA_DIR || process.cwd();
    const browser = await puppeteer.launch({
        headless: false, // Make it visible so the user can interact
        userDataDir: path.resolve(dataDir, 'chrome_session'),
        channel: 'chrome', // Uses the locally installed Google Chrome to avoid download issues
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    });

    const page = await browser.newPage();
    
    // Navigate to the form URL directly to prompt login
    const formUrl = process.env.FORM_URL;
    if (formUrl) {
        await page.goto(formUrl);
    } else {
        await page.goto('https://accounts.google.com/signin');
    }

    console.log('\n⏳ Waiting for you to log in...');
    console.log('👉 Please complete the Google Sign-in process.');
    console.log('✅ Just log in and leave the window open! I will detect when you are done and close it automatically.\n');

    // Poll the URL or title until it is the Google Form
    let loggedIn = false;
    while (!loggedIn) {
        await new Promise(r => setTimeout(r, 2000));
        try {
            const url = await page.url();
            if (!url.includes('accounts.google.com') && url.includes('docs.google.com/forms')) {
                console.log('✅ Login successful! Detected Google Form.');
                loggedIn = true;
            }
        } catch (e) {
            // page might be closed by user early
            console.log('Browser was closed manually.');
            break;
        }
    }

    if (loggedIn) {
        console.log('Saving session to disk securely...');
        await browser.close(); // Graceful close flushes cookies to the SQLite DB!
        console.log('Browser closed. Your session has been permanently saved in "chrome_session".');
        console.log('You can now run "node test-form.js" to test the bot!');
    }
    process.exit(0);
})();
