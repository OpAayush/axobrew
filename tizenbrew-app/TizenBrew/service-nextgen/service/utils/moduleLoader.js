const { readConfig } = require('./configuration.js');
const { getPackageJsonUrl, isDev } = require('./devServer.js');
const fetch = require('node-fetch');

function fetchWithTimeout(url, ms) {
    return Promise.race([
        fetch(url),
        new Promise((resolve, reject) => setTimeout(() => reject(new Error(`Fetch timed out: ${url}`)), ms))
    ]);
}

function fetchPackageJson(module) {
    return fetchWithTimeout(getPackageJsonUrl(module), 10000)
        .then(res => res.json())
        .catch(e => {
            console.error(e.message || e);
            if (isDev) {
                // The dev server may be unreachable (PC off, not started yet).
                // Fall back to jsDelivr so the module list never hangs the service.
                return fetchWithTimeout(`https://cdn.jsdelivr.net/${module}/package.json?v=${Date.now()}`, 15000)
                    .then(res => res.json());
            }
            throw e;
        });
}

function loadModules() {
    const config = readConfig();
    const modules = config.modules;

    const modulePromises = modules.map(module => {
        return fetchPackageJson(module)
            .then(moduleJson => {
                console
                let moduleData;
                const splitData = [
                    module.substring(0, module.indexOf('/')),
                    module.substring(module.indexOf('/') + 1)
                ];
                const moduleMetadata = {
                    name: splitData[1],
                    type: splitData[0]
                }
                if (moduleJson.packageType === 'app') {
                    moduleData = {
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
                        dev: isDev
                    }
                } else if (moduleJson.packageType === 'mods') {
                    moduleData = {
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
                        dev: isDev
                    }
                } else return {
                    appName: 'Unknown Module',
                    name: moduleMetadata.name,
                    fullName: module,
                    appPath: '',
                    keys: [],
                    moduleType: moduleMetadata.type,
                    packageType: 'app',
                    description: `Unknown module ${module}. Please check the module name and try again.`
                }

                return moduleData;
            })
            .catch(e => {
                console.error(e);

                const splitData = [
                    module.substring(0, module.indexOf('/')),
                    module.substring(module.indexOf('/') + 1)
                ];

                const moduleMetadata = {
                    name: splitData[1],
                    type: splitData[0]
                }

                return {
                    appName: 'Unknown Module',
                    name: moduleMetadata.name,
                    fullName: module,
                    appPath: '',
                    keys: [],
                    moduleType: moduleMetadata.type,
                    packageType: 'app',
                    description: `Unknown module ${module}. Please check the module name and try again.`
                }
            });
    });

    return Promise.all(modulePromises)
        .then(modules => {
            return modules;
        });
}

module.exports = loadModules;