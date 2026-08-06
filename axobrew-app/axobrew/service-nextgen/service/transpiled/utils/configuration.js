"use strict";

var fs = require('fs');
function readConfig() {
  if (!fs.existsSync('/home/owner/share/tizenbrewConfig.json')) {
    return {
      modules: ["npm/@foxreis/tizentube"],
      autoLaunchServiceList: [],
      autoLaunchModule: '',
      logsEnabled: true
    };
  }
  try {
    return JSON.parse(fs.readFileSync('/home/owner/share/tizenbrewConfig.json', 'utf8'));
  } catch (e) {
    console.error('Config file is corrupted, using defaults. ' + e);
    return {
      modules: ["npm/@foxreis/tizentube"],
      autoLaunchServiceList: [],
      autoLaunchModule: '',
      logsEnabled: true
    };
  }
}
function writeConfig(config) {
  fs.writeFileSync('/home/owner/share/tizenbrewConfig.json', JSON.stringify(config, null, 4));
}

// Normalized dev server settings with safe defaults. The values are
// user-configurable from the Settings UI and are applied without restarting
// the service.
function getDevServerConfig() {
  var config = readConfig();
  var dev = config.devServer || {};
  var port = Number(dev.port);
  return {
    enabled: dev.enabled !== false,
    host: typeof dev.host === 'string' && dev.host.trim() ? dev.host.trim() : '192.168.1.99',
    port: port > 0 && port < 65536 ? port : 8080
  };
}
module.exports = {
  readConfig,
  writeConfig,
  getDevServerConfig
};