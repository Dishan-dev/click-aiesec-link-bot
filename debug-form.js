// Debug script: Opens the form and captures the full HTML + full-page screenshot
require('dotenv').config();
const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

(async () => {
    const browser = await puppeteer.launch({
        headless: false,
        userDataDir: path.resolve(process.cwd(), 'chrome_session'),
        channel: 'chrome',
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 2000 });

    const formUrl = process.env.FORM_URL;
    console.log('Navigating to:', formUrl);
    await page.goto(formUrl, { waitUntil: 'networkidle2', timeout: 30000 });
    
    // Wait for full render
    await new Promise(r => setTimeout(r, 5000));

    const pageUrl = page.url();
    console.log('Current URL:', pageUrl);
    console.log('Page title:', await page.title());

    if (pageUrl.includes('accounts.google.com')) {
        console.error('Still on sign-in page! Session not valid.');
        await browser.close();
        process.exit(1);
    }

    // Full-page screenshot
    await page.screenshot({ path: 'debug_full_form.png', fullPage: true });
    console.log('Full-page screenshot saved to debug_full_form.png');

    // Save the HTML
    const html = await page.content();
    fs.writeFileSync('debug_full_form.html', html);
    console.log('Full HTML saved to debug_full_form.html');

    // Log all visible role="button" elements
    const buttons = await page.evaluate(() => {
        const btns = Array.from(document.querySelectorAll('div[role="button"], span[role="button"]'));
        return btns.map((b, i) => ({
            index: i,
            tag: b.tagName,
            role: b.getAttribute('role'),
            text: b.textContent.trim().substring(0, 100),
            jsname: b.getAttribute('jsname'),
            rect: b.getBoundingClientRect()
        }));
    });
    console.log('\n=== ALL BUTTONS ===');
    buttons.forEach(b => console.log(JSON.stringify(b)));

    // Log all input/textarea elements
    const inputs = await page.evaluate(() => {
        const els = Array.from(document.querySelectorAll('input, textarea'));
        return els.map((el, i) => ({
            index: i,
            tag: el.tagName,
            type: el.type,
            name: el.name,
            id: el.id,
            value: el.value.substring(0, 100),
            ariaLabel: el.getAttribute('aria-label'),
            dataParams: el.getAttribute('data-params')?.substring(0, 200)
        }));
    });
    console.log('\n=== ALL INPUTS ===');
    inputs.forEach(inp => console.log(JSON.stringify(inp)));

    // Log all listbox/dropdown elements
    const listboxes = await page.evaluate(() => {
        const els = Array.from(document.querySelectorAll('[role="listbox"], [role="option"], [data-value]'));
        return els.map((el, i) => ({
            index: i,
            tag: el.tagName,
            role: el.getAttribute('role'),
            text: el.textContent.trim().substring(0, 100),
            dataValue: el.getAttribute('data-value'),
            ariaLabel: el.getAttribute('aria-label')
        }));
    });
    console.log('\n=== ALL DROPDOWNS/LISTBOXES ===');
    listboxes.forEach(lb => console.log(JSON.stringify(lb)));

    // Log all checkbox elements
    const checkboxes = await page.evaluate(() => {
        const els = Array.from(document.querySelectorAll('[role="checkbox"], input[type="checkbox"]'));
        return els.map((el, i) => ({
            index: i,
            tag: el.tagName,
            role: el.getAttribute('role'),
            text: el.textContent.trim().substring(0, 100),
            checked: el.getAttribute('aria-checked') || el.checked,
            ariaLabel: el.getAttribute('aria-label')
        }));
    });
    console.log('\n=== ALL CHECKBOXES ===');
    checkboxes.forEach(cb => console.log(JSON.stringify(cb)));

    // Log all form sections
    const sections = await page.evaluate(() => {
        const els = Array.from(document.querySelectorAll('[data-params]'));
        return els.map((el, i) => ({
            index: i,
            tag: el.tagName,
            dataParams: el.getAttribute('data-params')?.substring(0, 300),
            text: el.textContent?.trim().substring(0, 200)
        }));
    });
    console.log('\n=== ALL DATA-PARAMS ELEMENTS ===');
    sections.forEach(s => console.log(JSON.stringify(s)));

    await browser.close();
    console.log('\nDone!');
})();
