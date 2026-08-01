"use strict";

const DEV_SERVER_URL = 'http://192.168.1.99:8080';
const isDev = DEV_SERVER_URL.length > 0;

module.exports = {
    isDev,
    // All resources of the dev module (package.json, user script, service
    // file, extra assets) are served exclusively by the local dev server.
    getDevResourceUrl(resourcePath) {
        const resource = resourcePath || '';
        const cacheBust = resource.includes('?') ? '&' : '?';
        return `${DEV_SERVER_URL}/${resource}${cacheBust}v=${Date.now()}`;
    },
    getUserScriptUrl() {
        return module.exports.getDevResourceUrl('dist/userScript.js');
    },
    getDevPackageJsonUrl() {
        return module.exports.getDevResourceUrl('package.json');
    }
};
