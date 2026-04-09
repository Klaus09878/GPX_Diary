const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const express = require('express');
const request = require('supertest');

const { createUploadDomain } = require('../src/server/routes/uploadRoutes');

describe('uploadRoutes', () => {
    let tempDir;
    let profileDir;

    beforeEach(() => {
        tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'upload-routes-'));
        profileDir = path.join(tempDir, 'rennrad');
        fs.mkdirSync(profileDir, { recursive: true });
    });

    afterEach(() => {
        if (tempDir && fs.existsSync(tempDir)) {
            fs.rmSync(tempDir, { recursive: true, force: true });
        }
    });

    function buildApp({ filesFactory } = {}) {
        const metadataStore = {
            syncProfileActivities: jest.fn().mockResolvedValue(undefined),
            upsertActivity: jest.fn().mockResolvedValue(undefined)
        };

        const upload = {
            array: jest.fn(() => (req, res, next) => {
                req.files = filesFactory ? filesFactory() : [];
                next();
            })
        };

        const app = express();
        app.use(express.json());

        createUploadDomain({
            profiles: ['rennrad'],
            dataDir: tempDir,
            upload,
            duplicatePendingTtlMs: 1000 * 60,
            sanitizeFilename: (name) => name,
            toGpxFilename: (name) => name.toLowerCase().endsWith('.gpx') ? name : `${name}.gpx`,
            convertFitToGpx: jest.fn(),
            getGpxMetaCached: jest.fn().mockResolvedValue({
                distanceKm: 1.23,
                pointCount: 100,
                hasHR: false,
                hasPower: false
            }),
            buildDuplicateMatch: jest.fn().mockReturnValue({ isDuplicate: false }),
            invalidateGpxMetaCache: jest.fn(),
            transferGpxMetaCache: jest.fn(),
            toProfileFilePath: (_profile, filename) => path.join(profileDir, filename),
            metadataStore
        }).registerRoutes(app);

        return { app, metadataStore, upload };
    }

    it('rejects invalid profile in upload middleware', async () => {
        const { app } = buildApp();

        const response = await request(app)
            .post('/api/upload/unknown')
            .expect(400);

        expect(response.body).toEqual({ error: 'Invalid profile' });
    });

    it('returns 400 when no files are uploaded', async () => {
        const { app } = buildApp();

        const response = await request(app)
            .post('/api/upload/rennrad')
            .expect(400);

        expect(response.body).toEqual({ error: 'No files uploaded' });
    });

    it('accepts a valid upload and syncs metadata', async () => {
        const incomingFile = path.join(tempDir, 'incoming.gpx');
        fs.writeFileSync(incomingFile, '<gpx></gpx>', 'utf8');

        const { app, metadataStore } = buildApp({
            filesFactory: () => [{
                path: incomingFile,
                originalname: 'incoming.gpx',
                safeOriginalName: 'incoming.gpx'
            }]
        });

        const response = await request(app)
            .post('/api/upload/rennrad')
            .expect(200);

        expect(response.body).toEqual({
            message: 'Files uploaded successfully',
            count: 1,
            uploaded: ['incoming.gpx'],
            discarded: []
        });
        expect(metadataStore.syncProfileActivities).toHaveBeenCalledWith('rennrad', ['incoming.gpx']);
        expect(fs.existsSync(path.join(profileDir, 'incoming.gpx'))).toBe(true);
    });
});
