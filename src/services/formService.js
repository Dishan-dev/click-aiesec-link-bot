// Uses a persistent Puppeteer browser instance to submit forms.
// This allows submitting restricted Google Forms without needing edit access,
// while handling high concurrency by using lightweight pages within one browser.

const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

let browserInstance = null;

/**
 * Gets or initializes the singleton browser instance.
 */
const getBrowser = async () => {
    if (!browserInstance) {
        console.log('Initializing browser instance...');
        const fs = require('fs');
        const dataDir = process.env.DATA_DIR || process.cwd();
        
        let executablePath = null;
        if (fs.existsSync('/usr/bin/chromium-browser')) {
            executablePath = '/usr/bin/chromium-browser';
        } else if (fs.existsSync('/usr/bin/chromium')) {
            executablePath = '/usr/bin/chromium';
        } else if (fs.existsSync('/usr/bin/google-chrome')) {
            executablePath = '/usr/bin/google-chrome';
        }

        const launchOptions = {
            headless: false, // Must be false — Google blocks session cookies in headless mode
            userDataDir: path.resolve(__dirname, '../../chrome_session'),
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
        };

        if (executablePath) {
            launchOptions.executablePath = executablePath;
        } else {
            launchOptions.channel = 'chrome'; // Fallback for Windows local development
        }

        browserInstance = await puppeteer.launch(launchOptions);
    }
    return browserInstance;
};

/**
 * Selects a value from a Google Forms dropdown.
 * Google Forms dropdowns are custom div elements, not native <select> elements.
 * 
 * @param {object} page - Puppeteer page
 * @param {number} dropdownIndex - Which dropdown (0-based) on the page to interact with
 * @param {string} value - The exact data-value to select
 */
const selectDropdown = async (page, dropdownIndex, value) => {
    // Find all listbox containers on the page
    const listboxes = await page.$$('div[role="listbox"]');
    if (dropdownIndex >= listboxes.length) {
        console.warn(`Dropdown index ${dropdownIndex} not found (only ${listboxes.length} dropdowns).`);
        return false;
    }

    const listbox = listboxes[dropdownIndex];

    // Click the dropdown to open it
    await listbox.click();
    await new Promise(r => setTimeout(r, 500));

    // Find the option with the matching data-value
    const option = await page.evaluateHandle(
        (val) => {
            const options = Array.from(document.querySelectorAll('div[role="option"][data-value]'));
            return options.find(o => o.getAttribute('data-value') === val) || null;
        },
        value
    );

    const isValid = await option.evaluate(el => el instanceof HTMLElement).catch(() => false);
    if (!isValid) {
        console.warn(`Dropdown option "${value}" not found.`);
        // Click elsewhere to close the dropdown
        await page.click('body');
        await new Promise(r => setTimeout(r, 300));
        return false;
    }

    await option.click();
    await new Promise(r => setTimeout(r, 500));
    console.log(`  ✔ Selected dropdown[${dropdownIndex}] = "${value}"`);
    return true;
};

/**
 * Submits the extracted URL and conversational data to the Google Form
 * by interactively filling every field (dropdowns, text inputs, checkbox).
 * 
 * @param {object} data - Object containing { link, function, shortcut, entity? }
 * @returns {Promise<boolean>} - True if successful, false otherwise
 */
