const path = require('path');

class AppConfig {
    constructor({ rootDir, port } = {}) {
        this.rootDir = rootDir || process.cwd();
        this.port = Number.parseInt(port, 10) || 3000;
        this.supportUrl = this.normalizePublicHttpUrl(process.env.BUY_ME_A_COFFEE_URL || process.env.SUPPORT_URL || '');
        this.trustProxy = this.parseBooleanEnv(process.env.TRUST_PROXY, false);
        this.corsAllowedOrigins = this.parseAllowedOrigins(
            process.env.CORS_ALLOWED_ORIGINS,
            [
                `http://localhost:${this.port}`,
                `http://127.0.0.1:${this.port}`,
                'http://localhost:5173',
                'http://127.0.0.1:5173'
            ]
        );
        this.profiles = ['motorrad', 'rennrad', 'laufen', 'spazieren'];
        this.allowedUploadExtensions = new Set(['.gpx', '.fit', '.fir']);
        this.maxUploadFileSize = 25 * 1024 * 1024;
        this.duplicatePendingTtlMs = 15 * 60 * 1000;
        this.duplicateCleanupIntervalMs = 5 * 60 * 1000;
        this.gpxMetaCacheMaxAgeMs = 6 * 60 * 60 * 1000;
        this.weatherCacheMaxAgeMs = 14 * 24 * 60 * 60 * 1000;
        this.weatherFetchTimeoutMs = 12 * 1000;
        this.apiJsonBodyLimit = '1mb';
        this.apiRateWindowMs = 60 * 1000;
        this.apiRateMaxRequests = 700;
        this.apiTrackReadRateWindowMs = 60 * 1000;
        this.apiTrackReadRateMaxRequests = 2400;
        this.apiWriteRateWindowMs = 60 * 1000;
        this.apiWriteRateMaxRequests = 180;
    }

    parseBooleanEnv(rawValue, defaultValue = false) {
        if (typeof rawValue !== 'string') {
            return defaultValue;
        }

        const normalized = rawValue.trim().toLowerCase();
        if (!normalized) {
            return defaultValue;
        }

        if (['1', 'true', 'yes', 'on'].includes(normalized)) {
            return true;
        }

        if (['0', 'false', 'no', 'off'].includes(normalized)) {
            return false;
        }

        return defaultValue;
    }

    parseAllowedOrigins(rawValue, fallbackOrigins = []) {
        const source = typeof rawValue === 'string' && rawValue.trim()
            ? rawValue.split(',')
            : fallbackOrigins;

        const normalized = source
            .map((value) => this.normalizeOrigin(value))
            .filter(Boolean);

        return Array.from(new Set(normalized));
    }

    normalizeOrigin(rawValue) {
        if (typeof rawValue !== 'string') {
            return '';
        }

        const trimmed = rawValue.trim();
        if (!trimmed) {
            return '';
        }

        try {
            const parsed = new URL(trimmed);
            if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
                return '';
            }

            return parsed.origin;
        } catch (error) {
            return '';
        }
    }

    normalizePublicHttpUrl(rawValue) {
        if (typeof rawValue !== 'string') {
            return '';
        }

        const trimmed = rawValue.trim();
        if (!trimmed) {
            return '';
        }

        try {
            const parsed = new URL(trimmed);
            if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
                return '';
            }

            return parsed.toString();
        } catch (error) {
            return '';
        }
    }

    get publicDir() {
        return path.join(this.rootDir, 'public');
    }

    get dataDir() {
        return path.join(this.rootDir, 'data');
    }

    get metadataDbPath() {
        return path.join(this.dataDir, 'app-metadata.sqlite');
    }

    get sqlJsDistDir() {
        return path.join(this.rootDir, 'node_modules', 'sql.js', 'dist');
    }
}

module.exports = { AppConfig };
