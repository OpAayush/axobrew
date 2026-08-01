"use strict";

const DEV_SERVER_URL = 'http://192.168.1.99:8080';
const isDev = DEV_SERVER_URL.length > 0;

module.exports = {
    isDev,
    getUserScriptUrl() {
        return `${DEV_SERVER_URL}/dist/userScript.js?v=${Date.now()}`;
    },
    getPackageJsonUrl(module) {
        if (!isDev) return `https://cdn.jsdelivr.net/${module}/package.json?v=${Date.now()}`;
        return `${DEV_SERVER_URL}/package.json?v=${Date.now()}`;
    }
};