const submitToForm = async (data) => {
    let page = null;
    try {
        const formUrl = process.env.FORM_URL;
        if (!formUrl) {
            throw new Error('FORM_URL not configured in .env');
        }

        console.log(`Submitting to Google Form: ${data.link}`);

        const browser = await getBrowser();
        page = await browser.newPage();
        await page.setViewport({ width: 1280, height: 900 });

        const fs = require('fs');
        const cookiesPath = path.resolve(__dirname, '../../cookies.json');
        console.log(`  Checking for cookies at: ${cookiesPath}`);
        if (fs.existsSync(cookiesPath)) {
            console.log('  ✔ Loading session cookies from cookies.json...');
            const cookies = JSON.parse(fs.readFileSync(cookiesPath, 'utf8'));
            await page.setCookie(...cookies);
        } else {
            console.log('  ⚠️ cookies.json not found at ' + cookiesPath);
        }

        // Navigate to the blank form (no pre-filling — we'll fill everything interactively)
        console.log('  Navigating to form...');
        await page.goto(formUrl, { waitUntil: 'networkidle2', timeout: 30000 });

        // Wait for the form to fully render
        await new Promise(r => setTimeout(r, 3000));

        // Check if we hit a sign-in page
        const pageUrl = page.url();
        if (pageUrl.includes('accounts.google.com')) {
            console.error('ERROR: Not logged in! Run "npm run login" first.');
            await page.screenshot({ path: 'debug_signin_error.png' });
            return false;
        }

        // ─── STEP 1: Check the email receipt checkbox ───
        console.log('  Checking email receipt checkbox...');
        const checkbox = await page.$('div[role="checkbox"]');
        if (checkbox) {
            const isChecked = await checkbox.evaluate(el => el.getAttribute('aria-checked'));
            if (isChecked !== 'true') {
                await checkbox.click();
                await new Promise(r => setTimeout(r, 300));
                console.log('  ✔ Email checkbox checked.');
            } else {
                console.log('  ✔ Email checkbox already checked.');
            }
        }

        // ─── STEP 2: Select Entity dropdown (index 0, optional) ───
        if (data.entity) {
            console.log('  Selecting Entity dropdown...');
            await selectDropdown(page, 0, data.entity);
        } else {
            console.log('  Skipping Entity dropdown (not provided).');
        }

        // ─── STEP 3: Select Function/Purpose dropdown (index 1, required) ───
        console.log('  Selecting Function/Purpose dropdown...');
        const fnSelected = await selectDropdown(page, 1, data.function);
        if (!fnSelected) {
            console.error('  ✘ Failed to select Function/Purpose. Aborting.');
            await page.screenshot({ path: 'debug_dropdown_error.png' });
            return false;
        }

        // ─── STEP 4: Fill Shortcut text input ───
        console.log('  Filling Shortcut field...');
        // The text inputs on Google Forms are the visible <input type="text"> elements
        const textInputs = await page.$$('input[type="text"]');
        if (textInputs.length >= 2) {
            // textInputs[0] = Shortcut, textInputs[1] = Original Link
            await textInputs[0].click({ clickCount: 3 }); // Select any existing text
            await textInputs[0].type(data.shortcut, { delay: 30 });
            console.log(`  ✔ Shortcut = "${data.shortcut}"`);
        }

        // ─── STEP 5: Fill Original Link text input ───
        console.log('  Filling Original Link field...');
        if (textInputs.length >= 2) {
            await textInputs[1].click({ clickCount: 3 });
            await textInputs[1].type(data.link, { delay: 10 });
            console.log(`  ✔ Original Link = "${data.link}"`);
        }

        // ─── STEP 6: Click Submit (NOT Clear form!) ───
        console.log('  Clicking Submit button...');
        // Submit button has jsname="M2UYVd", Clear form has jsname="X5DuWc"
        const submitBtn = await page.$('div[jsname="M2UYVd"]');
        if (!submitBtn) {
            console.error('  ✘ Submit button not found!');
            await page.screenshot({ path: 'debug_submit_error.png' });
            const html = await page.content();
            fs.writeFileSync('debug_form_html.html', html);
            return false;
        }

        await submitBtn.click();

        // ─── STEP 7: Wait for confirmation ───
        console.log('  Waiting for confirmation...');
        try {
            await page.waitForFunction(
                () => window.location.href.includes('formResponse'),
                { timeout: 15000 }
            );
            console.log('  ✅ Successfully submitted to Google Form!');
            return true;
        } catch (e) {
            // Check if the URL changed anyway
            if (page.url().includes('formResponse')) {
                console.log('  ✅ Successfully submitted to Google Form!');
                return true;
            }
            // Maybe there are validation errors shown on the form
            const errorText = await page.evaluate(() => {
                const errors = Array.from(document.querySelectorAll('[role="alert"]'));
                return errors.map(e => e.textContent.trim()).filter(t => t.length > 0);
            });
            if (errorText.length > 0) {
                console.error('  ✘ Form validation errors:', errorText);
            } else {
                console.error('  ✘ Confirmation page not detected.');
            }
            await page.screenshot({ path: 'debug_confirmation_error.png' });
            return false;
        }

    } catch (error) {
        console.error('Error submitting to Google Form:', error.message);
        return false;
    } finally {
        if (page) {
            try { await page.close(); } catch (e) {}
        }
        // Do NOT close the browser — it stays alive for the next request
    }
};

module.exports = {
    submitToForm,
    getBrowser
};
