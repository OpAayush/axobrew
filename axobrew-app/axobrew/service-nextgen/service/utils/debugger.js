"use strict";

const CDP = require('chrome-remote-interface');
const fetch = require('node-fetch');
const { Events } = require('./wsCommunication.js');
const { readConfig } = require('./configuration.js');
const WebSocket = require('ws');

const modulesCache = new Map();

// The dev module's user script is served by the local dev server (fresh on
// every page load), regular modules by jsDelivr (cached).
const { getDevResourceUrl } = require('./devServer.js');

const moduleScriptCache = {
    dev: null,
    at: 0
};

function fetchWithTimeout(url, ms) {
    return Promise.race([
        fetch(url),
        new Promise((resolve, reject) => setTimeout(() => reject(new Error('Fetch timed out: ' + url)), ms))
    ]);
}

function getModuleScriptUrl(mdl) {
    if (mdl.dev) return getDevResourceUrl(mdl.mainFile || 'dist/userScript.js');
    return `https://cdn.jsdelivr.net/${mdl.fullName}/${mdl.mainFile}?v=${Date.now()}`;
}

// A single page load creates several execution contexts in quick succession.
// For the dev module, share one fetch for ~5 seconds so the dev server is
// never flooded with duplicate user script requests (which made loading
// flaky, especially right after a module reload). Regular modules keep
// fetching per context but with a timeout.
function getModuleScript(mdl) {
    if (mdl.dev && moduleScriptCache.dev && Date.now() - moduleScriptCache.at < 5000) {
        return Promise.resolve(moduleScriptCache.dev);
    }
    const fetchOnce = () => fetchWithTimeout(getModuleScriptUrl(mdl), mdl.dev ? 10000 : 15000)
        .then(res => res.text());
    const attempt = mdl.dev
        ? fetchOnce().catch(() => new Promise(resolve => setTimeout(resolve, 750)).then(fetchOnce))
        : fetchOnce();
    return attempt.then(text => {
        if (mdl.dev) {
            moduleScriptCache.dev = text;
            moduleScriptCache.at = Date.now();
        }
        return text;
    });
}

function startDebugging(port, queuedEvents, clientConn, ip, mdl, inDebug, appControlData, isAnotherApp, attempts) {
    if (!attempts) attempts = 1;
    if (!isAnotherApp) inDebug.tizenDebug = true;
    try {
        CDP({ port, host: ip, local: true }, (client) => {
            client.Runtime.enable();
            client.Debugger.enable();

            client.on('Runtime.executionContextCreated', (msg) => {
                if (!mdl.evaluateScriptOnDocumentStart && mdl.name !== '') {
                    const cache = mdl.dev ? null : modulesCache.get(mdl.fullName);
                    if (cache) {
                        client.Runtime.evaluate({ expression: cache, contextId: msg.context.id });
                    } else {
                        getModuleScript(mdl).then(modFile => {
                            modulesCache.set(mdl.fullName, modFile);
                            client.Runtime.evaluate({ expression: modFile, contextId: msg.context.id });
                        }).catch(e => {
                            client.Runtime.evaluate({ expression: `alert("Failed to load module: '${mdl.fullName}'. Please relaunch axobrew to try again.")`, contextId: msg.context.id });
                        });
                    }
                } else if (mdl.name !== '' && mdl.evaluateScriptOnDocumentStart) {
                    const cache = mdl.dev ? null : modulesCache.get(mdl.fullName);
                    const clientConnection = clientConn.get('wsConn');
                    if (cache) {
                        client.Page.addScriptToEvaluateOnNewDocument({ expression: cache });
                        sendClientInformation(clientConn, clientConnection.Event(Events.LaunchModule, mdl.name));
                    } else {
                        getModuleScript(mdl).then(modFile => {
                            modulesCache.set(mdl.fullName, modFile);
                            sendClientInformation(clientConn, clientConnection.Event(Events.LaunchModule, mdl.name));
                            client.Page.addScriptToEvaluateOnNewDocument({ expression: modFile });
                        }).catch(e => {
                            sendClientInformation(clientConn, clientConnection.Event(Events.LaunchModule, mdl.name));
                            client.Page.addScriptToEvaluateOnNewDocument({ expression: `alert("Failed to load module: '${mdl.fullName}'. Please relaunch axobrew to try again.")` });
                        });
                    }
                }
            });

            client.on('disconnect', () => {
                if (isAnotherApp) return;

                inDebug.tizenDebug = false;
                inDebug.webDebug = false;
                inDebug.rwiDebug = false;

                mdl.fullName = '';
                mdl.name = '';
                mdl.appPath = '';
                mdl.moduleType = '';
                mdl.packageType = '';
                mdl.serviceFile = '';
                mdl.mainFile = '';
            });

            if (!isAnotherApp) {
                const clientConnection = clientConn.get('wsConn');
                if (appControlData.module) {
                    const data = clientConnection.Event(Events.CanLaunchModules, {
                        type: 'appControl',
                        module: appControlData.module,
                        args: appControlData.args
                    });
                    sendClientInformation(clientConn, data);
                } else {
                    const config = readConfig();
                    if (config.autoLaunchModule) {
                        const data = clientConnection.Event(Events.CanLaunchModules, {
                            type: 'autolaunch',
                            module: config.autoLaunchModule
                        });

                        sendClientInformation(clientConn, data);

                    } else {
                        const data = clientConnection.Event(Events.CanLaunchModules, null);
                        sendClientInformation(clientConn, data);
                    }
                }
            }
            if (!isAnotherApp) inDebug.webDebug = true;
            appControlData = null;
        }).on('error', (err) => {
            if (attempts >= 45) {
                if (!isAnotherApp) {
                    clientConn.send(clientConn.Event(Events.Error, 'Failed to connect to the debugger'));
                    inDebug.tizenDebug = false;
                    return;
                } else return;
            }
            attempts++;
            setTimeout(() => startDebugging(port, queuedEvents, clientConn, ip, mdl, inDebug, appControlData, isAnotherApp, attempts), 750)
        });
    } catch (e) {
        if (attempts >= 45) {
            if (!isAnotherApp) {
                clientConn.send(clientConn.Event(Events.Error, 'Failed to connect to the debugger'));
                inDebug.tizenDebug = false;
                return;
            } else return;
        }
        attempts++;
        setTimeout(() => startDebugging(port, queuedEvents, clientConn, ip, mdl, inDebug, appControlData, isAnotherApp, attempts), 750)
        return;
    }
}

function sendClientInformation(clientConn, data) {
    const clientConnection = clientConn.get('wsConn');
    if ((clientConnection && clientConnection.connection && (clientConnection.connection.readyState !== WebSocket.OPEN && !clientConnection.isReady)) || !clientConnection) {
        return setTimeout(() => sendClientInformation(clientConn, data), 50);
    }
    setTimeout(() => {
        clientConnection.send(data);
    }, 500);
}

module.exports = startDebugging;
