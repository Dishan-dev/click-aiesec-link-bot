const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } = require('@whiskeysockets/baileys');
const { Boom } = require('@hapi/boom');
const pino = require('pino');
const qrcode = require('qrcode-terminal');

let sock = null;

/**
 * Initializes the WhatsApp connection using Baileys.
 * @param {Function} onMessage - Callback function when a message is received
 */
const connectToWhatsApp = async (onMessage) => {
    // Save authentication state in a local folder or persistent disk
    const fs = require('fs');
    const path = require('path');
    const dataDir = process.env.DATA_DIR || process.cwd();
    const authFolder = path.join(dataDir, 'auth_info_baileys');

    if (!fs.existsSync(authFolder)) {
        fs.mkdirSync(authFolder, { recursive: true });
    }
    const { state, saveCreds } = await useMultiFileAuthState(authFolder);
    let { version, isLatest } = await fetchLatestBaileysVersion();
    
    if (!isLatest) {
        version = [2, 3000, 1035194821]; // Fallback to a known working version if network fails
        console.log(`Fallback to known working WA v${version.join('.')}`);
    } else {
        console.log(`using WA v${version.join('.')}, isLatest: ${isLatest}`);
    }

    sock = makeWASocket({
        version,
        auth: state,
        printQRInTerminal: false, // We'll handle QR manually for better control
        logger: pino({ level: 'silent' }), // Suppress excessive logs
        browser: ['Ubuntu', 'Chrome', '20.0.04'] // Prevent 405 error
    });

    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
            // Print the QR code to terminal
            qrcode.generate(qr, { small: true });
            console.log('Scan the QR code above to login to WhatsApp.');
        }

        if (connection === 'close') {
            const statusCode = lastDisconnect.error?.output?.statusCode;
            const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
            console.log('Connection closed due to ', lastDisconnect.error, ', reconnecting ', shouldReconnect);
            // Reconnect if not logged out
            if (shouldReconnect) {
                connectToWhatsApp(onMessage);
            } else {
                console.log('Session logged out or conflicted. Clearing auth folder so a new QR code can be generated on restart...');
                const fs = require('fs');
                if (fs.existsSync(authFolder)) {
                    fs.rmSync(authFolder, { recursive: true, force: true });
                }
                process.exit(1);
            }
        } else if (connection === 'open') {
            console.log('Opened connection to WhatsApp successfully');
            
            // Send a test message to the "Message Yourself" chat
            try {
                const botNumber = sock.user.id.split(':')[0] + '@s.whatsapp.net';
                await sock.sendMessage(botNumber, { 
                    text: '🤖 Bot connected successfully! You can paste links here to test.' 
                });
            } catch (err) {
                console.error('Failed to send startup test message:', err);
            }
        }
    });

    sock.ev.on('creds.update', saveCreds);

    // Listen for incoming messages
    sock.ev.on('messages.upsert', async (m) => {
        if (!sock.user) return;
        
        // ONLY process new messages, ignore historical syncs
        if (m.type !== 'notify') return;

        const botNumber = sock.user.id.split(':')[0] + '@s.whatsapp.net';
        for (const msg of m.messages) {
            try {
                const remoteJid = msg.key.remoteJid;

                // 1. Ignore status updates (stories)
                if (!remoteJid || remoteJid === 'status@broadcast') {
                    continue;
                }
                
                // 2. Allow group chats (we will filter by @mention inside messageHandler)
                // if (remoteJid.endsWith('@g.us')) {
                //     continue;
                // }

                // 3. Ignore messages sent by the bot itself to other people
                // We strip the device ID (e.g. :44) from remoteJid to properly identify "Message yourself" chats
                const cleanRemoteJid = remoteJid.split(':')[0] + '@s.whatsapp.net';
                if (msg.key.fromMe && cleanRemoteJid !== botNumber) {
                    continue;
                }

                // We will pass all incoming private messages to the handler.
                await onMessage(sock, msg);
            } catch (err) {
                console.error('Error processing single message:', err);
            }
        }
    });
};

/**
 * Sends a text message back to a given JID (WhatsApp ID).
 * @param {string} jid - The WhatsApp ID to send to
 * @param {string} text - The text content to send
 */
const sendMessage = async (jid, text) => {
    if (!sock) {
        console.error('Socket not initialized');
        return;
    }
    await sock.sendMessage(jid, { text });
};

module.exports = {
    connectToWhatsApp,
    sendMessage
};
