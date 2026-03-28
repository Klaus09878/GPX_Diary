const express = require('express');
const multer = require('multer');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const { AppConfig } = require('../core/AppConfig');
const { createTrackFileHelpers } = require('../core/trackFileHelpers');
const { MetadataStore } = require('../metadata/MetadataStore');
const { createApiMiddlewares } = require('../http/middleware/apiMiddleware');
const { createGpxMetaService } = require('../gpx/gpxMetaService');
const { createGpxTransformService } = require('../gpx/gpxTransformService');
const { createFitToGpxConverter } = require('../fit/fitToGpxConverter');
const { createUploadDomain } = require('../routes/uploadRoutes');
const { createHealthRoutes } = require('../routes/healthRoutes');
const { createActivityMetaRoutes } = require('../routes/activityMetaRoutes');
const { createTrackRoutes } = require('../routes/trackRoutes');
const { createCoreApiRoutes } = require('../routes/coreApiRoutes');
const { createWeatherHistoryService, WeatherHistoryServiceError } = require('../weather/weatherHistoryService');

function createAppContext({ rootDir, port }) {
    const app = express();

    const appConfig = new AppConfig({ rootDir, port });
    const metadataStore = new MetadataStore({
        dbFilePath: appConfig.metadataDbPath,
        sqlJsDistDir: appConfig.sqlJsDistDir
    });

    const PORT = appConfig.port;

    const ALLOWED_UPLOAD_EXTENSIONS = appConfig.allowedUploadExtensions;
    const MAX_UPLOAD_FILE_SIZE = appConfig.maxUploadFileSize;
    const DUPLICATE_PENDING_TTL_MS = appConfig.duplicatePendingTtlMs;
    const DUPLICATE_CLEANUP_INTERVAL_MS = appConfig.duplicateCleanupIntervalMs;
    const GPX_META_CACHE_MAX_AGE_MS = appConfig.gpxMetaCacheMaxAgeMs;
    const WEATHER_CACHE_MAX_AGE_MS = appConfig.weatherCacheMaxAgeMs;
    const WEATHER_FETCH_TIMEOUT_MS = appConfig.weatherFetchTimeoutMs;
    const API_JSON_BODY_LIMIT = appConfig.apiJsonBodyLimit;
    const API_RATE_WINDOW_MS = appConfig.apiRateWindowMs;
    const API_RATE_MAX_REQUESTS = appConfig.apiRateMaxRequests;
    const API_TRACK_READ_RATE_WINDOW_MS = appConfig.apiTrackReadRateWindowMs;
    const API_TRACK_READ_RATE_MAX_REQUESTS = appConfig.apiTrackReadRateMaxRequests;
    const API_WRITE_RATE_WINDOW_MS = appConfig.apiWriteRateWindowMs;
    const API_WRITE_RATE_MAX_REQUESTS = appConfig.apiWriteRateMaxRequests;

    const weatherHistoryService = createWeatherHistoryService({
        cacheMaxAgeMs: WEATHER_CACHE_MAX_AGE_MS,
        fetchTimeoutMs: WEATHER_FETCH_TIMEOUT_MS
    });

    const {
        buildDuplicateMatch,
        invalidateGpxMetaCache,
        transferGpxMetaCache,
        getGpxMetaCached,
        cleanupGpxMetaCache
    } = createGpxMetaService({
        cacheMaxAgeMs: GPX_META_CACHE_MAX_AGE_MS
    });

    const {
        trimGpxXml,
        removeGpxPointRanges,
        replaceFileSafely
    } = createGpxTransformService();

    const {
        applySecurityHeaders,
        applyApiRateLimit,
        applyWriteRateLimit,
        setApiNoStoreCache
    } = createApiMiddlewares({
        apiRateWindowMs: API_RATE_WINDOW_MS,
        apiRateMaxRequests: API_RATE_MAX_REQUESTS,
        apiTrackReadRateWindowMs: API_TRACK_READ_RATE_WINDOW_MS,
        apiTrackReadRateMaxRequests: API_TRACK_READ_RATE_MAX_REQUESTS,
        apiWriteRateWindowMs: API_WRITE_RATE_WINDOW_MS,
        apiWriteRateMaxRequests: API_WRITE_RATE_MAX_REQUESTS
    });

    app.use(applySecurityHeaders);
    app.use(cors());
    app.use(express.json({ limit: API_JSON_BODY_LIMIT }));

    app.use('/api', applyApiRateLimit);
    app.use('/api', applyWriteRateLimit);
    app.use('/api', setApiNoStoreCache);

    app.use(express.static(appConfig.publicDir));

    const DATA_DIR = appConfig.dataDir;
    const PROFILES = appConfig.profiles;

    const {
        sanitizeFilename,
        isSafeTrackFilename,
        toProfileFilePath,
        toGpxFilename
    } = createTrackFileHelpers({
        profiles: PROFILES,
        dataDir: DATA_DIR,
        allowedUploadExtensions: ALLOWED_UPLOAD_EXTENSIONS
    });

    PROFILES.forEach(profile => {
        const profilePath = path.join(DATA_DIR, profile);

        if (!fs.existsSync(profilePath)) {
            fs.mkdirSync(profilePath, { recursive: true });
        }
    });

    function getProfilePath(profile) {
        return path.join(DATA_DIR, profile);
    }

    function getTrackFilesForProfile(profile) {
        const profilePath = getProfilePath(profile);

        if (!fs.existsSync(profilePath)) {
            return [];
        }

        return fs.readdirSync(profilePath)
            .filter(file => file.toLowerCase().endsWith('.gpx') && !file.startsWith('.'));
    }

    async function syncMetadataForProfile(profile) {
        const files = getTrackFilesForProfile(profile);
        await metadataStore.syncProfileActivities(profile, files);
        return files;
    }

    async function syncMetadataForAllProfiles() {
        for (const profile of PROFILES) {
            await syncMetadataForProfile(profile);
        }
    }

    const storage = multer.diskStorage({
        destination: (req, file, cb) => {
            const profile = req.params.profile;

            if (!PROFILES.includes(profile)) {
                return cb(new Error('Invalid profile'));
            }

            cb(null, path.join(DATA_DIR, profile));
        },
        filename: (req, file, cb) => {
            const safeName = sanitizeFilename(file.originalname);

            if (!safeName) {
                return cb(new Error('Ungültiger Dateiname oder Dateityp. Erlaubt: GPX/FIT/FIR'));
            }

            const ext = path.extname(safeName).toLowerCase();
            const tempName = `upload_${Date.now()}_${Math.random().toString(36).slice(2, 10)}${ext}`;

            cb(null, tempName);
        }
    });

    const upload = multer({
        storage,
        limits: {
            fileSize: MAX_UPLOAD_FILE_SIZE
        },
        fileFilter: (req, file, cb) => {
            const safeName = sanitizeFilename(file.originalname);

            if (!safeName) {
                return cb(new Error('Ungültiger Dateiname oder Dateityp. Erlaubt: GPX/FIT/FIR'));
            }

            file.safeOriginalName = safeName;
            cb(null, true);
        }
    });

    const { convertFitToGpx } = createFitToGpxConverter({
        sanitizeFilename
    });

    const uploadDomain = createUploadDomain({
        profiles: PROFILES,
        dataDir: DATA_DIR,
        upload,
        duplicatePendingTtlMs: DUPLICATE_PENDING_TTL_MS,
        sanitizeFilename,
        toGpxFilename,
        convertFitToGpx,
        getGpxMetaCached,
        buildDuplicateMatch,
        invalidateGpxMetaCache,
        transferGpxMetaCache,
        toProfileFilePath,
        metadataStore
    });

    const healthRoutes = createHealthRoutes({
        upload,
        metadataStore
    });

    const activityMetaRoutes = createActivityMetaRoutes({
        profiles: PROFILES,
        metadataStore,
        syncMetadataForProfile,
        isSafeTrackFilename,
        toProfileFilePath
    });

    const trackRoutes = createTrackRoutes({
        profiles: PROFILES,
        syncMetadataForProfile,
        isSafeTrackFilename,
        toProfileFilePath,
        getProfilePath,
        getTrackFilesForProfile,
        trimGpxXml,
        removeGpxPointRanges,
        replaceFileSafely,
        getGpxMetaCached,
        transferGpxMetaCache,
        invalidateGpxMetaCache,
        metadataStore,
        clearProfilePending: (profile) => uploadDomain.clearProfilePending(profile)
    });

    const coreApiRoutes = createCoreApiRoutes({
        profiles: PROFILES,
        supportUrl: appConfig.supportUrl,
        weatherHistoryService,
        WeatherHistoryServiceError
    });

    const pendingCleanupTimer = setInterval(() => {
        uploadDomain.cleanupExpiredPendingDuplicates();
        cleanupGpxMetaCache();
        weatherHistoryService.cleanupCache();
    }, DUPLICATE_CLEANUP_INTERVAL_MS);

    if (typeof pendingCleanupTimer.unref === 'function') {
        pendingCleanupTimer.unref();
    }

    return {
        app,
        port: PORT,
        metadataStore,
        syncMetadataForAllProfiles,
        coreApiRoutes,
        trackRoutes,
        activityMetaRoutes,
        uploadDomain,
        healthRoutes
    };
}

module.exports = {
    createAppContext
};
