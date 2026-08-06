"use strict";

var _require = require('./configuration.js'),
  readConfig = _require.readConfig;
var _require2 = require('./devServer.js'),
  isDevServerEnabled = _require2.isDevServerEnabled,
  getDevPackageJsonUrl = _require2.getDevPackageJsonUrl;
var _require3 = require('./network.js'),
  fetchJsonWithRetry = _require3.fetchJsonWithRetry;
function fetchPackageJson(module) {
  return fetchJsonWithRetry(`https://cdn.jsdelivr.net/${module}/package.json?v=${Date.now()}`, 15000, 1, 'package.json');
}
function unknownModule(module) {
  var splitData = [module.substring(0, module.indexOf('/')), module.substring(module.indexOf('/') + 1)];
  return {
    appName: 'Unknown Module',
    name: splitData[1],
    fullName: module,
    appPath: '',
    keys: [],
    moduleType: splitData[0],
    packageType: 'app',
    description: `Unknown module ${module}. Please check the module name and try again.`
  };
}
function buildModuleData(module, moduleJson) {
  var splitData = [module.substring(0, module.indexOf('/')), module.substring(module.indexOf('/') + 1)];
  var moduleMetadata = {
    name: splitData[1],
    type: splitData[0]
  };
  if (moduleJson.packageType === 'app') {
    return {
      fullName: module,
      appName: moduleJson.appName,
      version: moduleJson.version,
      name: moduleMetadata.name,
      appPath: `http://127.0.0.1:8081/module/${encodeURIComponent(module)}/${moduleJson.appPath}`,
      keys: moduleJson.keys ? moduleJson.keys : [],
      moduleType: moduleMetadata.type,
      packageType: moduleJson.packageType,
      description: moduleJson.description,
      serviceFile: moduleJson.serviceFile,
      dev: false
    };
  } else if (moduleJson.packageType === 'mods') {
    return {
      fullName: module,
      appName: moduleJson.appName,
      version: moduleJson.version,
      name: moduleMetadata.name,
      appPath: moduleJson.websiteURL,
      keys: moduleJson.keys ? moduleJson.keys : [],
      moduleType: moduleMetadata.type,
      packageType: moduleJson.packageType,
      description: moduleJson.description,
      serviceFile: moduleJson.serviceFile,
      tizenAppId: moduleJson.tizenAppId,
      mainFile: moduleJson.main,
      evaluateScriptOnDocumentStart: moduleJson.evaluateScriptOnDocumentStart,
      dev: false
    };
  }
  return null;
}

// Regular modules are loaded from their published sources (jsDelivr/GitHub)
// only. They are completely independent from the dev module below.
function loadModules() {
  var config = readConfig();
  var modules = config.modules;
  var modulePromises = modules.map(function (module) {
    return fetchPackageJson(module).then(function (moduleJson) {
      return buildModuleData(module, moduleJson) || unknownModule(module);
    }).catch(function (e) {
      console.error(e);
      return unknownModule(module);
    });
  });
  return Promise.all(modulePromises);
}

// The dev module is independent: it is only loaded from the local dev server
// and never from jsDelivr. If the dev server is unreachable it is silently
// skipped (null) - no error is shown and it is not listed in the UI.
function loadDevModule() {
  if (!isDevServerEnabled()) return Promise.resolve(null);
  var devPackageJsonUrl = getDevPackageJsonUrl();
  if (!devPackageJsonUrl) return Promise.resolve(null);
  return fetchJsonWithRetry(devPackageJsonUrl, 8000, 1, 'dev package.json').then(function (moduleJson) {
    var moduleData = buildModuleData(`dev/${moduleJson.name || 'dev'}`, moduleJson);
    if (moduleData) moduleData.dev = true;
    return moduleData;
  }).catch(function (e) {
    console.log('Dev server unreachable, skipping dev module. ' + (e.message || e));
    return null;
  });
}
module.exports = {
  loadModules,
  loadDevModule
};