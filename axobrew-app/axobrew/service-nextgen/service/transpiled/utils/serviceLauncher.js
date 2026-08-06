"use strict";

var vm = require('vm');
var _require = require('./devServer.js'),
  getDevResourceUrl = _require.getDevResourceUrl;
var _require2 = require('./network.js'),
  fetchTextWithRetry = _require2.fetchTextWithRetry;
var _require3 = require('./prefetch.js'),
  getServiceText = _require3.getServiceText;
var _require4 = require('./moduleHealth.js'),
  setService = _require4.setService;
function startService(mdl, services) {
  var sandbox = {};
  Object.getOwnPropertyNames(global).forEach(function (prop) {
    var disAllowed = ['services', 'module', 'global', 'inDebug', 'currentClient', 'currentModule'];
    // Node.js v4.4.3 does not have Array.prototype.includes...
    if (disAllowed.indexOf(prop) >= 0) return;
    sandbox[prop] = global[prop];
  });
  sandbox['require'] = require;
  sandbox['tizen'] = global.tizen;
  sandbox['module'] = {
    exports: {}
  };
  var serviceUrl = mdl.dev ? getDevResourceUrl(mdl.serviceFile) : `https://cdn.jsdelivr.net/${mdl.fullName}/${mdl.serviceFile}?v=${Date.now()}`;
  fetchService(mdl, services, sandbox, serviceUrl, 0);
}
function runServiceScript(mdl, services, sandbox, script) {
  var entry = services.get(mdl.fullName);
  if (!entry) return;
  entry.loading = false;
  entry.context = vm.createContext(sandbox);
  try {
    vm.runInContext(script, entry.context);
    setService(mdl.fullName, 'running');
  } catch (e) {
    console.error('Service crashed: ' + (e.message || e));
    entry.hasCrashed = true;
    entry.error = e;
    setService(mdl.fullName, 'crashed', e);
  }
}

// If the first fetch fails (slow dev server cold start), keep retrying in
// the background with growing delays so a single module click is enough.
// Previously the service only got one shot and sat as 'crashed' until the
// module was clicked again (users discovered that holding enter for a few
// seconds worked, because every repeated click restarted the fetch).
function fetchService(mdl, services, sandbox, serviceUrl, attempt) {
  if (!serviceUrl) {
    services.set(mdl.fullName, {
      context: null,
      hasCrashed: true,
      error: new Error('Dev server is disabled.'),
      loading: false
    });
    setService(mdl.fullName, 'crashed', new Error('Dev server is disabled.'));
    return;
  }

  // Mark the service as loading immediately so repeated LaunchModule
  // events (e.g. user pressing reload and opening the module right after)
  // do not start concurrent duplicate fetches while it is downloading.
  services.set(mdl.fullName, {
    context: null,
    hasCrashed: false,
    error: null,
    loading: true
  });
  setService(mdl.fullName, 'loading');

  // A prefetched copy (module tile was focused earlier) starts instantly.
  var prefetched = getServiceText(mdl);
  if (prefetched) {
    runServiceScript(mdl, services, sandbox, prefetched);
    return;
  }

  // The response is verified (HTTP 200) before the body is read: a 404 or
  // error page must never be run as a service. Dev service fetches retry
  // twice with backoff for slow local server cold starts.
  fetchTextWithRetry(serviceUrl, 15000, mdl.dev ? 2 : 1, mdl.dev ? 'dev service' : 'service').then(function (script) {
    runServiceScript(mdl, services, sandbox, script);
  }).catch(function (e) {
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
    setService(mdl.fullName, 'failed', e);
    if (attempt < 5) {
      var delay = [2000, 5000, 10000, 20000][attempt] || 30000;
      console.error('Service fetch failed, retrying in ' + delay + 'ms (' + (5 - attempt) + ' retries left). ' + (e.message || e));
      setTimeout(function () {
        return fetchService(mdl, services, sandbox, serviceUrl, attempt + 1);
      }, delay);
    }
  });
}
module.exports = startService;