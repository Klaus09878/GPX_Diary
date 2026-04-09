const path = require('node:path');

const { AppConfig } = require('../src/server/core/AppConfig');

describe('AppConfig', () => {
    const envBackup = {
        BUY_ME_A_COFFEE_URL: process.env.BUY_ME_A_COFFEE_URL,
        SUPPORT_URL: process.env.SUPPORT_URL,
        PORT: process.env.PORT,
        TRUST_PROXY: process.env.TRUST_PROXY,
        CORS_ALLOWED_ORIGINS: process.env.CORS_ALLOWED_ORIGINS
    };

    afterEach(() => {
        if (envBackup.BUY_ME_A_COFFEE_URL === undefined) {
            delete process.env.BUY_ME_A_COFFEE_URL;
        } else {
            process.env.BUY_ME_A_COFFEE_URL = envBackup.BUY_ME_A_COFFEE_URL;
        }

        if (envBackup.SUPPORT_URL === undefined) {
            delete process.env.SUPPORT_URL;
        } else {
            process.env.SUPPORT_URL = envBackup.SUPPORT_URL;
        }

        if (envBackup.PORT === undefined) {
            delete process.env.PORT;
        } else {
            process.env.PORT = envBackup.PORT;
        }

        if (envBackup.TRUST_PROXY === undefined) {
            delete process.env.TRUST_PROXY;
        } else {
            process.env.TRUST_PROXY = envBackup.TRUST_PROXY;
        }

        if (envBackup.CORS_ALLOWED_ORIGINS === undefined) {
            delete process.env.CORS_ALLOWED_ORIGINS;
        } else {
            process.env.CORS_ALLOWED_ORIGINS = envBackup.CORS_ALLOWED_ORIGINS;
        }
    });

    it('normalizes http and https URLs', () => {
        const config = new AppConfig();

        expect(config.normalizePublicHttpUrl('https://example.com')).toBe('https://example.com/');
        expect(config.normalizePublicHttpUrl('http://localhost:3000/test?x=1')).toBe('http://localhost:3000/test?x=1');
        expect(config.normalizePublicHttpUrl('ftp://example.com')).toBe('');
        expect(config.normalizePublicHttpUrl('not-a-url')).toBe('');
    });

    it('uses BUY_ME_A_COFFEE_URL before SUPPORT_URL', () => {
        process.env.BUY_ME_A_COFFEE_URL = 'https://buymeacoffee.com/example';
        process.env.SUPPORT_URL = 'https://support.example.com';

        const config = new AppConfig({ rootDir: path.join(__dirname, '..'), port: '3123' });

        expect(config.supportUrl).toBe('https://buymeacoffee.com/example');
        expect(config.port).toBe(3123);
    });

    it('resolves standard project paths from rootDir', () => {
        const rootDir = path.join(__dirname, '..');
        const config = new AppConfig({ rootDir, port: 3000 });

        expect(config.publicDir).toBe(path.join(rootDir, 'public'));
        expect(config.dataDir).toBe(path.join(rootDir, 'data'));
        expect(config.metadataDbPath).toBe(path.join(rootDir, 'data', 'app-metadata.sqlite'));
        expect(config.sqlJsDistDir).toBe(path.join(rootDir, 'node_modules', 'sql.js', 'dist'));
    });

    it('parses trust proxy and CORS origins from env', () => {
        process.env.TRUST_PROXY = 'true';
        process.env.CORS_ALLOWED_ORIGINS = 'https://app.example.com, http://localhost:8080 ,invalid';

        const config = new AppConfig({ port: 3123 });

        expect(config.trustProxy).toBe(true);
        expect(config.corsAllowedOrigins).toEqual([
            'https://app.example.com',
            'http://localhost:8080'
        ]);
    });

    it('uses safe CORS defaults when env variable is missing', () => {
        delete process.env.CORS_ALLOWED_ORIGINS;

        const config = new AppConfig({ port: 3333 });

        expect(config.corsAllowedOrigins).toContain('http://localhost:3333');
        expect(config.corsAllowedOrigins).toContain('http://127.0.0.1:3333');
        expect(config.corsAllowedOrigins).toContain('http://localhost:5173');
    });
});