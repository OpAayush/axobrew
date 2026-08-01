"use strict";

module.exports.onStart = function () {
    console.log('Service started');
    const adbhost = require('adbhost');
    const express = require('express');
    const fetch = require('node-fetch');
    const fs = require('fs');
    const path = require('path');
    const { readConfig, writeConfig } = require('./utils/configuration.js');
    const { loadModules, loadDevModule } = require('./utils/moduleLoader.js');
    const startDebugging = require('./utils/debugger.js');
    const startService = require('./utils/serviceLauncher.js');
    const { getDevResourceUrl, getDevServerConfig } = require('./utils/devServer.js');
    const { Connection, Events } = require('./utils/wsCommunication.js');
    let WebSocket;
    if (process.version === 'v4.4.3') {
        WebSocket = require('ws-old');
    } else {
        WebSocket = require('ws-new');
    }


    const app = express();
    let deviceIP;
    const platformVersion = tizen.systeminfo.getCapability('http://tizen.org/feature/platform.version') || '';
    const isTizen3 = platformVersion.startsWith('3.0');

    // HTTP Proxy for modules 
    app.all('*', (req, res) => {
        if (req.url.startsWith('/module/')) {
            const splittedUrl = req.url.split('/');
            const encodedModuleName = splittedUrl[2];
            let moduleName;
            try {
                moduleName = decodeURIComponent(encodedModuleName);
            } catch (e) {
                return res.status(400).end();
            }
            const modulePath = req.url.replace(`/module/${encodedModuleName}/`, '');
            // Dev modules are served exclusively by the local dev server,
            // regular modules by their published source.
            const fetchUrl = moduleName.indexOf('dev/') === 0
                ? getDevResourceUrl(modulePath)
                : `https://cdn.jsdelivr.net/${moduleName}/${modulePath}${modulePath.includes('?') ? '&' : '?'}v=${Date.now()}`;
            if (!fetchUrl) return res.status(404).end();
            fetch(fetchUrl)
                .then(fetchRes => {
                    return fetchRes.body.pipe(res);
                })
                .then(() => {
                    res.setHeader('Access-Control-Allow-Origin', '*');
                    res.type(path.basename(modulePath).split('.').slice(-1)[0].split('?')[0]);
                })
                .catch(() => {
                    res.status(502).end();
                });
        } else {
            res.send(deviceIP);
        }
    });

    const wsServer = new WebSocket.Server({ server: app.listen(8081, "127.0.0.1") });

    let adbClient;
    let canLaunchInDebug = null;
    // Older models or a TV that was just booted may not have the developer
    // API up yet. Fail softly instead of crashing the service: keep
    // canLaunchInDebug as null so the UI keeps polling and retries.
    const checkCanLaunchInDebug = () => {
        fetch('http://127.0.0.1:8001/api/v2/').then(res => res.json())
            .then(json => {
                canLaunchInDebug = (json.device.developerIP === '127.0.0.1' || json.device.developerIP === '1.0.0.127') && json.device.developerMode === '1';
            })
            .catch(e => {
                console.error('Failed to fetch developer API. ' + e);
            });
    };
    checkCanLaunchInDebug();
    const inDebug = {
        tizenDebug: false,
        webDebug: false,
        rwiDebug: false
    };

    const services = new Map();
    const queuedEvents = [];
    let modulesCache = null;

    const currentModule = {
        name: '',
        appPath: '',
        moduleType: '',
        packageType: '',
        serviceFile: ''
    };

    const appControlData = {
        module: null,
        args: null
    };

    // Load the regular modules and the independent dev module (if the dev
    // server answers - otherwise it is silently skipped, no error, not listed).
    const reloadModules = () => {
        return Promise.all([loadModules(), loadDevModule()]).then(([modules, devModule]) => {
            const fullList = devModule ? modules.concat(devModule) : modules;
            modulesCache = fullList;
            return fullList;
        });
    };

    // GetModules broadcasts the module list together with the current dev
    // server configuration, so the Settings UI can show and edit it.
    const getModulesPayload = (modules) => {
        return {
            modules: modules,
            devServer: getDevServerConfig()
        };
    };

    // Serialize reloads: pressing reload multiple times (or reloading while
    // opening a module) must not start overlapping fetches against the dev
    // server. One reload at a time; a pending one is coalesced.
    let reloadingModules = false;
    let reloadQueued = false;
    const reloadModulesAndSend = (wsConn) => {
        if (reloadingModules) {
            reloadQueued = true;
            return;
        }
        reloadingModules = true;
        reloadModules().then(modules => {
            reloadingModules = false;
            wsConn.send(wsConn.Event(Events.GetModules, getModulesPayload(modules)));
            if (reloadQueued) {
                reloadQueued = false;
                reloadModulesAndSend(wsConn);
            }
        });
    };

    // If the network is not up yet (TV just booted, older models), keep
    // retrying in the background instead of leaving the service with an
    // empty module list.
    const loadModulesWithRetry = () => {
        reloadModules().then(modules => {
            const hasRealModule = modules.some(m => m.appName !== 'Unknown Module');
            if (!hasRealModule) {
                console.error('No modules could be loaded. Retrying in 30 seconds.');
                setTimeout(loadModulesWithRetry, 30000);
                return;
            }
            const serviceModuleList = readConfig().autoLaunchServiceList;
            if (serviceModuleList.length > 0) {
                serviceModuleList.forEach(module => {
                    const service = modules.find(m => m.name === module);
                    if (service) startService(service, services);
                });
            }
            autoLaunchModuleAtBoot();
        });
    };
    loadModulesWithRetry();


    // On older Tizen models (e.g. Tizen 4) the TV never auto-runs the
    // TizenBrew app at boot, so the module auto-launch chain (which needs the
    // app running in debug mode) never starts. The system does start this
    // service periodically, so the service kicks off the debug relaunch
    // itself: the app opens, the debugger attaches and auto-launches the
    // configured module. A timestamp file prevents re-triggering on service
    // restarts/crashes (module would interrupt what the user is watching).
    const autoLaunchModuleAtBoot = () => {
        const config = readConfig();
        if (!config.autoLaunchModule) return;
        if (inDebug.tizenDebug || inDebug.webDebug) return;

        const autoLaunchTimePath = '/home/owner/share/tizenbrewAutoLaunchTime';
        try {
            if (fs.existsSync(autoLaunchTimePath)) {
                const lastLaunch = Number(fs.readFileSync(autoLaunchTimePath, 'utf8')) || 0;
                if (Date.now() - lastLaunch < 3600000) return;
            }
            fs.writeFileSync(autoLaunchTimePath, String(Date.now()));
        } catch (e) {
            console.error('autoLaunch time file error. ' + e);
        }

        const module = modulesCache.find(m => m.fullName === config.autoLaunchModule);
        if (!module) return;

        currentModule.fullName = module.fullName;
        currentModule.name = module.name;
        currentModule.appPath = module.appPath;
        currentModule.moduleType = module.moduleType;
        currentModule.packageType = module.packageType;
        currentModule.serviceFile = module.serviceFile;
        currentModule.mainFile = module.mainFile;
        currentModule.tizenAppId = module.tizenAppId;
        currentModule.evaluateScriptOnDocumentStart = module.evaluateScriptOnDocumentStart;
        currentModule.dev = module.dev;

        console.log('Auto-launching module: ' + config.autoLaunchModule);
        setTimeout(() => createAdbConnection('127.0.0.1', currentModule), 20000);
    };


    function createAdbConnection(ip, mdl) {
        deviceIP = ip;
        if (adbClient) {
            if (!adbClient._stream) {
                adbClient._stream.removeAllListeners('connect');
                adbClient._stream.removeAllListeners('error');
                adbClient._stream.removeAllListeners('close');
            }
        }

        adbClient = adbhost.createConnection({ host: '127.0.0.1', port: 26101 });

        adbClient._stream.on('connect', () => {
            console.log('ADB connection established');
            //Launch app
            const tbPackageId = tizen.application.getAppInfo().packageId;
            const shellCmd = adbClient.createStream(`shell:0 debug ${tbPackageId}.TizenBrewStandalone${isTizen3 ? ' 0' : ''}`);
            shellCmd.on('data', function dataIncoming(data) {
                const dataString = data.toString();
                if (dataString.includes('debug')) {
                    const port = Number(dataString.substr(dataString.indexOf(':') + 1, 6).replace(' ', ''));
                    startDebugging(port, queuedEvents, services, ip, mdl, inDebug, appControlData, false);
                    setTimeout(() => adbClient._stream.end(), 1000);
                }
            });
        });

        adbClient._stream.on('error', (e) => {
            console.log('ADB connection error. ' + e);
        });
        adbClient._stream.on('close', () => {
            console.log('ADB connection closed.');
        });
    }


    wsServer.on('connection', (ws) => {
        const wsConn = new Connection(ws);
        for (const event of queuedEvents) {
            wsConn.send(event);
            queuedEvents.splice(queuedEvents.indexOf(event), 1);
        }
        services.set('wsConn', wsConn);
        ws.on('message', (message) => {
            let msg;
            try {
                msg = JSON.parse(message)
            } catch (e) {
                return wsConn.send(wsConn.Event(Events.Error, `Invalid JSON: ${message}`));
            }

            const { type, payload } = msg;

            switch (type) {
                case Events.AppControlData: {
                    const moduleMetadata = [
                        payload.package.substring(0, payload.package.indexOf('/')),
                        payload.package.substring(payload.package.indexOf('/') + 1)
                    ];
                    const module = modulesCache.find(m => m.name === moduleMetadata[1]);

                    if (!module) {
                        return wsConn.send(wsConn.Event(Events.Error, 'App Control module not found.'));
                    }

                    appControlData.module = module;
                    appControlData.args = payload.args;

                    wsConn.send(wsConn.Event(Events.AppControlData, null));
                    break;
                }
                case Events.GetDebugStatus: {
                    wsConn.send(wsConn.Event(Events.GetDebugStatus, inDebug));
                    break;
                }
                case Events.CanLaunchInDebug: {
                    checkCanLaunchInDebug();
                    wsConn.send(wsConn.Event(Events.CanLaunchInDebug, canLaunchInDebug));
                    break;
                }
                case Events.ReLaunchInDebug: {
                    setTimeout(() => {
                        createAdbConnection(payload.tvIP, currentModule);
                    }, 1000);
                    break;
                }
                case Events.GetModules: {
                    wsConn.isReady = true;
                    services.set('wsConn', wsConn);

                    if (payload) {
                        reloadModulesAndSend(wsConn);
                    } else wsConn.send(wsConn.Event(Events.GetModules, getModulesPayload(modulesCache)));
                    break;
                }
                case Events.SetDevServer: {
                    const config = readConfig();
                    config.devServer = {
                        enabled: payload.enabled !== false,
                        host: typeof payload.host === 'string' && payload.host.trim() ? payload.host.trim() : '192.168.1.99',
                        port: (Number(payload.port) > 0 && Number(payload.port) < 65536) ? Number(payload.port) : 8080
                    };
                    try {
                        writeConfig(config);
                    } catch (e) {
                        console.error('Failed to save dev server config. ' + e);
                    }
                    console.log('Dev server config updated: ' + JSON.stringify(config.devServer));
                    // Refresh the module list so the dev module appears or
                    // disappears immediately based on the new settings.
                    reloadModulesAndSend(wsConn);
                    break;
                }
                case Events.LaunchModule: {
                    const mdl = payload;
                    currentModule.fullName = mdl.fullName;
                    currentModule.name = mdl.name;
                    currentModule.appPath = mdl.appPath;
                    currentModule.moduleType = mdl.moduleType;
                    currentModule.packageType = mdl.packageType;
                    currentModule.serviceFile = mdl.serviceFile;
                    currentModule.dev = mdl.dev;

                    if (mdl.packageType === 'app') {
                        inDebug.webDebug = false;
                        inDebug.tizenDebug = false;
                    } else {
                        currentModule.mainFile = mdl.mainFile;
                        currentModule.tizenAppId = mdl.tizenAppId;
                        currentModule.evaluateScriptOnDocumentStart = mdl.evaluateScriptOnDocumentStart;
                    }

                    if (mdl.serviceFile) {
                        if (services.has(mdl.fullName)) {
                            if (services.get(mdl.fullName).hasCrashed) {
                                services.delete(mdl.fullName);
                                startService(mdl, services);
                            }
                        } else startService(mdl, services);
                    }
                    break;
                }
                case Events.StartService: {
                    const mdl = payload;
                    if (payload.serviceFile && services.has(mdl.fullName)) {
                        if (services.get(mdl.fullName).hasCrashed) {
                            services.delete(mdl.fullName);
                            startService(mdl, services);
                        }
                    } else startService(mdl, services);
                    break;
                }
                case Events.GetServiceStatuses: {
                    const serviceList = [];
                    for (const map of services) {
                        serviceList.push({
                            name: map[0],
                            hasCrashed: map[1].hasCrashed,
                            error: map[1].error
                        });
                    }
                    wsConn.send(wsConn.Event(Events.GetServiceStatuses, serviceList));
                    break;
                }
                case Events.ModuleAction: {
                    const { action, module } = payload;

                    const config = readConfig();
                    switch (action) {
                        case 'add': {
                            const index = config.modules.findIndex(m => m === module);
                            if (index === -1) {
                                config.modules.push(module);
                                writeConfig(config);
                            }
                            break;
                        }
                        case 'remove': {
                            const index = config.modules.findIndex(m => m === module);
                            if (index !== -1) {
                                config.modules.splice(index, 1);
                                writeConfig(config);
                            }
                            break;
                        }
                        case 'autolaunch': {
                            config.autoLaunchModule = module;
                            writeConfig(config);
                            break;
                        }
                        case 'autolaunchService': {
                            config.autoLaunchServiceList = module;
                            writeConfig(config);
                            break;
                        }
                    }
                    break;
                }
                case Events.Ready: {
                    wsConn.isReady = true;
                    services.set('wsConn', wsConn);
                    break;
                }
                default: {
                    wsConn.send(wsConn.Event(Events.Error, 'Invalid event type.'));
                    break;
                }
            }
        });
    });
}
