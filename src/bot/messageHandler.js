const { extractUrl, sleep } = require('../utils/helpers');
const { findConvertedLink, appendToSheet } = require('../services/sheetService');
const { sendMessage } = require('../services/whatsappService');
const { getUserState, setUserState, clearUserState } = require('./stateManager');
const QUESTIONS = require('../config/questions');

/**
 * Handles incoming WhatsApp messages.
 * @param {object} sock - The Baileys socket instance
 * @param {object} msg - The message object
 */
const handleIncomingMessage = async (sock, msg) => {
    try {
        const jid = msg.key.remoteJid;
        const isGroup = jid && jid.endsWith('@g.us');
        const senderJid = isGroup ? msg.key.participant : jid;
        
        console.log(`[DEBUG] Received message from JID: ${jid} (sender: ${senderJid}, fromMe: ${msg.key.fromMe})`);
        
        // Ignore status updates
        if (jid === 'status@broadcast') return;
        
        // Helper function to extract text from various message structures
        const getMessageText = (msg) => {
            if (!msg.message) return null;
            const m = msg.message;
            if (m.conversation) return m.conversation;
            if (m.extendedTextMessage?.text) return m.extendedTextMessage.text;
            if (m.ephemeralMessage?.message?.conversation) return m.ephemeralMessage.message.conversation;
            if (m.ephemeralMessage?.message?.extendedTextMessage?.text) return m.ephemeralMessage.message.extendedTextMessage.text;
            return null;
        };
        
        let messageContent = getMessageText(msg);
        if (!messageContent) return;

        const botNumber = sock.user.id.split(':')[0]; // e.g. 94771234567
        const mentionedJidList = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
        const isBotMentioned = mentionedJidList.some(mention => mention.startsWith(botNumber));
        const hasBotTagInText = messageContent.includes(`@${botNumber}`);

        // In group chats, ONLY respond if the bot is explicitly @mentioned
        if (isGroup) {
            if (!isBotMentioned && !hasBotTagInText) {
                return; // Ignore general group chatter
            }
            // Strip the @botNumber tag from the message content so the bot can process the actual link/answers cleanly
            const tagRegex = new RegExp(`@${botNumber}\\b`, 'gi');
            messageContent = messageContent.replace(tagRegex, '').trim();
        }

        // Use a combined state key for groups so multiple users in the same group don't overwrite each other's state
        const stateKey = isGroup ? `${jid}_${senderJid}` : jid;

        // Cancel command
        if (messageContent.toLowerCase().trim() === 'cancel') {
            clearUserState(stateKey);
            await sendMessage(jid, "Process cancelled. Send me a new link when you're ready.");
            return;
        }

        // Ignore the bot's own response messages to prevent infinite loops when testing in "Message Yourself"
        if (
            messageContent.startsWith("Processing your link...") ||
            messageContent.startsWith("Sorry, I failed") ||
            messageContent.startsWith("Your converted link:") ||
            messageContent.startsWith("Submitted but result") ||
            messageContent.startsWith("Process cancelled") ||
            messageContent.startsWith("Awesome!") ||
            messageContent.startsWith("Thanks!") ||
            messageContent.startsWith("What is the Function")
        ) {
            return;
        }

        const state = getUserState(stateKey);

        // Step -1: Waiting for a link
        if (state.step === -1) {
            const extractedUrl = extractUrl(messageContent);
            
            if (extractedUrl) {
                console.log(`[${new Date().toISOString()}] Received URL from ${senderJid} in ${jid}: ${extractedUrl}`);
                
                state.data.link = extractedUrl;
                
                if (QUESTIONS.length > 0) {
                    state.step = 0; // Move to first question
                    setUserState(stateKey, state);
                    // Mention the user back in groups so they know the bot is talking to them
                    const replyPrefix = isGroup ? `@${senderJid.split('@')[0]} ` : '';
                    await sendMessage(jid, replyPrefix + QUESTIONS[0].prompt + "\n\n_(Type 'cancel' at any time to abort)_");
                } else {
                    // No extra questions configured, submit immediately
                    await processFormSubmission(jid, stateKey, state.data, isGroup ? senderJid : null);
                }
            }
        } 
        // Step >= 0: Answering questions
        else {
            const currentQuestion = QUESTIONS[state.step];
            // Save the answer (handle "skip" for optional questions)
            const answer = messageContent.trim();
            if (currentQuestion.optional && answer.toLowerCase() === 'skip') {
                // Leave it undefined so formService knows to skip this field
            } else {
                state.data[currentQuestion.key] = answer;
            }
            
            // Move to next step
            state.step += 1;
            
            const replyPrefix = isGroup ? `@${senderJid.split('@')[0]} ` : '';

            if (state.step < QUESTIONS.length) {
                // Ask next question
                setUserState(stateKey, state);
                await sendMessage(jid, replyPrefix + QUESTIONS[state.step].prompt);
            } else {
                // All questions answered!
                await processFormSubmission(jid, stateKey, state.data, isGroup ? senderJid : null);
            }
        }
    } catch (error) {
        console.error('Error handling message:', error);
    }
};

/**
 * Processes the form submission and polling logic after all questions are answered.
 */
const processFormSubmission = async (jid, stateKey, data, senderJid) => {
    try {
        const replyPrefix = senderJid ? `@${senderJid.split('@')[0]} ` : '';
        await sendMessage(jid, replyPrefix + "Processing your link... ⏳");

        // 2. Append URL and data directly to Google Sheet via Service Account API
        const formSubmitted = await appendToSheet(data);
        
        if (!formSubmitted) {
            await sendMessage(jid, replyPrefix + "Sorry, I failed to submit your data to the Google Sheet. ✘");
            clearUserState(stateKey);
            return;
        }

        // 3. Polling Google Sheet for the converted link
        let convertedLink = null;
        const maxRetries = 10;
        const retryDelay = 3000; // 3 seconds
        const extractedUrl = data.link;

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            console.log(`Polling Sheet attempt ${attempt}/${maxRetries} for: ${extractedUrl}`);
            
            convertedLink = await findConvertedLink(extractedUrl, data.entity);
            
            if (convertedLink) {
                break;
            }
            
            if (attempt < maxRetries) {
                await sleep(retryDelay);
            }
        }

        // 4. Send final response
        if (convertedLink) {
            await sendMessage(jid, replyPrefix + `Your converted link: ${convertedLink} 🚀`);
        } else {
            await sendMessage(jid, replyPrefix + "Submitted but result not ready yet. Please check back later. ⏳");
        }

        // Clear the state so user can submit a new link
        clearUserState(stateKey);
    } catch (err) {
        console.error('Error in processFormSubmission:', err);
        clearUserState(stateKey);
    }
};

module.exports = {
    handleIncomingMessage
};
