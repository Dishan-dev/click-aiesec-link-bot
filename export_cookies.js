require('dotenv').config();
const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

async function exportCookies() {
    console.log('Exporting cookies from Windows Chrome session...');
    const dataDir = process.env.DATA_DIR || process.cwd();
    const browser = await puppeteer.launch({
        headless: false,
        userDataDir: path.resolve(dataDir, 'chrome_session'),
        channel: 'chrome',
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    });
    const page = await browser.newPage();
    const formUrl = process.env.FORM_URL || 'https://docs.google.com/forms';
    console.log('Navigating to ' + formUrl);
    await page.goto(formUrl, { waitUntil: 'networkidle2' });
    
    // Check if login is required
    const content = await page.content();
    if (content.includes('Sign in') || content.includes('accounts.google.com')) {
        console.log('⚠️ Please log in to your @aiesec.net account in the browser window. Waiting 45 seconds...');
        await new Promise(r => setTimeout(r, 45000));
    }
    
    const cookies = await page.cookies();
    const cookiesPath = path.resolve(dataDir, 'cookies.json');
    fs.writeFileSync(cookiesPath, JSON.stringify(cookies, null, 2));
    await browser.close();
    console.log(`✅ Successfully saved cookies.json! (${cookies.length} cookies exported)`);
}

exportCookies().catch(console.error);
