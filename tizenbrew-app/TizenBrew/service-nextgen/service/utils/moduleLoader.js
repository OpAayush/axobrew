const { readConfig } = require('./configuration.js');
const { isDev, getDevPackageJsonUrl } = require('./devServer.js');
const fetch = require('node-fetch');

function fetchWithTimeout(url, ms) {
    return Promise.race([
        fetch(url),
        new Promise((resolve, reject) => setTimeout(() => reject(new Error(`Fetch timed out: ${url}`)), ms))
    ]);
}

function fetchPackageJson(module) {
    return fetchWithTimeout(`https://cdn.jsdelivr.net/${module}/package.json?v=${Date.now()}`, 15000)
        .then(res => res.json());
}

function unknownModule(module) {
    const splitData = [
        module.substring(0, module.indexOf('/')),
        module.substring(module.indexOf('/') + 1)
    ];
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
    const splitData = [
        module.substring(0, module.indexOf('/')),
        module.substring(module.indexOf('/') + 1)
    ];
    const moduleMetadata = {
        name: splitData[1],
        type: splitData[0]
    }
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
        }
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
        }
    }
    return null;
}

// Regular modules are loaded from their published sources (jsDelivr/GitHub)
// only. They are completely independent from the dev module below.
function loadModules() {
    const config = readConfig();
    const modules = config.modules;

    const modulePromises = modules.map(module => {
        return fetchPackageJson(module)
            .then(moduleJson => buildModuleData(module, moduleJson) || unknownModule(module))
            .catch(e => {
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
    if (!isDev) return Promise.resolve(null);
    return fetchWithTimeout(getDevPackageJsonUrl(), 8000)
        .then(res => res.json())
        .then(moduleJson => {
            const moduleData = buildModuleData(`dev/${moduleJson.name || 'dev'}`, moduleJson);
            if (moduleData) moduleData.dev = true;
            return moduleData;
        })
        .catch(e => {
            console.log('Dev server unreachable, skipping dev module. ' + (e.message || e));
            return null;
        });
}

module.exports = { loadModules, loadDevModule };
