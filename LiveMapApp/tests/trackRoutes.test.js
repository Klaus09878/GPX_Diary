const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const express = require('express');
const request = require('supertest');

const { createTrackRoutes } = require('../src/server/routes/trackRoutes');

describe('trackRoutes', () => {
    let tempDir;
    let tempFile;

    beforeEach(() => {
        tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'track-routes-'));
        tempFile = path.join(tempDir, 'activity.gpx');
        fs.writeFileSync(tempFile, '<gpx></gpx>', 'utf8');
    });

    afterEach(() => {
        if (tempDir && fs.existsSync(tempDir)) {
            fs.rmSync(tempDir, { recursive: true, force: true });
        }
    });

    function buildApp(overrides = {}) {
        const syncMetadataForProfile = jest.fn().mockResolvedValue(['activity.gpx']);
        const metadataStore = {
            removeActivity: jest.fn().mockResolvedValue(undefined),
            removeActivitiesForProfile: jest.fn().mockResolvedValue(undefined)
        };

        const app = express();
        app.use(express.json());

        createTrackRoutes({
            profiles: ['rennrad'],
            syncMetadataForProfile,
            isSafeTrackFilename: (name) => typeof name === 'string' && name.endsWith('.gpx') && !name.includes('..'),
            toProfileFilePath: (_profile, filename) => path.join(tempDir, filename),
            getProfilePath: () => tempDir,
            getTrackFilesForProfile: () => ['activity.gpx'],
            trimGpxXml: jest.fn(),
            removeGpxPointRanges: jest.fn(),
            replaceFileSafely: jest.fn(),
            getGpxMetaCached: jest.fn(),
            transferGpxMetaCache: jest.fn(),
            invalidateGpxMetaCache: jest.fn(),
            metadataStore,
            clearProfilePending: jest.fn().mockReturnValue(0),
            ...overrides
        }).registerRoutes(app);

        return { app, syncMetadataForProfile, metadataStore };
    }

    it('rejects unknown profiles', async () => {
        const { app } = buildApp();

        const response = await request(app).get('/api/tracks/unknown').expect(400);

        expect(response.body).toEqual({ error: 'Invalid profile' });
    });

    it('returns synchronized track list for valid profile', async () => {
        const { app, syncMetadataForProfile } = buildApp();

        const response = await request(app).get('/api/tracks/rennrad').expect(200);

        expect(syncMetadataForProfile).toHaveBeenCalledWith('rennrad');
        expect(response.body).toEqual(['activity.gpx']);
    });

    it('rejects invalid filenames', async () => {
        const { app } = buildApp();

        const response = await request(app)
            .get('/api/tracks/rennrad/not-a-gpx.txt')
            .expect(400);

        expect(response.body).toEqual({ error: 'Invalid filename' });
    });

    it('deletes an existing track and removes metadata activity', async () => {
        const { app, metadataStore } = buildApp();

        const response = await request(app)
            .delete('/api/tracks/rennrad/activity.gpx')
            .expect(200);

        expect(response.body).toEqual({ message: 'File deleted successfully' });
        expect(metadataStore.removeActivity).toHaveBeenCalledWith('rennrad', 'activity.gpx');
        expect(fs.existsSync(tempFile)).toBe(false);
    });
});
