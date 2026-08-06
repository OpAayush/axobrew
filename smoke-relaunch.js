"use strict";
/*
 * axobrew relaunch smoke test.
 *
 * Loads the REAL built service bundle (service-nextgen/service/dist/index.js)
 * into a local Node process with a mocked Tizen API and walks the entire
 * relaunch protocol over a real WebSocket, exactly as the TV app does:
 *
 *   GetDebugStatus -> CanLaunchInDebug -> ReLaunchInDebug
 *     -> fake ADB daemon receives "shell:0 debug <pkg>.AxoBrewStandalone"
 *     -> fake daemon prints "debug: 12345" -> service parses port
 *     -> service attempts CDP attach on that port
 *     -> GetLogs returns the captured service logs
 *
 * Exit code 0 = whole chain verified, 1 = any step failed.
 *
 * Usage: node smoke-relaunch.js [path-to-service-dist]
 */
const net = require('net');
const http = require('http');
const path = require('path');

const DIST = process.argv[2] || path.resolve(__dirname, 'axobrew-app/axobrew/service-nextgen/service/dist/index.js');
let WebSocket;
try {
    WebSocket = require('ws');
} catch (e) {
    WebSocket = require(path.resolve(__dirname, 'axobrew-app/axobrew/service-nextgen/service/node_modules/ws'));
}

const PORTS = { devApi: 8001, ws: 8081, adb: 26101, cdp: 12345 };
const results = [];
function check(name, ok, extra) {
    results.push({ name, ok: !!ok, extra: extra || '' });
    console.log((ok ? 'PASS' : 'FAIL') + '  ' + name + (extra ? '  (' + extra + ')' : ''));
}

function packet(type, arg0, arg1, data) {
    const buf = Buffer.alloc(24 + (data ? data.length : 0));
    buf.writeUInt32LE(type, 0);
    buf.writeUInt32LE(arg0, 4);
    buf.writeUInt32LE(arg1, 8);
    buf.writeUInt32LE(data ? data.length : 0, 12);
    buf.writeUInt32LE(0, 16);
    buf.writeUInt32LE((type ^ 0xffffffff) >>> 0, 20);
    if (data) buf.write(data, 24, 'ascii');
    return buf;
}
const CNXN = 0x4e584e43, OPEN = 0x4e45504f, OKAY = 0x59414b4f, WRTE = 0x45545257, CLSE = 0x45534c43;

// --- fake TV Developer Mode API (port 8001) ---
let devApiServer;
const startDevApi = () => new Promise((resolve, reject) => {
    devApiServer = http.createServer((req, res) => {
        if (req.url.startsWith('/api/v2')) {
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ device: { developerIP: '127.0.0.1', developerMode: '1' } }));
        } else {
            res.statusCode = 404;
            res.end();
        }
    });
    devApiServer.on('error', reject);
    devApiServer.listen(PORTS.devApi, '127.0.0.1', resolve);
});

// --- fake TV ADB daemon (port 26101): ADB wire protocol, enough for adbhost ---
let adbCommand = null;
let adbStreamId = 5000;
let adbServer, adbClient;
const startAdb = () => new Promise((resolve, reject) => {
    adbServer = net.createServer((sock) => {
        adbClient = sock;
        let headerBuf = Buffer.alloc(0);
        sock.on('data', (chunk) => {
            headerBuf = Buffer.concat([headerBuf, chunk]);
            while (headerBuf.length >= 24) {
                const cmd = headerBuf.readUInt32LE(0);
                const arg0 = headerBuf.readUInt32LE(4);
                const len = headerBuf.readUInt32LE(12);
                if (headerBuf.length < 24 + len) return;
                const data = headerBuf.toString('ascii', 24, 24 + len);
                headerBuf = headerBuf.slice(24 + len);
                if (cmd === CNXN) {
                    sock.write(packet(CNXN, 0x01000000, 4096, 'tizen::'));
                } else if (cmd === OPEN) {
                    adbCommand = data.replace(/\0+$/, '');
                    sock.write(packet(OKAY, adbStreamId, arg0, null));
                    setTimeout(() => {
                        try { sock.write(packet(WRTE, adbStreamId, arg0, 'debug: 12345')); } catch (e) {}
                    }, 300);
                } else if (cmd === CLSE) {
                    adbCommand = adbCommand || data;
                }
            }
        });
    });
    adbServer.on('error', reject);
    adbServer.listen(PORTS.adb, '127.0.0.1', resolve);
});

