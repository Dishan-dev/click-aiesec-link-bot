require('dotenv').config();
const express = require('express');
const { connectToWhatsApp } = require('./services/whatsappService');
const { handleIncomingMessage } = require('./bot/messageHandler');

const app = express();
const port = process.env.PORT || 3000;

// Simple health endpoint
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'OK', timestamp: new Date() });
});

// Start Express Server
app.listen(port, () => {
    console.log(`Health check server running on port ${port}`);
});

// Start WhatsApp Bot
console.log('Initializing WhatsApp Bot...');
connectToWhatsApp(handleIncomingMessage)
    .catch(err => {
        console.error('Failed to initialize WhatsApp Bot:', err);
        process.exit(1);
    });
