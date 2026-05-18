/**
 * Configuration for the conversational form questions.
 * The bot will ask these questions sequentially after receiving a valid URL.
 */
const QUESTIONS = [
    {
        key: 'entity',
        prompt: 'Awesome! First, which Entity or Team?\n(Must be exact: CC, CN, CS, USJ, Kandy, Ruhuna, SLIIT, NIBM, NSBM, Rajarata, Wayamba, MC, devteam, NatCon, IC, NLDS)\n\n_Type "skip" for a general/external link (no entity)_',
        optional: true
    },
    {
        key: 'function',
        prompt: 'What is the Function/Purpose?\n(Must be exact: MISC, oGV, oGT, iGV, iGT, B2C, OD, OPS, FnL, BD, Brand, IM, EM, TM, PR, Events, President)',
        envEntryKey: 'FORM_FUNCTION_ENTRY'
    },
    {
        key: 'shortcut',
        prompt: 'Thanks! What is the Shortcut (Link Keyword)?\ne.g., type "compendium" to create click.aiesec.lk/compendium\n(Use only lower case letters, numbers, and hyphens)',
        envEntryKey: 'FORM_SHORTCUT_ENTRY'
    }
];

module.exports = QUESTIONS;
