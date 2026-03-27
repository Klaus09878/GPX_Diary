const fs = require('fs');
const path = require('path');

function createTrackRoutes({
    profiles,
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
    clearProfilePending
}) {
    function ensureProfile(req, res) {
        const profile = req.params.profile;
        if (!profiles.includes(profile)) {
            res.status(400).json({ error: 'Invalid profile' });
            return null;
        }

        return profile;
    }

    function ensureTrackFile(profile, filename, res) {
        if (!isSafeTrackFilename(filename)) {
            res.status(400).json({ error: 'Invalid filename' });
            return null;
        }

        const filePath = toProfileFilePath(profile, filename);
        if (!filePath) {
            res.status(400).json({ error: 'Invalid filename' });
            return null;
        }

        if (!fs.existsSync(filePath)) {
            res.status(404).json({ error: 'File not found' });
            return null;
        }

        return filePath;
    }

    function registerRoutes(app) {
        app.get('/api/tracks/:profile', async (req, res) => {
            const profile = ensureProfile(req, res);
            if (!profile) {
                return;
            }

            try {
                const gpxFiles = await syncMetadataForProfile(profile);
                return res.json(gpxFiles);
            } catch (err) {
                console.error('Failed to read directory:', err);
                return res.status(500).json({ error: 'Failed to read directory' });
            }
        });

        app.get('/api/tracks/:profile/:filename', (req, res) => {
            const profile = ensureProfile(req, res);
            if (!profile) {
                return;
            }

            const { filename } = req.params;
            const filePath = ensureTrackFile(profile, filename, res);
            if (!filePath) {
                return;
            }

            return res.sendFile(filePath);
        });

        app.post('/api/tracks/:profile/:filename/trim', async (req, res) => {
            const profile = ensureProfile(req, res);
            if (!profile) {
                return;
            }

            const { filename } = req.params;
            const filePath = ensureTrackFile(profile, filename, res);
            if (!filePath) {
                return;
            }

            const startIndex = Number(req.body?.startIndex);
            const endIndex = Number(req.body?.endIndex);

            if (!Number.isInteger(startIndex) || !Number.isInteger(endIndex)) {
                return res.status(400).json({ error: 'Trim-Grenzen müssen ganze Zahlen sein.' });
            }

            const tempPath = path.join(path.dirname(filePath), `.trim_${Date.now()}_${Math.random().toString(36).slice(2, 10)}.gpx`);

            try {
                const originalXml = fs.readFileSync(filePath, 'utf-8');
                const trimmedXml = await trimGpxXml(originalXml, startIndex, endIndex);

                fs.writeFileSync(tempPath, trimmedXml, 'utf-8');

                const meta = await getGpxMetaCached(tempPath);
                if (!meta || meta.pointCount < 2) {
                    throw new Error('Der zugeschnittene Track ist zu kurz.');
                }

                replaceFileSafely(tempPath, filePath);
                transferGpxMetaCache(tempPath, filePath);

                return res.json({
                    message: 'Training erfolgreich zugeschnitten.',
                    filename,
                    distanceKm: meta.distanceKm,
                    pointCount: meta.pointCount,
                    startTime: meta.startTime
                });
            } catch (err) {
                console.error('Error trimming track:', err);

                try {
                    if (fs.existsSync(tempPath)) {
                        fs.unlinkSync(tempPath);
                    }
                } catch (_) {}

                invalidateGpxMetaCache(tempPath);
                return res.status(400).json({ error: err.message || 'Training konnte nicht zugeschnitten werden.' });
            }
        });

        app.post('/api/tracks/:profile/:filename/outliers/apply', async (req, res) => {
            const profile = ensureProfile(req, res);
            if (!profile) {
                return;
            }

            const { filename } = req.params;
            const filePath = ensureTrackFile(profile, filename, res);
            if (!filePath) {
                return;
            }

            const tempPath = path.join(path.dirname(filePath), `.outlier_clean_${Date.now()}_${Math.random().toString(36).slice(2, 10)}.gpx`);

            try {
                const originalXml = fs.readFileSync(filePath, 'utf-8');
                const cleaned = await removeGpxPointRanges(originalXml, req.body?.ranges);

                fs.writeFileSync(tempPath, cleaned.xml, 'utf-8');

                const meta = await getGpxMetaCached(tempPath);
                if (!meta || meta.pointCount < 2) {
                    throw new Error('Der bereinigte Track ist zu kurz.');
                }

                replaceFileSafely(tempPath, filePath);
                transferGpxMetaCache(tempPath, filePath);

                return res.json({
                    message: 'Ausreißer erfolgreich bereinigt.',
                    filename,
                    removedRanges: cleaned.normalizedRanges.length,
                    removedPointCount: cleaned.removedPointCount,
                    pointCount: meta.pointCount,
                    distanceKm: meta.distanceKm,
                    startTime: meta.startTime
                });
            } catch (err) {
                console.error('Error cleaning outliers:', err);

                try {
                    if (fs.existsSync(tempPath)) {
                        fs.unlinkSync(tempPath);
                    }
                } catch (_) {}

                invalidateGpxMetaCache(tempPath);
                return res.status(400).json({ error: err.message || 'Ausreißer konnten nicht bereinigt werden.' });
            }
        });

        app.delete('/api/tracks/:profile/:filename', async (req, res) => {
            const profile = ensureProfile(req, res);
            if (!profile) {
                return;
            }

            const { filename } = req.params;
            const filePath = ensureTrackFile(profile, filename, res);
            if (!filePath) {
                return;
            }

            try {
                fs.unlinkSync(filePath);
                invalidateGpxMetaCache(filePath);
                await metadataStore.removeActivity(profile, filename);
                return res.json({ message: 'File deleted successfully' });
            } catch (err) {
                console.error('Error deleting file:', err);
                return res.status(500).json({ error: 'Failed to delete file' });
            }
        });

        app.delete('/api/tracks/:profile', async (req, res) => {
            const profile = ensureProfile(req, res);
            if (!profile) {
                return;
            }

            const profilePath = getProfilePath(profile);

            try {
                const gpxFiles = getTrackFilesForProfile(profile);
                let deletedCount = 0;
                let errorOccurred = false;

                if (gpxFiles.length === 0) {
                    await metadataStore.removeActivitiesForProfile(profile);
                    return res.json({ message: 'No files to delete', count: 0 });
                }

                gpxFiles.forEach(file => {
                    const filePath = path.join(profilePath, file);

                    try {
                        fs.unlinkSync(filePath);
                        invalidateGpxMetaCache(filePath);
                        deletedCount += 1;
                    } catch (unlinkErr) {
                        console.error(`Error deleting ${file}:`, unlinkErr);
                        errorOccurred = true;
                    }
                });

                const clearedPendingCount = clearProfilePending(profile);
                await metadataStore.removeActivitiesForProfile(profile);

                if (errorOccurred && deletedCount === 0) {
                    return res.status(500).json({ error: 'Failed to delete files' });
                }

                return res.json({
                    message: 'Bulk delete operation completed',
                    count: deletedCount,
                    clearedPending: clearedPendingCount,
                    hadErrors: errorOccurred
                });
            } catch (err) {
                console.error('Bulk delete failed:', err);
                return res.status(500).json({ error: 'Failed to delete files' });
            }
        });
    }

    return {
        registerRoutes
    };
}

module.exports = {
    createTrackRoutes
};
