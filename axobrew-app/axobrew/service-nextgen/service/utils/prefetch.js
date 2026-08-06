"use strict";

const { fetchTextWithRetry } = require('./network.js');
const { getDevResourceUrl } = require('./devServer.js');

// Download a module's userscript and background service while the user is
// still browsing the module grid. Prefetch is triggered when a tile gains
// focus and again when the app relaunches in debug for the autostart module.
// When the module is actually launched the already-downloaded text is reused,
// so a single tap no longer depends on a fresh fetch inside the launch
// window. Entries are refreshed on every prefetch call and expire so a dev
// build is never served for more than a short window.
const scripts = {};
const serviceScripts = {};
const TTL = 30000;

function getModuleScriptUrl(mdl) {
    if (mdl.dev) return getDevResourceUrl(mdl.mainFile || 'dist/userScript.js');
    return `https://cdn.jsdelivr.net/${mdl.fullName}/${mdl.mainFile}?v=${Date.now()}`;
}

function prefetchModule(mdl) {
    if (!mdl) return;

    if (!scripts[mdl.fullName] || Date.now() - scripts[mdl.fullName].at >= TTL) {
        const url = getModuleScriptUrl(mdl);
        if (!url) return;
        fetchTextWithRetry(url, 15000, mdl.dev ? 2 : 1, mdl.dev ? 'dev userscript' : 'userscript')
            .then(text => {
                scripts[mdl.fullName] = { text: text, at: Date.now() };
            })
            .catch(() => {});
    }

    if (!mdl.serviceFile) return;
const serviceUrl = mdl.dev
        ? getDevResourceUrl(mdl.serviceFile)
        : `https://cdn.jsdelivr.net/${mdl.fullName}/${mdl.serviceFile}?v=${Date.now()}`;

    if (!serviceUrl) return;
    if (!serviceScripts[mdl.fullName] || Date.now() - serviceScripts[mdl.fullName].at >= TTL) {
        fetchTextWithRetry(serviceUrl, 15000, mdl.dev ? 2 : 1, mdl.dev ? 'dev service' : 'service')
            .then(text => {
                serviceScripts[mdl.fullName] = { text: text, at: Date.now() };
            })
            .catch(() => {});
    }
}

function getScriptText(mdl) {
    const entry = scripts[mdl.fullName];
    if (entry && Date.now() - entry.at < TTL) return entry.text;
    return null;
}

function getServiceText(mdl) {
    const entry = serviceScripts[mdl.fullName];
    if (entry && Date.now() - entry.at < TTL) return entry.text;
    return null;
}

module.exports = {
    prefetchModule,
    getScriptText,
    getServiceText
};