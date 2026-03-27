const path = require('path');

class AppConfig {
    constructor({ rootDir, port } = {}) {
        this.rootDir = rootDir || process.cwd();
        this.port = Number.parseInt(port, 10) || 3000;
        this.supportUrl = this.normalizePublicHttpUrl(process.env.BUY_ME_A_COFFEE_URL || process.env.SUPPORT_URL || '');
        this.profiles = ['motorrad', 'rennrad', 'laufen', 'spazieren'];
        this.allowedUploadExtensions = new Set(['.gpx', '.fit', '.fir']);
        this.maxUploadFiles = 30;
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
