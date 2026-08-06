"use strict";

// Shared per-module load state, consulted by the debugger (userscript),
// the service launcher (background service) and the GetModules response so
// the UI can show a health status on each module card.
const health = {};

function getHealth() {
    return health;
}

function setService(fullName, status, error) {
    const entry = health[fullName] || (health[fullName] = { userscript: null, service: null });
    entry.service = {
        status: status,
        error: error || null,
        at: Date.now()
    };
}

function setUserscript(fullName, status, error) {
    const entry = health[fullName] || (health[fullName] = { userscript: null, service: null });
    entry.userscript = {
        status: status,
        error: error || null,
        at: Date.now()
    };
}

module.exports = {
    getHealth,
    setService,
    setUserscript
};