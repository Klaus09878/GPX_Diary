#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { spawn, spawnSync } = require('node:child_process');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const SERVICES_DIR = path.join(PROJECT_ROOT, 'public', 'js', 'app', 'services');
const INDEX_HTML = path.join(PROJECT_ROOT, 'public', 'index.html');
const APP_JS = path.join(PROJECT_ROOT, 'public', 'app.js');

function logStep(message) {
    process.stdout.write(`\n[gate] ${message}\n`);
}

function fail(message) {
    process.stderr.write(`\n[gate] FAIL: ${message}\n`);
    process.exit(1);
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

    const server = spawn(process.execPath, ['server.js'], {
        cwd: PROJECT_ROOT,
        stdio: ['ignore', 'pipe', 'pipe']
    });

    let stderr = '';
    server.stderr.on('data', (chunk) => {
        stderr += chunk.toString();
    });

    try {
        await waitForServer();

        const homeStatus = await requestStatus('/');
        const tracksStatus = await requestStatus('/api/tracks/rennrad');

        if (homeStatus !== 200 || tracksStatus !== 200) {
            fail(`Endpoint smoke failed (HOME=${homeStatus}, TRACKS=${tracksStatus})`);
        }

        process.stdout.write(`[gate] Smoke OK (HOME=${homeStatus}, TRACKS=${tracksStatus})\n`);
    } finally {
        if (!server.killed) {
            server.kill();
        }
        await wait(300);
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
    runSyntaxChecks();
    runBridgeParityCheck();
    await runEndpointSmoke();
    logStep('PASS: migration smoke gate complete');
}

main().catch((error) => {
    fail(error?.message || String(error));
});