// --- fake CDP debugger port (port 12345): count attach attempts ---
let cdpAttempts = 0;
let cdpServer;
const startCdp = () => new Promise((resolve, reject) => {
    cdpServer = net.createServer((sock) => {
        cdpAttempts++;
        let buf = '';
        sock.on('data', (d) => {
            buf += d.toString();
            if (buf.includes('\r\n\r\n')) {
                const body = '{"Browser":"smoke","Protocol-Version":"1.3","webSocketDebuggerUrl":"ws://127.0.0.1:' + PORTS.cdp + '/devtools/page/1"}';
                sock.write('HTTP/1.1 200 OK\r\nContent-Type: application/json\r\nContent-Length: ' + body.length + '\r\nConnection: close\r\n\r\n' + body);
            }
        });
        sock.on('error', () => {});
    });
    cdpServer.on('error', reject);
    cdpServer.listen(PORTS.cdp, '127.0.0.1', resolve);
});

// --- mocked Tizen APIs the service uses ---
global.tizen = {
    systeminfo: {
        getCapability: (key) => (key.indexOf('platform.version') !== -1 ? '4.0' : null)
    },
    application: {
        getAppInfo: () => ({ packageId: 'axobrewapp' }),
        getCurrentApplication: () => ({ appInfo: { packageId: 'axobrewapp' }, exit() {} }),
        launchAppControl: () => {}
    }
};

const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const waitFor = async (fn, timeoutMs, intervalMs) => {
    const end = Date.now() + timeoutMs;
    while (Date.now() < end) {
        const v = fn();
        if (v) return v;
        await sleep(intervalMs || 250);
    }
    return null;
};

async function connectWs(url) {
    return await waitFor(() => {
        try {
            const ws = new WebSocket(url);
            return new Promise((resolve) => {
                ws.on('open', () => resolve(ws));
                ws.on('error', () => { try { ws.close(); } catch (e) {} resolve(null); });
            });
        } catch (e) { return null; }
    }, 15000, 500);
}

async function main() {
    if (!require('fs').existsSync(DIST)) {
        console.error('Service bundle not found: ' + DIST);
        process.exit(1);
    }

    await Promise.all([startDevApi(), startAdb(), startCdp()]);
    console.log('Fakes up: devApi:8001, adb:26101, cdp:12345');

    const bundle = require(DIST);
    bundle.onStart();
    console.log('Service onStart invoked from ' + DIST);

    const ws = await connectWs('ws://127.0.0.1:' + PORTS.ws);
    check('UI connects to service websocket', !!ws);
    if (!ws) { console.log('FAILED: service websocket never came up'); process.exit(1); }

    const replies = {};
    ws.on('message', (raw) => {
        const msg = JSON.parse(raw.toString());
        replies[msg.type] = msg.payload;
    });
    ws.on('error', () => {});

    ws.send(JSON.stringify({ type: 1 })); // GetDebugStatus
    await waitFor(() => replies[1] !== undefined, 5000);
    const dbg = replies[1];
    check('GetDebugStatus returns not-in-debug', !!dbg && !dbg.tizenDebug && !dbg.webDebug && !dbg.rwiDebug,
        dbg ? JSON.stringify(dbg) : 'no reply');

    ws.send(JSON.stringify({ type: 2 })); // CanLaunchInDebug
    await waitFor(() => replies[2] !== undefined, 5000);
    check('CanLaunchInDebug resolves true (dev API reachable)', replies[2] === true,
        String(replies[2]));

    ws.send(JSON.stringify({ type: 3, payload: { tvIP: '127.0.0.1' } })); // ReLaunchInDebug
    const cmd = await waitFor(() => adbCommand, 10000);
    check('ADB receives debug relaunch command', !!cmd, cmd || 'no command');
    check('Command targets current package id', cmd === 'shell:0 debug axobrewapp.AxoBrewStandalone', cmd || '');

    const attempts = await waitFor(() => cdpAttempts > 0 ? cdpAttempts : null, 10000);
    check('Debug port parsed and CDP attach attempted (port 12345)', attempts > 0,
        attempts + ' attempt(s)');

    ws.send(JSON.stringify({ type: 12 })); // GetLogs
    await waitFor(() => replies[12] !== undefined, 5000);
    const logs = replies[12] && replies[12].logs ? replies[12].logs : [];
    const joined = logs.map(l => l.msg).join('\n');
    check('GetLogs returns service log buffer', logs.length > 0, logs.length + ' entries');
    check('Logs contain relaunch diagnostics',
        joined.indexOf('Relaunching app in debug:') !== -1 && joined.indexOf('Debug port parsed:') !== -1,
        joined.split('\n').filter(l => l.indexOf('ADB') !== -1 || l.indexOf('Debug') !== -1 || l.indexOf('Relaunching') !== -1).slice(-3).join(' | '));

    const failed = results.filter(r => !r.ok);
    console.log('\n' + (results.length - failed.length) + '/' + results.length + ' checks passed');
    ws.close();
    process.exit(failed.length ? 1 : 0);
}

main().catch(e => { console.error('Smoke test crashed: ' + (e.stack || e)); process.exit(1); });
