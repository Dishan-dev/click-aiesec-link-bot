const fs = require('fs');
const html = fs.readFileSync('scratch_response.html', 'utf8');

// Find ALL form tags
const formRegex = /<form[^>]*>/g;
let m;
while ((m = formRegex.exec(html)) !== null) {
    console.log('FORM TAG:', m[0].substring(0, 300));
    console.log('---');
}

// Find the actual action URL that's a real URL
const actionRegex = /action="(https:\/\/[^"]+)"/g;
while ((m = actionRegex.exec(html)) !== null) {
    console.log('ACTION URL:', m[1]);
}

// Check if there's a different formResponse URL format
const frRegex = /formResponse[^"']*/g;
while ((m = frRegex.exec(html)) !== null) {
    console.log('formResponse ref:', m[0].substring(0, 200));
}
