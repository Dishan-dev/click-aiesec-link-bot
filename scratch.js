require('dotenv').config();

async function test() {
    const cookie = process.env.GOOGLE_COOKIE;
    const submitUrl = 'https://docs.google.com/forms/d/e/1FAIpQLScy5fpQB5qJrzMQsXyguUkf2S8n5zAr1cgi6UuX6VB2UKaBQg/formResponse';

    // Test 1: Minimal POST - just entry fields, no hidden fields
    console.log('=== Test 1: Minimal POST ===');
    const params1 = new URLSearchParams();
    params1.append('entry.1528538148', 'https://idealize-26.vercel.app/');
    params1.append('entry.1539659604', 'Events');
    params1.append('entry.1706876809', 'test-minimal-1');

    let res = await fetch(submitUrl, {
        method: 'POST',
        body: params1.toString(),
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Cookie': cookie,
        },
        redirect: 'manual',
    });
    console.log('Status:', res.status);
    if (res.status === 302) console.log('Redirect to:', res.headers.get('location'));

    // Test 2: With emailAddress only
    console.log('\n=== Test 2: With email ===');
    const params2 = new URLSearchParams();
    params2.append('entry.1528538148', 'https://idealize-26.vercel.app/');
    params2.append('entry.1539659604', 'Events');
    params2.append('entry.1706876809', 'test-email-1');
    params2.append('emailAddress', 'dishan.bashitha@aiesec.net');

    res = await fetch(submitUrl, {
        method: 'POST',
        body: params2.toString(),
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Cookie': cookie,
        },
        redirect: 'manual',
    });
    console.log('Status:', res.status);
    if (res.status === 302) console.log('Redirect to:', res.headers.get('location'));

    // Test 3: With fvv and pageHistory=0
    console.log('\n=== Test 3: With fvv + pageHistory=0 ===');
    const params3 = new URLSearchParams();
    params3.append('entry.1528538148', 'https://idealize-26.vercel.app/');
    params3.append('entry.1539659604', 'Events');
    params3.append('entry.1706876809', 'test-fvv-1');
    params3.append('emailAddress', 'dishan.bashitha@aiesec.net');
    params3.append('fvv', '1');
    params3.append('pageHistory', '0');
    params3.append('fbzx', '-94621218506203489');

    res = await fetch(submitUrl, {
        method: 'POST',
        body: params3.toString(),
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Cookie': cookie,
        },
        redirect: 'manual',
    });
    console.log('Status:', res.status);
    if (res.status === 302) console.log('Redirect to:', res.headers.get('location'));
    
    // For whichever didn't return 302, let's check the body
    if (res.status !== 302) {
        const body = await res.text();
        const hasConfirm = body.includes('freebirdFormviewerViewResponseConfirmationMessage') || body.includes('recorded');
        console.log('Has confirmation in body?', hasConfirm);
    }

    // Test 4: POST to the non-/u/0/ URL with redirect=follow
    console.log('\n=== Test 4: Follow redirects ===');
    const params4 = new URLSearchParams();
    params4.append('entry.1528538148', 'https://idealize-26.vercel.app/');
    params4.append('entry.1539659604', 'Events');
    params4.append('entry.1706876809', 'test-follow-1');
    params4.append('emailAddress', 'dishan.bashitha@aiesec.net');
    params4.append('fvv', '1');
    params4.append('pageHistory', '0');
    params4.append('fbzx', '-94621218506203489');

    res = await fetch(submitUrl, {
        method: 'POST',
        body: params4.toString(),
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Cookie': cookie,
            'Origin': 'https://docs.google.com',
            'Referer': 'https://docs.google.com/forms/d/e/1FAIpQLScy5fpQB5qJrzMQsXyguUkf2S8n5zAr1cgi6UuX6VB2UKaBQg/viewform',
        },
        redirect: 'follow',
    });
    console.log('Status:', res.status);
    console.log('Final URL:', res.url);
    const body4 = await res.text();
    const hasConfirm4 = body4.includes('freebirdFormviewerViewResponseConfirmationMessage') || body4.includes('recorded');
    console.log('Has confirmation in body?', hasConfirm4);
    if (hasConfirm4) {
        console.log('\n✅ SUCCESS!');
    }
}

test().catch(console.error);
