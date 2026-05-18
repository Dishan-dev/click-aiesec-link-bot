const userStates = new Map();

/**
 * Gets the current state for a given user (jid).
 * @param {string} jid 
 * @returns {object}
 */
const getUserState = (jid) => {
    if (!userStates.has(jid)) {
        return { step: -1, data: {} };
    }
    return userStates.get(jid);
};

/**
 * Updates or sets the state for a given user.
 * @param {string} jid 
 * @param {object} state 
 */
const setUserState = (jid, state) => {
    userStates.set(jid, state);
};

/**
 * Clears the state for a given user.
 * @param {string} jid 
 */
const clearUserState = (jid) => {
    userStates.delete(jid);
};

module.exports = {
    getUserState,
    setUserState,
    clearUserState
};
