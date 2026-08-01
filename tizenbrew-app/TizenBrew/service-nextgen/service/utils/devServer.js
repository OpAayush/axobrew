"use strict";

const { getDevServerConfig } = require('./configuration.js');

function getDevServerUrl() {
    const config = getDevServerConfig();
    if (!config.enabled) return '';
    return `http://${config.host}:${config.port}`;
}

module.exports = {
    // The dev server can be turned off or moved at runtime from the Settings
    // UI. Every call reads the current configuration, so changes apply
    // immediately without restarting the service.
    isDevServerEnabled() {
        return getDevServerConfig().enabled;
    },
    getDevServerConfig,
    // All resources of the dev module (package.json, user script, service
    // file, extra assets) are served exclusively by the local dev server.
    // Returns null when the dev server is disabled.
    getDevResourceUrl(resourcePath) {
        const base = getDevServerUrl();
        if (!base) return null;
        const resource = resourcePath || '';
        const cacheBust = resource.includes('?') ? '&' : '?';
        return `${base}/${resource}${cacheBust}v=${Date.now()}`;
    },
    getUserScriptUrl() {
        return module.exports.getDevResourceUrl('dist/userScript.js');
    },
    getDevPackageJsonUrl() {
        return module.exports.getDevResourceUrl('package.json');
    }
};
