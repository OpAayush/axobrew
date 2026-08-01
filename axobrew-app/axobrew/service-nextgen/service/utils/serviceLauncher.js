"use strict";

const vm = require('vm');
const fetch = require('node-fetch');
const { getDevResourceUrl } = require('./devServer.js');

function fetchWithTimeout(url, ms) {
    return Promise.race([
        fetch(url),
        new Promise((resolve, reject) => setTimeout(() => reject(new Error('Fetch timed out: ' + url)), ms))
    ]);
}

function startService(mdl, services) {
    let sandbox = {};

    // Mark the service as loading immediately so repeated LaunchModule
    // events (e.g. user pressing reload and opening the module right after)
    // do not start concurrent duplicate fetches while it is downloading.
    services.set(mdl.fullName, {
        context: null,
        hasCrashed: false,
        error: null,
        loading: true
    });

    Object.getOwnPropertyNames(global).forEach(prop => {
        const disAllowed = ['services', 'module', 'global', 'inDebug', 'currentClient', 'currentModule'];
        // Node.js v4.4.3 does not have Array.prototype.includes...
        if (disAllowed.indexOf(prop) >= 0) return;
        sandbox[prop] = global[prop];
    });

    sandbox['require'] = require;
    sandbox['tizen'] = global.tizen;
    sandbox['module'] = { exports: {} };

    const serviceUrl = mdl.dev
        ? getDevResourceUrl(mdl.serviceFile)
        : `https://cdn.jsdelivr.net/${mdl.fullName}/${mdl.serviceFile}?v=${Date.now()}`;
    if (!serviceUrl) {
        services.get(mdl.fullName).hasCrashed = true;
        services.get(mdl.fullName).error = new Error('Dev server is disabled.');
        return;
    }

    const fetchOnce = () => fetchWithTimeout(serviceUrl, mdl.dev ? 10000 : 15000)
        .then(res => res.text());
    const attempt = mdl.dev
        ? fetchOnce().catch(() => new Promise(resolve => setTimeout(resolve, 750)).then(fetchOnce))
        : fetchOnce();

    attempt.then(script => {
        const entry = services.get(mdl.fullName);
        if (!entry) return;
        entry.loading = false;
        entry.context = vm.createContext(sandbox);

        try {
            vm.runInContext(script, entry.context);
        } catch (e) {
            entry.hasCrashed = true;
            entry.error = e;
        }
    }).catch(e => {
        if (services.has(mdl.fullName)) {
            services.get(mdl.fullName).loading = false;
            services.get(mdl.fullName).hasCrashed = true;
            services.get(mdl.fullName).error = e;
        } else {
            services.set(mdl.fullName, {
                context: null,
                hasCrashed: true,
                error: e,
                loading: false
            });
        }
    });
}

module.exports = startService;
