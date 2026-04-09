const fs = require('fs');
const path = require('path');
const multer = require('multer');

const TRACK_UPLOAD_MIME_TYPES_BY_EXTENSION = {
    '.gpx': new Set(['application/gpx+xml', 'application/xml', 'text/xml', 'text/plain']),
    '.fit': new Set(['application/octet-stream', 'application/fit']),
    '.fir': new Set(['application/octet-stream'])
};

function createUploadDomain({
    profiles,
    dataDir,
    upload,
    duplicatePendingTtlMs,
    sanitizeFilename,
    toGpxFilename,
    convertFitToGpx,
    getGpxMetaCached,
    buildDuplicateMatch,
    invalidateGpxMetaCache,
    transferGpxMetaCache,
    toProfileFilePath,
    metadataStore
}) {
    const pendingDuplicates = new Map();

    function normalizeMimeType(mimeType) {
        if (typeof mimeType !== 'string') {
            return '';
        }

        return mimeType.split(';')[0].trim().toLowerCase();
    }

    function isAllowedTrackMimeType(safeOriginalName, mimeType) {
        const ext = path.extname(safeOriginalName || '').toLowerCase();
        const allowedMimeTypes = TRACK_UPLOAD_MIME_TYPES_BY_EXTENSION[ext];
        const normalizedMimeType = normalizeMimeType(mimeType);

        if (!allowedMimeTypes || !normalizedMimeType) {
            return false;
        }

        return allowedMimeTypes.has(normalizedMimeType);
    }

    function getAvailableFilename(profilePath, preferredName) {
        const ext = path.extname(preferredName);
        const base = path.basename(preferredName, ext);

        let candidate = preferredName;
        let index = 1;

        while (fs.existsSync(path.join(profilePath, candidate))) {
            candidate = `${base}_${index}${ext}`;
            index += 1;
        }

        return candidate;
    }

    function createPendingId() {
        return `pending_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
    }

    function removePendingDuplicate(pendingId, options = {}) {
        const entry = pendingDuplicates.get(pendingId);

        if (!entry) {
            return;
        }

        if (options.deleteFile && fs.existsSync(entry.pendingPath)) {
            try {
                fs.unlinkSync(entry.pendingPath);
                invalidateGpxMetaCache(entry.pendingPath);
            } catch (err) {
                console.error(`Failed to remove pending file ${entry.pendingPath}:`, err.message);
            }
        }

        pendingDuplicates.delete(pendingId);
    }

    function cleanupExpiredPendingDuplicates() {
        const now = Date.now();

        for (const [pendingId, entry] of pendingDuplicates.entries()) {
            if (now - entry.createdAt > duplicatePendingTtlMs) {
                removePendingDuplicate(pendingId, { deleteFile: true });
            }
        }
    }

    function clearProfilePending(profile) {
        let clearedPendingCount = 0;

        for (const [pendingId, entry] of pendingDuplicates.entries()) {
            if (entry.profile === profile) {
                removePendingDuplicate(pendingId, { deleteFile: true });
                clearedPendingCount += 1;
            }
        }

        return clearedPendingCount;
    }

    function uploadTracks(req, res, next) {
        const { profile } = req.params;

        if (!profiles.includes(profile)) {
            return res.status(400).json({ error: 'Invalid profile' });
        }

        upload.array('gpxFiles')(req, res, (err) => {
            if (!err) {
                return next();
            }

            if (err instanceof multer.MulterError) {
                return res.status(400).json({ error: err.message });
            }

            return res.status(400).json({ error: err.message || 'Upload failed' });
        });
    }

    async function handleUpload(req, res) {
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ error: 'No files uploaded' });
        }

        const profile = req.params.profile;
        const profilePath = path.join(dataDir, profile);

        const results = [];
        const conflicts = [];
        const discarded = [];

        for (const file of req.files) {
            const safeOriginalName = file.safeOriginalName || sanitizeFilename(file.originalname);

            if (!safeOriginalName) {
                try { fs.unlinkSync(file.path); } catch (_) { }
                invalidateGpxMetaCache(file.path);
                discarded.push({ name: file.originalname, reason: 'Ungültiger Dateiname oder Dateityp.' });
                continue;
            }

            if (!isAllowedTrackMimeType(safeOriginalName, file.mimetype)) {
                try { fs.unlinkSync(file.path); } catch (_) { }
                invalidateGpxMetaCache(file.path);
                discarded.push({
                    name: safeOriginalName,
                    reason: 'Dateityp nicht erlaubt (MIME-Prüfung fehlgeschlagen).'
                });
                continue;
            }

            const sourceExtension = path.extname(safeOriginalName).toLowerCase();
            const sourceFormat = sourceExtension === '.fit' || sourceExtension === '.fir' ? 'FIT' : 'GPX';
            const preferredGpxName = toGpxFilename(safeOriginalName);

            let gpxPath = file.path;

            if (sourceFormat === 'FIT') {
                try {
                    gpxPath = await convertFitToGpx(file.path, safeOriginalName);
                } catch (err) {
                    console.error(`FIT conversion failed for ${safeOriginalName}:`, err.message);
                    try { fs.unlinkSync(file.path); } catch (_) { }
                    invalidateGpxMetaCache(file.path);
                    discarded.push({ name: safeOriginalName, reason: `FIT-Konvertierung fehlgeschlagen: ${err.message}` });
                    continue;
                }
            }

            let meta;

            try {
                meta = await getGpxMetaCached(gpxPath);
            } catch (err) {
                console.error(`Failed to parse GPX ${path.basename(gpxPath)}:`, err.message);
                try { fs.unlinkSync(gpxPath); } catch (_) { }
                invalidateGpxMetaCache(gpxPath);
                discarded.push({ name: preferredGpxName, reason: 'GPX konnte nicht gelesen werden.' });
                continue;
            }

            if (meta.distanceKm < 0.1) {
                console.log(`Track too short (${meta.distanceKm.toFixed(3)} km): ${preferredGpxName}`);
                try { fs.unlinkSync(gpxPath); } catch (_) { }
                invalidateGpxMetaCache(gpxPath);
                discarded.push({
                    name: preferredGpxName,
                    reason: `Track zu kurz (${(meta.distanceKm * 1000).toFixed(0)} m). Datei verworfen.`
                });
                continue;
            }

            const existingFiles = fs.readdirSync(profilePath)
                .filter(f => f.toLowerCase().endsWith('.gpx') && !f.startsWith('.') && f !== path.basename(gpxPath));

            let conflictFound = null;

            for (const existingFile of existingFiles) {
                const existingPath = path.join(profilePath, existingFile);

                try {
                    const existingMeta = await getGpxMetaCached(existingPath);
                    const duplicateMatch = buildDuplicateMatch(existingMeta, meta);

                    if (duplicateMatch.isDuplicate) {
                        conflictFound = {
                            existingFile,
                            existingMeta,
                            newMeta: meta,
                            duplicateMatch
                        };
                        break;
                    }
                } catch (_) {
                    // Skip unparseable existing files
                }
            }

            if (conflictFound) {
                const pendingId = createPendingId();
                const pendingPath = path.join(profilePath, `.${pendingId}.pending.gpx`);

                try {
                    fs.renameSync(gpxPath, pendingPath);
                    transferGpxMetaCache(gpxPath, pendingPath);
                } catch (err) {
                    console.error(`Failed to store pending duplicate for ${preferredGpxName}:`, err.message);
                    try { fs.unlinkSync(gpxPath); } catch (_) { }
                    invalidateGpxMetaCache(gpxPath);
                    discarded.push({ name: preferredGpxName, reason: 'Duplikat konnte nicht vorbereitet werden.' });
                    continue;
                }

                pendingDuplicates.set(pendingId, {
                    profile,
                    pendingPath,
                    existingFile: conflictFound.existingFile,
                    preferredGpxName,
                    createdAt: Date.now()
                });

                conflicts.push({
                    pendingId,
                    existingFile: conflictFound.existingFile,
                    incomingFile: preferredGpxName,
                    reason: conflictFound.duplicateMatch.reason,
                    confidence: conflictFound.duplicateMatch.confidence,
                    score: conflictFound.duplicateMatch.score,
                    metrics: conflictFound.duplicateMatch.metrics,
                    existing: {
                        pointCount: conflictFound.existingMeta.pointCount,
                        distanceKm: conflictFound.existingMeta.distanceKm.toFixed(2),
                        hasHR: conflictFound.existingMeta.hasHR,
                        hasPower: conflictFound.existingMeta.hasPower,
                        format: 'GPX'
                    },
                    incoming: {
                        pointCount: conflictFound.newMeta.pointCount,
                        distanceKm: conflictFound.newMeta.distanceKm.toFixed(2),
                        hasHR: conflictFound.newMeta.hasHR,
                        hasPower: conflictFound.newMeta.hasPower,
                        format: sourceFormat
                    }
                });

                continue;
            }

            const finalName = getAvailableFilename(profilePath, preferredGpxName);
            const finalPath = path.join(profilePath, finalName);

            try {
                if (path.resolve(gpxPath) !== path.resolve(finalPath)) {
                    fs.renameSync(gpxPath, finalPath);
                    transferGpxMetaCache(gpxPath, finalPath);
                }
            } catch (err) {
                console.error(`Failed to finalize upload for ${preferredGpxName}:`, err.message);
                try { fs.unlinkSync(gpxPath); } catch (_) { }
                invalidateGpxMetaCache(gpxPath);
                discarded.push({ name: preferredGpxName, reason: 'Datei konnte nicht gespeichert werden.' });
                continue;
            }

            results.push(finalName);
        }

        if (results.length > 0) {
            await metadataStore.syncProfileActivities(profile, results);
        }

        if (conflicts.length > 0) {
            return res.status(409).json({
                message: 'Duplicate detected',
                uploaded: results,
                discarded,
                conflicts
            });
        }

        if (results.length === 0 && discarded.length > 0) {
            return res.status(415).json({
                error: 'Keine Datei mit zulässigem Dateityp hochgeladen.',
                discarded
            });
        }

        return res.json({
            message: 'Files uploaded successfully',
            count: results.length,
            uploaded: results,
            discarded
        });
    }

    async function handleResolveDuplicate(req, res) {
        const { profile } = req.params;
        const { action, pendingId } = req.body || {};

        if (!profiles.includes(profile)) {
            return res.status(400).json({ error: 'Invalid profile' });
        }

        if (typeof pendingId !== 'string') {
            return res.status(400).json({ error: 'Missing pendingId' });
        }

        const entry = pendingDuplicates.get(pendingId);

        if (!entry) {
            return res.status(404).json({ error: 'Pending duplicate not found. It may have expired.' });
        }

        if (entry.profile !== profile) {
            return res.status(400).json({ error: 'Profile mismatch for pending duplicate' });
        }

        if (Date.now() - entry.createdAt > duplicatePendingTtlMs) {
            removePendingDuplicate(pendingId, { deleteFile: true });
            return res.status(410).json({ error: 'Pending duplicate has expired.' });
        }

        if (!fs.existsSync(entry.pendingPath)) {
            invalidateGpxMetaCache(entry.pendingPath);
            pendingDuplicates.delete(pendingId);
            return res.status(404).json({ error: 'Pending file not found. It may have expired.' });
        }

        const profilePath = path.join(dataDir, profile);
        const existingFilePath = toProfileFilePath(profile, entry.existingFile);

        if (!existingFilePath) {
            removePendingDuplicate(pendingId, { deleteFile: true });
            return res.status(400).json({ error: 'Invalid duplicate state' });
        }

        try {
            switch (action) {
                case 'keep_existing':
                    fs.unlinkSync(entry.pendingPath);
                    invalidateGpxMetaCache(entry.pendingPath);
                    removePendingDuplicate(pendingId);
                    return res.json({ message: 'Bestehende Datei behalten. Neue Datei verworfen.' });

                case 'replace':
                    if (fs.existsSync(existingFilePath)) {
                        fs.unlinkSync(existingFilePath);
                        invalidateGpxMetaCache(existingFilePath);
                    }

                    fs.renameSync(entry.pendingPath, existingFilePath);
                    transferGpxMetaCache(entry.pendingPath, existingFilePath);
                    removePendingDuplicate(pendingId);
                    await metadataStore.upsertActivity(profile, entry.existingFile);
                    return res.json({ message: 'Bestehende Datei ersetzt.', savedFile: entry.existingFile });

                case 'keep_both': {
                    const newName = getAvailableFilename(profilePath, entry.preferredGpxName);
                    const keepBothPath = path.join(profilePath, newName);

                    fs.renameSync(entry.pendingPath, keepBothPath);
                    transferGpxMetaCache(entry.pendingPath, keepBothPath);
                    removePendingDuplicate(pendingId);
                    await metadataStore.upsertActivity(profile, newName);

                    return res.json({ message: 'Beide Dateien behalten.', savedFile: newName });
                }

                default:
                    return res.status(400).json({ error: 'Invalid action' });
            }
        } catch (err) {
            console.error('Error resolving duplicate:', err);
            return res.status(500).json({ error: 'Failed to resolve duplicate' });
        }
    }

    function registerRoutes(app) {
        app.post('/api/upload/:profile', uploadTracks, handleUpload);
        app.post('/api/resolve-duplicate/:profile', handleResolveDuplicate);
    }

    return {
        registerRoutes,
        cleanupExpiredPendingDuplicates,
        clearProfilePending
    };
}

module.exports = {
    createUploadDomain
};
