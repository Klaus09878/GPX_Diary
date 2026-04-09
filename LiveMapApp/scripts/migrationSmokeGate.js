#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const net = require('node:net');
const { spawn, spawnSync, execSync } = require('node:child_process');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const SERVICES_DIR = path.join(PROJECT_ROOT, 'public', 'js', 'app', 'services');
const INDEX_HTML = path.join(PROJECT_ROOT, 'public', 'index.html');
const APP_JS = path.join(PROJECT_ROOT, 'public', 'app.js');
const JEST_BIN = path.join(PROJECT_ROOT, 'node_modules', 'jest', 'bin', 'jest.js');
const TEST_PORT = 3000;

function logStep(message) {
    process.stdout.write(`\n[gate] ${message}\n`);
}

function fail(message) {
    process.stderr.write(`\n[gate] FAIL: ${message}\n`);
    process.exit(1);
}

function isPortInUse(port) {
    return new Promise((resolve) => {
        const server = net.createServer();
        server.once('error', (err) => {
            if (err.code === 'EADDRINUSE') {
                resolve(true);
            } else {
                resolve(false);
            }
        });
        server.once('listening', () => {
            server.close();
            resolve(false);
        });
        server.listen(port);
    });
}

function cleanupPort(port) {
    logStep(`Checking if port ${port} is in use...`);
    try {
        // Windows: netstat and taskkill
        if (process.platform === 'win32') {
            try {
                const result = execSync(`netstat -ano | findstr :${port}`, { encoding: 'utf8' });
                const lines = result.trim().split('\n');
                for (const line of lines) {
                    const match = line.trim().split(/\s+/);
                    if (match.length > 0) {
                        const pid = match[match.length - 1];
                        const pidNumber = Number.parseInt(pid, 10);
                        if (Number.isInteger(pidNumber) && pidNumber > 0 && pidNumber !== process.pid) {
                            logStep(`Killing existing process on port ${port} (PID: ${pidNumber})`);
                            execSync(`taskkill /PID ${pidNumber} /F`, { stdio: 'ignore' });
                        }
                    }
                }
            } catch (e) {
                // netstat might fail, that's ok
            }
        } else {
            // Unix: lsof and kill
            try {
                const result = execSync(`lsof -i :${port}`, { encoding: 'utf8' });
                const lines = result.split('\n');
                for (let i = 1; i < lines.length; i++) {
                    const tokens = lines[i].split(/\s+/);
                    if (tokens.length > 1) {
                        const pidNumber = Number.parseInt(tokens[1], 10);
                        if (Number.isInteger(pidNumber) && pidNumber > 0 && pidNumber !== process.pid) {
                            logStep(`Killing existing process on port ${port} (PID: ${pidNumber})`);
                            execSync(`kill -9 ${pidNumber}`, { stdio: 'ignore' });
                        }
                    }
                }
            } catch (e) {
                // lsof might fail, that's ok
            }
        }
    } catch (error) {
        // Non-fatal: port cleanup is best-effort
    }
}

function runNodeSyntaxCheck(filePath) {
    const result = spawnSync(process.execPath, ['--check', filePath], {
        cwd: PROJECT_ROOT,
        encoding: 'utf8'
    });
    if (result.status !== 0) {
        const relative = path.relative(PROJECT_ROOT, filePath);
        const detail = result.stderr || result.stdout || 'unknown syntax error';
        fail(`Syntax check failed for ${relative}\n${detail}`);
    }
}

function runSyntaxChecks() {
    logStep('Running syntax checks for app.js and all *BridgeService.js files');
    runNodeSyntaxCheck(APP_JS);

    const bridgeFiles = fs
        .readdirSync(SERVICES_DIR)
        .filter((name) => name.endsWith('BridgeService.js'))
        .sort();

    bridgeFiles.forEach((name) => {
        runNodeSyntaxCheck(path.join(SERVICES_DIR, name));
    });

    process.stdout.write(`[gate] Syntax OK (${bridgeFiles.length + 1} files)\n`);
}

function runJestSuite() {
    logStep('Running Jest test suite');

    if (!fs.existsSync(JEST_BIN)) {
        fail('Jest is not installed. Run npm install in LiveMapApp first.');
    }

    const result = spawnSync(process.execPath, [JEST_BIN, '--runInBand'], {
        cwd: PROJECT_ROOT,
        encoding: 'utf8'
    });

    if (result.stdout) {
        process.stdout.write(result.stdout);
    }

    if (result.stderr) {
        process.stderr.write(result.stderr);
    }

    if (result.status !== 0) {
        fail(`Jest suite failed with exit code ${result.status}`);
    }

    process.stdout.write('[gate] Jest suite OK\n');
}

