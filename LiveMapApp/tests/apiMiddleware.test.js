const express = require('express');
const request = require('supertest');

const { createApiMiddlewares } = require('../src/server/http/middleware/apiMiddleware');

describe('apiMiddleware security behavior', () => {
    function buildApp({ trustProxy = false, maxRequests = 1 } = {}) {
        const app = express();
        const {
            applyApiRateLimit,
            applyWriteRateLimit,
            setApiNoStoreCache
        } = createApiMiddlewares({
            trustProxy,
            apiRateWindowMs: 60 * 1000,
            apiRateMaxRequests: maxRequests,
            apiTrackReadRateWindowMs: 60 * 1000,
            apiTrackReadRateMaxRequests: maxRequests,
            apiWriteRateWindowMs: 60 * 1000,
            apiWriteRateMaxRequests: maxRequests
        });

        app.use('/api', applyApiRateLimit, applyWriteRateLimit, setApiNoStoreCache);
        app.get('/api/ping', (req, res) => res.json({ ok: true }));

        return app;
    }

    it('ignores spoofed x-forwarded-for when trustProxy is disabled', async () => {
        const app = buildApp({ trustProxy: false, maxRequests: 1 });

        await request(app)
            .get('/api/ping')
            .set('x-forwarded-for', '1.1.1.1')
            .expect(200);

        await request(app)
            .get('/api/ping')
            .set('x-forwarded-for', '2.2.2.2')
            .expect(429);
    });

    it('uses x-forwarded-for when trustProxy is enabled', async () => {
        const app = buildApp({ trustProxy: true, maxRequests: 1 });

        await request(app)
            .get('/api/ping')
            .set('x-forwarded-for', '1.1.1.1')
            .expect(200);

        await request(app)
            .get('/api/ping')
            .set('x-forwarded-for', '2.2.2.2')
            .expect(200);
    });

    it('sets no-store cache header for /api responses', async () => {
        const app = buildApp({ trustProxy: false, maxRequests: 5 });

        const response = await request(app)
            .get('/api/ping')
            .expect(200);

        expect(response.headers['cache-control']).toBe('no-store');
    });
});
