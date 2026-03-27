const fs = require('fs');

function createActivityMetaRoutes({
    profiles,
    metadataStore,
    syncMetadataForProfile,
    isSafeTrackFilename,
    toProfileFilePath
}) {
    function normalizeSegmentFavoriteRequestPayload(payload = {}) {
        const filename = typeof payload.filename === 'string' ? payload.filename.trim() : '';
        const startIndex = Number.parseInt(payload.startIndex, 10);
        const endIndex = Number.parseInt(payload.endIndex, 10);
        const label = typeof payload.label === 'string' ? payload.label.trim().slice(0, 140) : '';
        const source = payload.source === 'suggested' ? 'suggested' : 'manual';

        if (!filename || !isSafeTrackFilename(filename)) {
            return { error: 'Invalid filename' };
        }

        if (!Number.isInteger(startIndex) || startIndex < 0) {
            return { error: 'Invalid segment start index' };
        }

        if (!Number.isInteger(endIndex) || endIndex <= startIndex) {
            return { error: 'Invalid segment end index' };
        }

        return {
            value: {
                filename,
                startIndex,
                endIndex,
                label,
                source
            }
        };
    }

    function parseEquipmentDistance(value, { allowNull = false, defaultValue = 0, fieldLabel = 'Wert' } = {}) {
        if (value === null || value === undefined || (typeof value === 'string' && value.trim() === '')) {
            return allowNull ? null : defaultValue;
        }

        const parsed = Number(value);
        if (!Number.isFinite(parsed) || parsed < 0) {
            throw new Error(`${fieldLabel} ist ungültig.`);
        }

        return parsed;
    }

    function normalizeEquipmentRequestPayload(payload = {}, { requireName = true } = {}) {
        const name = typeof payload.name === 'string' ? payload.name.trim().slice(0, 100) : '';
        if (requireName && !name) {
            throw new Error('Name ist erforderlich.');
        }

        const category = typeof payload.category === 'string' ? payload.category.trim().slice(0, 80) : '';
        const notes = typeof payload.notes === 'string' ? payload.notes.trim().slice(0, 2000) : '';
        const serviceIntervalKm = parseEquipmentDistance(payload.serviceIntervalKm, {
            allowNull: true,
            fieldLabel: 'Service-Intervall'
        });
        let serviceWarnKm = parseEquipmentDistance(payload.serviceWarnKm, {
            allowNull: false,
            defaultValue: 0,
            fieldLabel: 'Service-Warnwert'
        });
        const serviceStartKm = parseEquipmentDistance(payload.serviceStartKm, {
            allowNull: false,
            defaultValue: 0,
            fieldLabel: 'Service-Basis'
        });

        if (serviceIntervalKm !== null && serviceWarnKm > serviceIntervalKm) {
            serviceWarnKm = serviceIntervalKm;
        }

        return {
            name,
            category,
            notes,
            serviceIntervalKm,
            serviceWarnKm,
            serviceStartKm,
            isActive: payload.isActive === undefined ? true : Boolean(payload.isActive)
        };
    }

    function ensureProfile(req, res) {
        const profile = req.params.profile;
        if (!profiles.includes(profile)) {
            res.status(400).json({ error: 'Invalid profile' });
            return null;
        }

        return profile;
    }

    function registerRoutes(app) {
        app.get('/api/activities/:profile/notes', async (req, res) => {
            const profile = ensureProfile(req, res);
            if (!profile) {
                return;
            }

            try {
                await syncMetadataForProfile(profile);
                const notes = await metadataStore.listNotes(profile);
                return res.json(notes);
            } catch (err) {
                console.error('Failed to list activity notes:', err);
                return res.status(500).json({ error: 'Aktivitäts-Notizen konnten nicht geladen werden.' });
            }
        });

        app.get('/api/activities/:profile/:filename/note', async (req, res) => {
            const profile = ensureProfile(req, res);
            if (!profile) {
                return;
            }

            const { filename } = req.params;
            if (!isSafeTrackFilename(filename)) {
                return res.status(400).json({ error: 'Invalid filename' });
            }

            const filePath = toProfileFilePath(profile, filename);
            if (!filePath || !fs.existsSync(filePath)) {
                return res.status(404).json({ error: 'File not found' });
            }

            try {
                const note = await metadataStore.getNote(profile, filename);
                return res.json(note);
            } catch (err) {
                console.error('Failed to load activity note:', err);
                return res.status(500).json({ error: 'Aktivitäts-Notiz konnte nicht geladen werden.' });
            }
        });

        app.put('/api/activities/:profile/:filename/note', async (req, res) => {
            const profile = ensureProfile(req, res);
            if (!profile) {
                return;
            }

            const { filename } = req.params;
            if (!isSafeTrackFilename(filename)) {
                return res.status(400).json({ error: 'Invalid filename' });
            }

            const filePath = toProfileFilePath(profile, filename);
            if (!filePath || !fs.existsSync(filePath)) {
                return res.status(404).json({ error: 'File not found' });
            }

            try {
                const note = await metadataStore.saveNote(profile, filename, req.body || {});
                return res.json(note);
            } catch (err) {
                console.error('Failed to save activity note:', err);
                return res.status(500).json({ error: 'Aktivitäts-Notiz konnte nicht gespeichert werden.' });
            }
        });

        app.get('/api/segments/:profile/favorites', async (req, res) => {
            const profile = ensureProfile(req, res);
            if (!profile) {
                return;
            }

            try {
                await syncMetadataForProfile(profile);
                const favorites = await metadataStore.listSegmentFavorites(profile);
                return res.json(favorites);
            } catch (err) {
                console.error('Failed to list segment favorites:', err);
                return res.status(500).json({ error: 'Segment-Favoriten konnten nicht geladen werden.' });
            }
        });

        app.post('/api/segments/:profile/favorites', async (req, res) => {
            const profile = ensureProfile(req, res);
            if (!profile) {
                return;
            }

            const normalized = normalizeSegmentFavoriteRequestPayload(req.body || {});
            if (!normalized.value) {
                return res.status(400).json({ error: normalized.error || 'Ungültige Favoritendaten.' });
            }

            const filePath = toProfileFilePath(profile, normalized.value.filename);
            if (!filePath || !fs.existsSync(filePath)) {
                return res.status(404).json({ error: 'File not found' });
            }

            try {
                const favorite = await metadataStore.saveSegmentFavorite(profile, normalized.value);
                if (!favorite) {
                    return res.status(500).json({ error: 'Segment-Favorit konnte nicht gespeichert werden.' });
                }

                return res.status(201).json(favorite);
            } catch (err) {
                console.error('Failed to create segment favorite:', err);
                return res.status(500).json({ error: 'Segment-Favorit konnte nicht gespeichert werden.' });
            }
        });

        app.put('/api/segments/:profile/favorites/:favoriteId', async (req, res) => {
            const profile = ensureProfile(req, res);
            if (!profile) {
                return;
            }

            const favoriteId = Number.parseInt(req.params.favoriteId, 10);
            if (!Number.isInteger(favoriteId) || favoriteId <= 0) {
                return res.status(400).json({ error: 'Invalid favorite id' });
            }

            const normalized = normalizeSegmentFavoriteRequestPayload(req.body || {});
            if (!normalized.value) {
                return res.status(400).json({ error: normalized.error || 'Ungültige Favoritendaten.' });
            }

            const filePath = toProfileFilePath(profile, normalized.value.filename);
            if (!filePath || !fs.existsSync(filePath)) {
                return res.status(404).json({ error: 'File not found' });
            }

            try {
                const favorite = await metadataStore.saveSegmentFavorite(profile, normalized.value, favoriteId);
                if (!favorite) {
                    return res.status(404).json({ error: 'Segment-Favorit nicht gefunden.' });
                }

                return res.json(favorite);
            } catch (err) {
                console.error('Failed to update segment favorite:', err);
                return res.status(500).json({ error: 'Segment-Favorit konnte nicht gespeichert werden.' });
            }
        });

        app.delete('/api/segments/:profile/favorites/:favoriteId', async (req, res) => {
            const profile = ensureProfile(req, res);
            if (!profile) {
                return;
            }

            const favoriteId = Number.parseInt(req.params.favoriteId, 10);
            if (!Number.isInteger(favoriteId) || favoriteId <= 0) {
                return res.status(400).json({ error: 'Invalid favorite id' });
            }

            try {
                const removed = await metadataStore.removeSegmentFavorite(profile, favoriteId);
                if (!removed) {
                    return res.status(404).json({ error: 'Segment-Favorit nicht gefunden.' });
                }

                return res.json({ message: 'Segment-Favorit gelöscht.' });
            } catch (err) {
                console.error('Failed to remove segment favorite:', err);
                return res.status(500).json({ error: 'Segment-Favorit konnte nicht gelöscht werden.' });
            }
        });

        app.get('/api/equipment/:profile', async (req, res) => {
            const profile = ensureProfile(req, res);
            if (!profile) {
                return;
            }

            try {
                const equipment = await metadataStore.listEquipment(profile);
                return res.json(equipment);
            } catch (err) {
                console.error('Failed to list equipment:', err);
                return res.status(500).json({ error: 'Ausrüstung konnte nicht geladen werden.' });
            }
        });

        app.post('/api/equipment/:profile', async (req, res) => {
            const profile = ensureProfile(req, res);
            if (!profile) {
                return;
            }

            let payload;
            try {
                payload = normalizeEquipmentRequestPayload(req.body || {}, { requireName: true });
            } catch (error) {
                return res.status(400).json({ error: error.message || 'Ungültige Ausrüstungsdaten.' });
            }

            try {
                const equipment = await metadataStore.saveEquipment(profile, payload);
                return res.status(201).json(equipment);
            } catch (err) {
                console.error('Failed to create equipment:', err);
                return res.status(500).json({ error: 'Ausrüstung konnte nicht gespeichert werden.' });
            }
        });

        app.get('/api/equipment/:profile/assignments', async (req, res) => {
            const profile = ensureProfile(req, res);
            if (!profile) {
                return;
            }

            try {
                await syncMetadataForProfile(profile);
                const assignments = await metadataStore.listActivityEquipmentAssignments(profile);
                return res.json(assignments);
            } catch (err) {
                console.error('Failed to list equipment assignments:', err);
                return res.status(500).json({ error: 'Ausrüstungs-Zuweisungen konnten nicht geladen werden.' });
            }
        });

        app.get('/api/equipment/:profile/:filename/assignment', async (req, res) => {
            const profile = ensureProfile(req, res);
            if (!profile) {
                return;
            }

            const { filename } = req.params;
            if (!isSafeTrackFilename(filename)) {
                return res.status(400).json({ error: 'Invalid filename' });
            }

            const filePath = toProfileFilePath(profile, filename);
            if (!filePath || !fs.existsSync(filePath)) {
                return res.status(404).json({ error: 'File not found' });
            }

            try {
                const assignment = await metadataStore.getActivityEquipmentAssignment(profile, filename);
                return res.json(assignment);
            } catch (err) {
                console.error('Failed to load equipment assignment:', err);
                return res.status(500).json({ error: 'Ausrüstungs-Zuweisung konnte nicht geladen werden.' });
            }
        });

        app.put('/api/equipment/:profile/:filename/assignment', async (req, res) => {
            const profile = ensureProfile(req, res);
            if (!profile) {
                return;
            }

            const { filename } = req.params;
            if (!isSafeTrackFilename(filename)) {
                return res.status(400).json({ error: 'Invalid filename' });
            }

            const filePath = toProfileFilePath(profile, filename);
            if (!filePath || !fs.existsSync(filePath)) {
                return res.status(404).json({ error: 'File not found' });
            }

            const equipmentId = req.body?.equipmentId ?? null;

            try {
                const assignment = await metadataStore.setActivityEquipmentAssignment(profile, filename, equipmentId);
                return res.json(assignment);
            } catch (err) {
                if (err.message === 'equipment not found') {
                    return res.status(404).json({ error: 'Ausrüstung nicht gefunden.' });
                }

                if (err.message === 'equipmentId is invalid') {
                    return res.status(400).json({ error: 'Ungültige Ausrüstungs-ID.' });
                }

                console.error('Failed to save equipment assignment:', err);
                return res.status(500).json({ error: 'Ausrüstungs-Zuweisung konnte nicht gespeichert werden.' });
            }
        });

        app.put('/api/equipment/:profile/:equipmentId', async (req, res) => {
            const profile = ensureProfile(req, res);
            if (!profile) {
                return;
            }

            const equipmentId = Number.parseInt(req.params.equipmentId, 10);
            if (!Number.isInteger(equipmentId) || equipmentId <= 0) {
                return res.status(400).json({ error: 'Ungültige Ausrüstungs-ID.' });
            }

            let payload;
            try {
                payload = normalizeEquipmentRequestPayload(req.body || {}, { requireName: true });
            } catch (error) {
                return res.status(400).json({ error: error.message || 'Ungültige Ausrüstungsdaten.' });
            }

            try {
                const equipment = await metadataStore.saveEquipment(profile, payload, equipmentId);
                if (!equipment) {
                    return res.status(404).json({ error: 'Ausrüstung nicht gefunden.' });
                }

                return res.json(equipment);
            } catch (err) {
                console.error('Failed to update equipment:', err);
                return res.status(500).json({ error: 'Ausrüstung konnte nicht gespeichert werden.' });
            }
        });

        app.delete('/api/equipment/:profile/:equipmentId', async (req, res) => {
            const profile = ensureProfile(req, res);
            if (!profile) {
                return;
            }

            const equipmentId = Number.parseInt(req.params.equipmentId, 10);
            if (!Number.isInteger(equipmentId) || equipmentId <= 0) {
                return res.status(400).json({ error: 'Ungültige Ausrüstungs-ID.' });
            }

            try {
                const removed = await metadataStore.removeEquipment(profile, equipmentId);
                if (!removed) {
                    return res.status(404).json({ error: 'Ausrüstung nicht gefunden.' });
                }

                return res.json({ message: 'Ausrüstung gelöscht.' });
            } catch (err) {
                console.error('Failed to delete equipment:', err);
                return res.status(500).json({ error: 'Ausrüstung konnte nicht gelöscht werden.' });
            }
        });
    }

    return {
        registerRoutes
    };
}

module.exports = {
    createActivityMetaRoutes
};
