const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const express = require('express');
const request = require('supertest');

const { createActivityMetaRoutes } = require('../src/server/routes/activityMetaRoutes');

describe('activityMetaRoutes', () => {
    let tempDir;
    let existingFile;

    beforeEach(() => {
        tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'activity-meta-routes-'));
        existingFile = path.join(tempDir, 'activity.gpx');
        fs.writeFileSync(existingFile, '<gpx></gpx>', 'utf8');
    });

    afterEach(() => {
        if (tempDir && fs.existsSync(tempDir)) {
            fs.rmSync(tempDir, { recursive: true, force: true });
        }
    });

    function buildApp(overrides = {}) {
        const metadataStore = {
            listNotes: jest.fn().mockResolvedValue([]),
            getNote: jest.fn().mockResolvedValue({ filename: 'activity.gpx', noteText: '' }),
            saveNote: jest.fn().mockResolvedValue({ filename: 'activity.gpx', noteText: 'saved' }),
            listSegmentFavorites: jest.fn().mockResolvedValue([]),
            saveSegmentFavorite: jest.fn().mockResolvedValue({ favoriteId: 7, filename: 'activity.gpx' })
        };

        const app = express();
        app.use(express.json());

        createActivityMetaRoutes({
            profiles: ['rennrad'],
            metadataStore,
            syncMetadataForProfile: jest.fn().mockResolvedValue(undefined),
            isSafeTrackFilename: (name) => typeof name === 'string' && name.endsWith('.gpx') && !name.includes('..'),
            toProfileFilePath: (_profile, filename) => path.join(tempDir, filename),
            ...overrides
        }).registerRoutes(app);

        return { app, metadataStore };
    }

    it('rejects unknown profile for notes listing', async () => {
        const { app } = buildApp();

        const response = await request(app)
            .get('/api/activities/unknown/notes')
            .expect(400);

        expect(response.body).toEqual({ error: 'Invalid profile' });
    });

    it('returns 404 for note requests when file does not exist', async () => {
        const { app, metadataStore } = buildApp();

        const response = await request(app)
            .get('/api/activities/rennrad/missing.gpx/note')
            .expect(404);

        expect(response.body).toEqual({ error: 'File not found' });
        expect(metadataStore.getNote).not.toHaveBeenCalled();
    });

    it('rejects invalid segment favorite payload', async () => {
        const { app, metadataStore } = buildApp();

        const response = await request(app)
            .post('/api/segments/rennrad/favorites')
            .send({ filename: 'activity.gpx', startIndex: 10, endIndex: 2 })
            .expect(400);

        expect(response.body).toEqual({ error: 'Invalid segment end index' });
        expect(metadataStore.saveSegmentFavorite).not.toHaveBeenCalled();
    });

    it('creates segment favorite for valid payload', async () => {
        const { app, metadataStore } = buildApp();

        const response = await request(app)
            .post('/api/segments/rennrad/favorites')
            .send({ filename: 'activity.gpx', startIndex: 2, endIndex: 10, label: 'climb' })
            .expect(201);

        expect(metadataStore.saveSegmentFavorite).toHaveBeenCalledWith(
            'rennrad',
            expect.objectContaining({
                filename: 'activity.gpx',
                startIndex: 2,
                endIndex: 10,
                label: 'climb',
                source: 'manual'
            })
        );
        expect(response.body).toEqual({ favoriteId: 7, filename: 'activity.gpx' });
    });
});
