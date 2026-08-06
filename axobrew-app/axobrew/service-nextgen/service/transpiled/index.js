"use strict";

function _createForOfIteratorHelper(r, e) { var t = "undefined" != typeof Symbol && r[Symbol.iterator] || r["@@iterator"]; if (!t) { if (Array.isArray(r) || (t = _unsupportedIterableToArray(r)) || e && r && "number" == typeof r.length) { t && (r = t); var _n = 0, F = function F() {}; return { s: F, n: function n() { return _n >= r.length ? { done: !0 } : { done: !1, value: r[_n++] }; }, e: function e(r) { throw r; }, f: F }; } throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); } var o, a = !0, u = !1; return { s: function s() { t = t.call(r); }, n: function n() { var r = t.next(); return a = r.done, r; }, e: function e(r) { u = !0, o = r; }, f: function f() { try { a || null == t.return || t.return(); } finally { if (u) throw o; } } }; }
function _slicedToArray(r, e) { return _arrayWithHoles(r) || _iterableToArrayLimit(r, e) || _unsupportedIterableToArray(r, e) || _nonIterableRest(); }
function _nonIterableRest() { throw new TypeError("Invalid attempt to destructure non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }
function _unsupportedIterableToArray(r, a) { if (r) { if ("string" == typeof r) return _arrayLikeToArray(r, a); var t = {}.toString.call(r).slice(8, -1); return "Object" === t && r.constructor && (t = r.constructor.name), "Map" === t || "Set" === t ? Array.from(r) : "Arguments" === t || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(t) ? _arrayLikeToArray(r, a) : void 0; } }
function _arrayLikeToArray(r, a) { (null == a || a > r.length) && (a = r.length); for (var e = 0, n = Array(a); e < a; e++) n[e] = r[e]; return n; }
function _iterableToArrayLimit(r, l) { var t = null == r ? null : "undefined" != typeof Symbol && r[Symbol.iterator] || r["@@iterator"]; if (null != t) { var e, n, i, u, a = [], f = !0, o = !1; try { if (i = (t = t.call(r)).next, 0 === l) { if (Object(t) !== t) return; f = !1; } else for (; !(f = (e = i.call(t)).done) && (a.push(e.value), a.length !== l); f = !0); } catch (r) { o = !0, n = r; } finally { try { if (!f && null != t.return && (u = t.return(), Object(u) !== u)) return; } finally { if (o) throw n; } } return a; } }
function _arrayWithHoles(r) { if (Array.isArray(r)) return r; }
module.exports.onStart = function () {
  console.log('Service started');
  var adbhost = require('adbhost');
  var express = require('express');
  var fetch = require('node-fetch');
  var path = require('path');
  var _require = require('./utils/configuration.js'),
    readConfig = _require.readConfig,
    writeConfig = _require.writeConfig;
  var _require2 = require('./utils/moduleLoader.js'),
    loadModules = _require2.loadModules,
    loadDevModule = _require2.loadDevModule;
  var startDebugging = require('./utils/debugger.js');
  var startService = require('./utils/serviceLauncher.js');
  var _require3 = require('./utils/devServer.js'),
    getDevResourceUrl = _require3.getDevResourceUrl,
    getDevServerConfig = _require3.getDevServerConfig;
  var _require4 = require('./utils/wsCommunication.js'),
    Connection = _require4.Connection,
    Events = _require4.Events;
  var _require5 = require('./utils/moduleHealth.js'),
    getHealth = _require5.getHealth;
  var _require6 = require('./utils/prefetch.js'),
    prefetchModule = _require6.prefetchModule;
  var WebSocket;
  if (process.version === 'v4.4.3') {
    WebSocket = require('ws-old');
  } else {
    WebSocket = require('ws-new');
  }

  // In-app log viewer: keep a ring buffer of every console call so the UI
  // can show what the service is doing. Logging can be turned off from
  // Settings; the buffer stays but stops growing.
  var LOG_LIMIT = 500;
  var logBuffer = [];
  var logsEnabled = readConfig().logsEnabled !== false;
  function pushLog(level, args) {
    if (!logsEnabled) return;
    var parts = [];
    for (var i = 0; i < args.length; i++) {
      var val = args[i];
      if (typeof val === 'object' && val !== null) {
        try {
          val = JSON.stringify(val);
        } catch (e) {
          val = String(val);
        }
      }
      parts.push(String(val));
    }
    logBuffer.push({
      time: Date.now(),
      level: level,
      msg: parts.join(' ').slice(0, 1000)
    });
    while (logBuffer.length > LOG_LIMIT) logBuffer.shift();
  }
  (function patchConsole() {
    var origLog = console.log;
    var origError = console.error;
    var origWarn = console.warn;
    console.log = function () {
      pushLog('info', arguments);
      origLog.apply(console, arguments);
    };
    console.error = function () {
      pushLog('error', arguments);
      origError.apply(console, arguments);
    };
    console.warn = function () {
      pushLog('warn', arguments);
      origWarn.apply(console, arguments);
    };
  })();
  var app = express();
  var deviceIP;
  var platformVersion = tizen.systeminfo.getCapability('http://tizen.org/feature/platform.version') || '';
  var isTizen3 = platformVersion.startsWith('3.0');

  // HTTP Proxy for modules 
  app.all('*', function (req, res) {
    if (req.url.startsWith('/module/')) {
      var splittedUrl = req.url.split('/');
      var encodedModuleName = splittedUrl[2];
      var moduleName;
      try {
        moduleName = decodeURIComponent(encodedModuleName);
      } catch (e) {
        return res.status(400).end();
      }
      var modulePath = req.url.replace(`/module/${encodedModuleName}/`, '');
      // Dev modules are served exclusively by the local dev server,
      // regular modules by their published source.
      var fetchUrl = moduleName.indexOf('dev/') === 0 ? getDevResourceUrl(modulePath) : `https://cdn.jsdelivr.net/${moduleName}/${modulePath}${modulePath.includes('?') ? '&' : '?'}v=${Date.now()}`;
      if (!fetchUrl) return res.status(404).end();
      fetch(fetchUrl).then(function (fetchRes) {
        return fetchRes.body.pipe(res);
      }).then(function () {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.type(path.basename(modulePath).split('.').slice(-1)[0].split('?')[0]);
      }).catch(function () {
        res.status(502).end();
      });
    } else {
      res.send(deviceIP);
    }
  });
  var wsServer = new WebSocket.Server({
    server: app.listen(8081, "127.0.0.1")
  });
  var adbClient;
  var canLaunchInDebug = null;
  // Older models or a TV that was just booted may not have the developer
  // API up yet. Fail softly instead of crashing the service: keep
  // canLaunchInDebug as null so the UI keeps polling and retries.
  var checkCanLaunchInDebug = function checkCanLaunchInDebug() {
    return fetch('http://127.0.0.1:8001/api/v2/').then(function (res) {
      return res.json();
    }).then(function (json) {
      canLaunchInDebug = (json.device.developerIP === '127.0.0.1' || json.device.developerIP === '1.0.0.127') && json.device.developerMode === '1';
    }).catch(function (e) {
      console.error('Failed to fetch developer API. ' + e);
    });
  };
  checkCanLaunchInDebug();
  var inDebug = {
    tizenDebug: false,
    webDebug: false,
    rwiDebug: false
  };
  var services = new Map();
  var queuedEvents = [];
  var modulesCache = null;
  var currentModule = {
    name: '',
    appPath: '',
    moduleType: '',
    packageType: '',
    serviceFile: ''
  };

  // Copy the module the UI/debugger is working with. The debugger attaches
  // with this object, so it must carry every field (incl. the dev flag) or
  // the user script would fall back to a jsDelivr URL and never load.
  var fillCurrentModule = function fillCurrentModule(module) {
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
  };
  var appControlData = {
    module: null,
    args: null
  };

  // Load the regular modules and the independent dev module (if the dev
  // server answers - otherwise it is silently skipped, no error, not listed).
  var reloadModules = function reloadModules() {
    return Promise.all([loadModules(), loadDevModule()]).then(function (_ref) {
      var _ref2 = _slicedToArray(_ref, 2),
        modules = _ref2[0],
        devModule = _ref2[1];
      var fullList = devModule ? modules.concat(devModule) : modules;
      modulesCache = fullList;
      return fullList;
    });
  };

  // GetModules broadcasts the module list together with the current dev
  // server configuration, so the Settings UI can show and edit it.
  var getModulesPayload = function getModulesPayload(modules) {
    return {
      modules: modules,
      devServer: getDevServerConfig(),
      health: getHealth()
    };
  };

  // Serialize reloads: pressing reload multiple times (or reloading while
  // opening a module) must not start overlapping fetches against the dev
  // server. One reload at a time; a pending one is coalesced.
  var reloadingModules = false;
  var reloadQueued = false;
  var _reloadModulesAndSend = function reloadModulesAndSend(wsConn) {
    if (reloadingModules) {
      reloadQueued = true;
      return;
    }
    reloadingModules = true;
    reloadModules().then(function (modules) {
      reloadingModules = false;
      wsConn.send(wsConn.Event(Events.GetModules, getModulesPayload(modules)));
      if (reloadQueued) {
        reloadQueued = false;
        _reloadModulesAndSend(wsConn);
      }
    });
  };

  // If the network is not up yet (TV just booted, older models), keep
  // retrying in the background instead of leaving the service with an
  // empty module list.
  var _loadModulesWithRetry = function loadModulesWithRetry() {
    reloadModules().then(function (modules) {
      var hasRealModule = modules.some(function (m) {
        return m.appName !== 'Unknown Module';
      });
      if (!hasRealModule) {
        console.error('No modules could be loaded. Retrying in 30 seconds.');
        setTimeout(_loadModulesWithRetry, 30000);
        return;
      }
      var serviceModuleList = readConfig().autoLaunchServiceList;
      if (serviceModuleList.length > 0) {
        serviceModuleList.forEach(function (module) {
          // Settings stores full names ('npm/@foxreis/tizentube');
          // accept the short name too for old configs.
          var service = modules.find(function (m) {
            return m.fullName === module || m.name === module;
          });
          if (service) startService(service, services);
        });
      }
      // Warm the autostart module's script+service so the relaunch
      // window is fast when the app opens itself in debug mode.
      var launchConfig = readConfig();
      if (launchConfig.autoLaunchModule) {
        var autostart = modules.find(function (m) {
          return m.fullName === launchConfig.autoLaunchModule;
        });
        if (autostart) prefetchModule(autostart);
      }
    });
  };
  _loadModulesWithRetry();
  function createAdbConnection(ip, mdl, attempts) {
    if (!attempts) attempts = 1;
    deviceIP = ip;
    if (adbClient) {
      if (adbClient._stream) {
        adbClient._stream.removeAllListeners('connect');
        adbClient._stream.removeAllListeners('error');
        adbClient._stream.removeAllListeners('close');
      }
    }
    adbClient = adbhost.createConnection({
      host: '127.0.0.1',
      port: 26101
    });
    adbClient._stream.on('connect', function () {
      console.log('ADB connection established');
      //Launch app
      var tbPackageId = tizen.application.getAppInfo().packageId;
      console.log('Relaunching app in debug: ' + tbPackageId + '.AxoBrewStandalone');
      var shellCmd = adbClient.createStream(`shell:0 debug ${tbPackageId}.AxoBrewStandalone${isTizen3 ? ' 0' : ''}`);
      shellCmd.on('data', function dataIncoming(data) {
        var dataString = data.toString();
        console.log('ADB debug output: ' + dataString);
        if (dataString.includes('debug')) {
          var port = Number(dataString.substr(dataString.indexOf(':') + 1, 6).replace(' ', ''));
          console.log('Debug port parsed: ' + port);
          startDebugging(port, queuedEvents, services, ip, mdl, inDebug, appControlData, false);
          setTimeout(function () {
            return adbClient._stream.end();
          }, 1000);
        }
      });
    });
    adbClient._stream.on('error', function (e) {
      console.log('ADB connection error. ' + e);
      // The app may still be closing when the relaunch is requested;
      // retry a few times instead of giving up after one failure.
      if (attempts < 3) {
        setTimeout(function () {
          return createAdbConnection(ip, mdl, attempts + 1);
        }, 3000);
      }
    });
    adbClient._stream.on('close', function () {
      console.log('ADB connection closed.');
    });
  }
  wsServer.on('connection', function (ws) {
    var wsConn = new Connection(ws);
    for (var _i = 0, _queuedEvents = queuedEvents; _i < _queuedEvents.length; _i++) {
      var event = _queuedEvents[_i];
      wsConn.send(event);
      queuedEvents.splice(queuedEvents.indexOf(event), 1);
    }
    services.set('wsConn', wsConn);
    ws.on('close', function () {
      // Drop the stale connection: after the app closes and relaunches
      // in debug, the old socket must not receive debugger events
      // (they would be silently lost).
      if (services.get('wsConn') === wsConn) {
        services.delete('wsConn');
      }
    });
    ws.on('message', function (message) {
      var msg;
      try {
        msg = JSON.parse(message);
      } catch (e) {
        return wsConn.send(wsConn.Event(Events.Error, `Invalid JSON: ${message}`));
      }
      var _msg = msg,
        type = _msg.type,
        payload = _msg.payload;
      switch (type) {
        case Events.AppControlData:
          {
            var moduleMetadata = [payload.package.substring(0, payload.package.indexOf('/')), payload.package.substring(payload.package.indexOf('/') + 1)];
            var _module = modulesCache.find(function (m) {
              return m.name === moduleMetadata[1];
            });
            if (!_module) {
              return wsConn.send(wsConn.Event(Events.Error, 'App Control module not found.'));
            }
            appControlData.module = _module;
            appControlData.args = payload.args;
            wsConn.send(wsConn.Event(Events.AppControlData, null));
            break;
          }
        case Events.GetDebugStatus:
          {
            wsConn.send(wsConn.Event(Events.GetDebugStatus, inDebug));
            break;
          }
        case Events.CanLaunchInDebug:
          {
            // Resolve the developer API first, then answer: sending
            // the stale value would make the UI poll for nothing.
            checkCanLaunchInDebug().then(function () {
              wsConn.send(wsConn.Event(Events.CanLaunchInDebug, canLaunchInDebug));
            });
            break;
          }
        case Events.ReLaunchInDebug:
          {
            // The app just closed itself and is about to relaunch in
            // debug mode. Pre-fill the debugger's module from the
            // autolaunch config so the user script is injected into
            // the module page even if the UI's LaunchModule event
            // arrives late (after the first execution context).
            if (!currentModule.fullName) {
              var config = readConfig();
              if (config.autoLaunchModule) {
                var _module2 = modulesCache.find(function (m) {
                  return m.fullName === config.autoLaunchModule;
                });
                if (_module2) fillCurrentModule(_module2);
              }
            }
            prefetchModule(currentModule.fullName ? currentModule : null);
            // The UI exits itself ~2.2s after sending this event. The
            // debug relaunch must only run once the app process is
            // fully gone: running 'debug <appId>' against a live app
            // kills it but the shell stream carrying the debug port
            // dies with it, so the debugger never attaches and every
            // relaunched instance repeats the relaunch cycle.
            setTimeout(function () {
              createAdbConnection(payload.tvIP, currentModule, 1);
            }, 3000);
            break;
          }
        case Events.GetModules:
          {
            wsConn.isReady = true;
            services.set('wsConn', wsConn);
            if (payload) {
              _reloadModulesAndSend(wsConn);
            } else wsConn.send(wsConn.Event(Events.GetModules, getModulesPayload(modulesCache)));
            break;
          }
        case Events.SetDevServer:
          {
            var _config = readConfig();
            _config.devServer = {
              enabled: payload.enabled !== false,
              host: typeof payload.host === 'string' && payload.host.trim() ? payload.host.trim() : '192.168.1.99',
              port: Number(payload.port) > 0 && Number(payload.port) < 65536 ? Number(payload.port) : 8080
            };
            try {
              writeConfig(_config);
            } catch (e) {
              console.error('Failed to save dev server config. ' + e);
            }
            console.log('Dev server config updated: ' + JSON.stringify(_config.devServer));
            // Refresh the module list so the dev module appears or
            // disappears immediately based on the new settings.
            _reloadModulesAndSend(wsConn);
            break;
          }
        case Events.LaunchModule:
          {
            fillCurrentModule(payload);
            var mdl = payload;
            prefetchModule(mdl);
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
        case Events.StartService:
          {
            var _mdl = payload;
            if (payload.serviceFile && services.has(_mdl.fullName)) {
              if (services.get(_mdl.fullName).hasCrashed) {
                services.delete(_mdl.fullName);
                startService(_mdl, services);
              }
            } else startService(_mdl, services);
            break;
          }
        case Events.GetServiceStatuses:
          {
            var serviceList = [];
            var _iterator = _createForOfIteratorHelper(services),
              _step;
            try {
              for (_iterator.s(); !(_step = _iterator.n()).done;) {
                var map = _step.value;
                serviceList.push({
                  name: map[0],
                  hasCrashed: map[1].hasCrashed,
                  error: map[1].error
                });
              }
            } catch (err) {
              _iterator.e(err);
            } finally {
              _iterator.f();
            }
            wsConn.send(wsConn.Event(Events.GetServiceStatuses, serviceList));
            break;
          }
        case Events.ModuleAction:
          {
            var action = payload.action,
              _module3 = payload.module;
            var _config2 = readConfig();
            switch (action) {
              case 'add':
                {
                  var index = _config2.modules.findIndex(function (m) {
                    return m === _module3;
                  });
                  if (index === -1) {
                    _config2.modules.push(_module3);
                    writeConfig(_config2);
                  }
                  break;
                }
              case 'remove':
                {
                  var _index = _config2.modules.findIndex(function (m) {
                    return m === _module3;
                  });
                  if (_index !== -1) {
                    _config2.modules.splice(_index, 1);
                    writeConfig(_config2);
                  }
                  break;
                }
              case 'autolaunch':
                {
                  _config2.autoLaunchModule = _module3;
                  writeConfig(_config2);
                  break;
                }
              case 'autolaunchService':
                {
                  _config2.autoLaunchServiceList = _module3;
                  writeConfig(_config2);
                  break;
                }
            }
            break;
          }
        case Events.PrefetchModule:
          {
            if (payload && modulesCache) {
              var _module4 = modulesCache.find(function (m) {
                return m.fullName === payload;
              });
              if (_module4) prefetchModule(_module4);
            }
            break;
          }
        case Events.GetLogs:
          {
            if (payload && typeof payload.enabled === 'boolean') {
              logsEnabled = payload.enabled;
              var _config3 = readConfig();
              _config3.logsEnabled = logsEnabled;
              try {
                writeConfig(_config3);
              } catch (e) {
                console.error('Failed to save logs config. ' + e);
              }
            }
            wsConn.send(wsConn.Event(Events.GetLogs, {
              enabled: logsEnabled,
              logs: logBuffer
            }));
            break;
          }
        case Events.Ready:
          {
            wsConn.isReady = true;
            services.set('wsConn', wsConn);
            break;
          }
        default:
          {
            wsConn.send(wsConn.Event(Events.Error, 'Invalid event type.'));
            break;
          }
      }
    });
  });
};