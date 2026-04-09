const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const express = require('express');
const request = require('supertest');

const { createHealthRoutes } = require('../src/server/routes/healthRoutes');

describe('Health upload route', () => {
    let tempFilePath;

    afterEach(() => {
        if (tempFilePath && fs.existsSync(tempFilePath)) {
            fs.unlinkSync(tempFilePath);
        }

        tempFilePath = null;
    });

    it('aggregates step counts by date and ignores non-step rows', async () => {
        tempFilePath = path.join(os.tmpdir(), `health-upload-${Date.now()}.csv`);

        fs.writeFileSync(
            tempFilePath,
            [
                'type,startDate,steps',
                'HKQuantityTypeIdentifierStepCount,2026-03-04,3000',
                'HKQuantityTypeIdentifierStepCount,2026-03-04,2847',
                'HKQuantityTypeIdentifierBodyMass,2026-03-04,75'
            ].join('\n'),
            'utf-8'
        );

        const metadataStore = {
            upsertHealthSteps: jest.fn().mockResolvedValue(undefined)
        };

        const upload = {
            single: () => (req, res, next) => {
                req.file = { path: tempFilePath };
                next();
            }
        };

        const app = express();
        app.use(express.json());

        createHealthRoutes({ upload, metadataStore }).registerRoutes(app);

        const response = await request(app)
            .post('/api/upload/health')
            .expect(200);

        expect(response.body).toEqual({ success: true, count: 1 });
        expect(metadataStore.upsertHealthSteps).toHaveBeenCalledTimes(1);
        expect(metadataStore.upsertHealthSteps).toHaveBeenCalledWith('2026-03-04', 5847);
        expect(fs.existsSync(tempFilePath)).toBe(false);
    });
});