function readBridgeRefsFromIndex() {
    const html = fs.readFileSync(INDEX_HTML, 'utf8');
    const regex = /js\/app\/services\/([^"']*BridgeService\.js)/g;
    const refs = new Set();
    let match = regex.exec(html);

    while (match) {
        refs.add(match[1]);
        match = regex.exec(html);
    }

    return Array.from(refs).sort();
}

function runBridgeParityCheck() {
    logStep('Checking bridge file parity against index.html includes');

    const bridgeFiles = fs
        .readdirSync(SERVICES_DIR)
        .filter((name) => name.endsWith('BridgeService.js'))
        .sort();

    const indexRefs = readBridgeRefsFromIndex();

    const missingInIndex = bridgeFiles.filter((name) => !indexRefs.includes(name));
    const extraInIndex = indexRefs.filter((name) => !bridgeFiles.includes(name));

    if (missingInIndex.length || extraInIndex.length) {
        const parts = [];
        if (missingInIndex.length) {
            parts.push(`missing in index: ${missingInIndex.join(', ')}`);
        }
        if (extraInIndex.length) {
            parts.push(`extra in index: ${extraInIndex.join(', ')}`);
        }
        fail(`Bridge parity mismatch (${parts.join(' | ')})`);
    }

    process.stdout.write(`[gate] Parity OK (${bridgeFiles.length} bridge files)\n`);
}

function wait(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function requestStatus(pathname) {
    return new Promise((resolve, reject) => {
        const request = http.request(
            {
                hostname: '127.0.0.1',
                port: 3000,
                path: pathname,
                method: 'GET',
                timeout: 6000
            },
            (response) => {
                response.resume();
                resolve(response.statusCode || 0);
            }
        );

        request.on('timeout', () => {
            request.destroy(new Error(`timeout for ${pathname}`));
        });
        request.on('error', reject);
        request.end();
    });
}

async function waitForServer(maxAttempts = 30) {
    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
        try {
            const status = await requestStatus('/');
            if (status >= 200 && status < 500) {
                return;
            }
        } catch (error) {
            if (attempt === maxAttempts) {
                throw error;
            }
        }
        await wait(500);
    }
    throw new Error('server did not become reachable in time');
}

async function runEndpointSmoke() {
    logStep('Running endpoint smoke test on / and /api/tracks/rennrad');
    
    // Pre-flight: clean up port if needed
    cleanupPort(TEST_PORT);
    await new Promise(r => setTimeout(r, 250)); // Give port time to release

    const server = spawn(process.execPath, ['server.js'], {
        cwd: PROJECT_ROOT,
        stdio: ['ignore', 'pipe', 'pipe']
    });

    let stderr = '';
    let stdout = '';
    server.stderr.on('data', (chunk) => {
        stderr += chunk.toString();
    });
    server.stdout.on('data', (chunk) => {
        stdout += chunk.toString();
    });

    try {
        await waitForServer();

        const homeStatus = await requestStatus('/');
        const tracksStatus = await requestStatus('/api/tracks/rennrad');

        if (homeStatus !== 200 || tracksStatus !== 200) {
            fail(`Endpoint smoke failed (HOME=${homeStatus}, TRACKS=${tracksStatus})`);
        }

        process.stdout.write(`[gate] Smoke OK (HOME=${homeStatus}, TRACKS=${tracksStatus})\n`);
    } catch (error) {
        fail(`Endpoint smoke error: ${error?.message || String(error)}\n${stderr || stdout || ''}`);
    } finally {
        if (!server.killed) {
            server.kill();
        }
        await new Promise(r => setTimeout(r, 300));
        if (!server.killed && !server.exitCode) {
            server.kill('SIGKILL');
        }

        if (stderr.trim()) {
            process.stdout.write(`[gate] Server stderr:\n${stderr}\n`);
        }
    }
}

async function main() {
    logStep('Starting migration smoke gate');
    try {
        runSyntaxChecks();
    } catch (error) {
        fail(`Syntax check failed: ${error?.message || String(error)}`);
    }

    try {
        runJestSuite();
    } catch (error) {
        fail(`Jest validation failed: ${error?.message || String(error)}`);
    }
    
    try {
        runBridgeParityCheck();
    } catch (error) {
        fail(`Bridge parity check failed: ${error?.message || String(error)}`);
    }
    
    try {
        await runEndpointSmoke();
    } catch (error) {
        fail(`Endpoint smoke test failed: ${error?.message || String(error)}`);
    }
    
    logStep('PASS: migration smoke gate complete');
}

main().catch((error) => {
    fail(error?.message || String(error));
});
