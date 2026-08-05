"use strict";

const CDP = require('chrome-remote-interface');
const { Events } = require('./wsCommunication.js');
const { readConfig } = require('./configuration.js');
const WebSocket = require('ws');
const { fetchTextWithRetry } = require('./network.js');

const modulesCache = new Map();

// The dev module's user script is served by the local dev server (fresh on
// every page load), regular modules by jsDelivr (cached).
const { getDevResourceUrl } = require('./devServer.js');

const moduleScriptCache = {
    dev: null,
    at: 0
};

// chrome-remote-interface method calls return promises. An evaluate can
// reject when the page navigated away and the execution context is gone;
// log it so the next execution context retries the injection.
function safeEvaluate(client, expression, contextId) {
    if (!expression) return Promise.resolve();
    return client.Runtime.evaluate({ expression: expression, contextId: contextId })
        .catch(e => console.error('Userscript evaluate failed: ' + (e.message || e)));
}

function getModuleScriptUrl(mdl) {
    if (mdl.dev) return getDevResourceUrl(mdl.mainFile || 'dist/userScript.js');
    return `https://cdn.jsdelivr.net/${mdl.fullName}/${mdl.mainFile}?v=${Date.now()}`;
}

// A single page load creates several execution contexts in quick succession.
// For the dev module, share one fetch for ~5 seconds so the dev server is
// never flooded with duplicate user script requests (which made loading
// flaky, especially right after a module reload). Regular modules keep
// fetching per context but with a timeout. Dev fetches retry twice with
// backoff; the dev server is on the local network and slow cold starts
// (Windows Defender scanning http-server's first read) need the extra time.
function getModuleScript(mdl) {
    if (mdl.dev && moduleScriptCache.dev && Date.now() - moduleScriptCache.at < 5000) {
        return Promise.resolve(moduleScriptCache.dev);
    }
    const url = getModuleScriptUrl(mdl);
    const attempt = fetchTextWithRetry(url, 15000, mdl.dev ? 2 : 1, mdl.dev ? 'dev userscript' : 'userscript')
        .then(text => {
            if (mdl.dev) {
                moduleScriptCache.dev = text;
                moduleScriptCache.at = Date.now();
            }
            return text;
        });
    return attempt;
}

// A single page load usually creates one execution context for the module
// page, so the user script gets exactly one fetch attempt. If that first
// fetch fails (slow dev server cold start) this retries on the same context
// with growing delays instead of giving up until the next page load. Users
// used to hold the enter button for a few seconds to force this by accident
// (every repeat click re-created the context and re-fetched the script).
function injectModuleScript(client, mdl, contextId, retriesLeft) {
    const cache = mdl.dev ? null : modulesCache.get(mdl.fullName);
    if (cache) return safeEvaluate(client, cache, contextId);
    getModuleScript(mdl).then(modFile => {
        modulesCache.set(mdl.fullName, modFile);
        safeEvaluate(client, modFile, contextId);
    }).catch(e => {
        if (retriesLeft <= 0) {
            return safeEvaluate(client, `alert("Failed to load module: '${mdl.fullName}'. Please relaunch axobrew to try again.")`, contextId);
        }
        console.error('Userscript fetch failed, retrying (' + retriesLeft + ' left). ' + (e.message || e));
        setTimeout(() => injectModuleScript(client, mdl, contextId, retriesLeft - 1), [1000, 2000, 4000, 8000][4 - retriesLeft] || 8000);
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
                    injectModuleScript(client, mdl, msg.context.id, 4);
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
                mdl.dev = false;
                mdl.evaluateScriptOnDocumentStart = false;
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

// Wait until an actually OPEN socket is registered. A stale connection (the
// app closed itself and relaunched in debug) would swallow the event, so the
// previous isReady shortcut is gone: the event retries every 50ms until the
// freshly relaunched UI connects and registers its socket.
function sendClientInformation(clientConn, data) {
    const clientConnection = clientConn.get('wsConn');
    if (!clientConnection || !clientConnection.connection || clientConnection.connection.readyState !== WebSocket.OPEN) {
        return setTimeout(() => sendClientInformation(clientConn, data), 50);
    }
    setTimeout(() => {
        clientConnection.send(data);
    }, 500);
}

module.exports = startDebugging;
