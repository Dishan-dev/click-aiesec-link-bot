/**
 * Extracts the first URL found in a given text message.
 * @param {string} text - The message text
 * @returns {string|null} - The extracted URL or null if none found
 */
const extractUrl = (text) => {
    if (!text) return null;
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const matches = text.match(urlRegex);
    return matches ? matches[0] : null;
};

/**
 * Pauses execution for a specified amount of time.
 * @param {number} ms - Milliseconds to sleep
 * @returns {Promise<void>}
 */
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

module.exports = {
    extractUrl,
    sleep
};
