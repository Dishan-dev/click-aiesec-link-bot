require('dotenv').config();
const { submitToForm, getBrowser } = require('./src/services/formService');
const { findConvertedLink } = require('./src/services/sheetService');
const { sleep } = require('./src/utils/helpers');

const testBotLogic = async () => {
    console.log("==========================================");
    console.log("       TESTING BOT LOGIC IN TERMINAL      ");
    console.log("==========================================");

    const testData = {
        link: "https://chatgpt.com/test-link-" + Date.now(),
        function: "MISC",
        shortcut: "test-shortcut-" + Math.floor(Math.random() * 1000)
        // entity is optional — leave it out for a general link
    };

    console.log("\n[1] Starting Form Submission...");
    console.log("Data to submit:", testData);
    
    const formSubmitted = await submitToForm(testData);
    
    if (!formSubmitted) {
        console.error("\n[X] Form submission failed! Check the debug screenshots in your folder.");
        try { const browser = await getBrowser(); await browser.close(); } catch(e) {}
        process.exit(1);
    }
    
    console.log("\n[✔] Form submitted successfully!");

    console.log("\n[2] Polling Google Sheets for the converted link...");
    let convertedLink = null;
    const maxRetries = 10;
    const retryDelay = 3000;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        console.log(`  Polling attempt ${attempt}/${maxRetries} for: ${testData.link}`);
        
        convertedLink = await findConvertedLink(testData.link, testData.entity);
        
        if (convertedLink) {
            break;
        }
        
        if (attempt < maxRetries) {
            await sleep(retryDelay);
        }
    }

    if (convertedLink) {
        console.log(`\n[✔] SUCCESS! Your converted link is: ${convertedLink}`);
    } else {
        console.log("\n[!] Form was submitted, but the converted link didn't appear in 30 seconds.");
        console.log("Check if the 'Automated Conversion Engine' is running on the spreadsheet.");
    }

    try { const browser = await getBrowser(); await browser.close(); } catch(e) {}
    process.exit(0);
};

testBotLogic();
