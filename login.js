const puppeteer = require('puppeteer');
const path = require('path');
require('dotenv').config();

(async () => {
    console.log('====================================================');
    console.log('             INITIALIZING LOGIN SESSION              ');
    console.log('====================================================');
    console.log('Launching browser for login...');
    console.log('Please log in to your @aiesec.net account in the browser window that opens.');
    
    const fs = require('fs');
    const dataDir = process.env.DATA_DIR || process.cwd();
    let executablePath = null;
    if (fs.existsSync('/usr/bin/chromium-browser')) { executablePath = '/usr/bin/chromium-browser'; }
    else if (fs.existsSync('/usr/bin/chromium')) { executablePath = '/usr/bin/chromium'; }
    else if (fs.existsSync('/usr/bin/google-chrome')) { executablePath = '/usr/bin/google-chrome'; }

    const launchOptions = {
        headless: false,
        userDataDir: path.resolve(__dirname, 'chrome_session'),
        args: [
            '--no-sandbox', 
            '--disable-setuid-sandbox', 
            '--disable-dev-shm-usage',
            '--remote-debugging-port=9222',
            '--remote-debugging-address=0.0.0.0'
        ]
    };
    if (executablePath) { launchOptions.executablePath = executablePath; }
    else { launchOptions.channel = 'chrome'; }

    const browser = await puppeteer.launch(launchOptions);

    const page = await browser.newPage();
    
    // Navigate to the form URL directly to prompt login
    const formUrl = process.env.FORM_URL;
    if (formUrl) {
        await page.goto(formUrl);
    } else {
        await page.goto('https://accounts.google.com/signin');
    }

    console.log('\n⏳ BROWSER IS OPEN! Please complete the Google Sign-in process in DevTools.');
    console.log('👉 When you are fully logged in and see the Google Form screen, press Ctrl+C in this terminal to save and exit!\n');

    // Keep browser open indefinitely until user presses Ctrl+C
    while (true) {
        await new Promise(r => setTimeout(r, 5000));
    }
})();
