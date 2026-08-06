"use strict";

var fetch = require('node-fetch');
function fetchWithTimeout(url, ms) {
  return Promise.race([fetch(url), new Promise(function (resolve, reject) {
    return setTimeout(function () {
      return reject(new Error('Fetch timed out: ' + url));
    }, ms);
  })]);
}

// Fetches and verifies the response BEFORE reading the body. A 404/500 body
// (e.g. the dev server serving an error page or a stale build) must not be
// treated as a successful load - it used to be injected as-is and failed
// silently. Retries with backoff: the first retry comes fast (750ms), later
// ones wait longer (3s), which recovers slow cold starts (Windows Defender
// scanning http-server's first read of a big file, Wi-Fi wakeups, etc.).
function fetchTextWithRetry(url, timeoutMs, retries, label) {
  var _attempt = function attempt(left) {
    if (!url) return Promise.reject(new Error('No URL for ' + label));
    return fetchWithTimeout(url, timeoutMs).then(function (res) {
      if (!res.ok) throw new Error('HTTP ' + res.status + ' for ' + label + ' (' + url + ')');
      return res.text();
    }).catch(function (e) {
      console.error((left > 0 ? 'Retrying ' + label + ' (' + left + ' left): ' : 'Failed ' + label + ': ') + (e.message || e));
      if (left <= 0) throw e;
      return new Promise(function (resolve) {
        return setTimeout(resolve, left === 1 ? 3000 : 750);
      }).then(function () {
        return _attempt(left - 1);
      });
    });
  };
  return _attempt(retries);
}
function fetchJsonWithRetry(url, timeoutMs, retries, label) {
  return fetchTextWithRetry(url, timeoutMs, retries, label).then(function (text) {
    try {
      return JSON.parse(text);
    } catch (e) {
      throw new Error('Invalid JSON for ' + label + ': ' + (e.message || e));
    }
  });
}
module.exports = {
  fetchWithTimeout,
  fetchTextWithRetry,
  fetchJsonWithRetry
};