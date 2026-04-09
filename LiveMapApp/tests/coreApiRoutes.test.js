const express = require('express');
const request = require('supertest');

const { createCoreApiRoutes } = require('../src/server/routes/coreApiRoutes');

describe('coreApiRoutes', () => {
    function buildApp(overrides = {}) {
        const weatherHistoryService = {
            getWeatherHistory: jest.fn().mockResolvedValue({ ok: true }),
            ...(overrides.weatherHistoryService || {})
        };

        class LocalWeatherError extends Error {
            constructor(message, statusCode) {
                super(message);
                this.statusCode = statusCode;
            }
        }

        const app = express();
        createCoreApiRoutes({
            profiles: overrides.profiles || ['rennrad', 'gravel'],
            supportUrl: overrides.supportUrl,
            weatherHistoryService,
            WeatherHistoryServiceError: overrides.WeatherHistoryServiceError || LocalWeatherError
        }).registerRoutes(app);

        return { app, weatherHistoryService, LocalWeatherError };
    }

    it('returns profiles and public config', async () => {
        const { app } = buildApp({ supportUrl: 'https://example.com/help' });

        const profilesRes = await request(app).get('/api/profiles').expect(200);
        const configRes = await request(app).get('/api/public-config').expect(200);

        expect(profilesRes.body).toEqual(['rennrad', 'gravel']);
        expect(configRes.body).toEqual({ supportUrl: 'https://example.com/help' });
    });

    it('passes weather query to weatherHistoryService', async () => {
        const { app, weatherHistoryService } = buildApp();

        await request(app)
            .get('/api/weather/history')
            .query({ lat: '50.1', lon: '8.6', timeMs: '1234' })
            .expect(200);

        expect(weatherHistoryService.getWeatherHistory).toHaveBeenCalledWith({
            lat: '50.1',
            lon: '8.6',
            timeMs: '1234',
            timestamp: undefined
        });
    });

    it('maps WeatherHistoryServiceError status and message', async () => {
        const { app, weatherHistoryService, LocalWeatherError } = buildApp();
        weatherHistoryService.getWeatherHistory.mockRejectedValue(
            new LocalWeatherError('Bad weather request', 400)
        );

        const response = await request(app)
            .get('/api/weather/history')
            .expect(400);

        expect(response.body).toEqual({ error: 'Bad weather request' });
    });

    it('returns sanitized 502 for unexpected weather errors', async () => {
        const { app, weatherHistoryService } = buildApp();
        weatherHistoryService.getWeatherHistory.mockRejectedValue(new Error('provider unavailable'));

        const response = await request(app)
            .get('/api/weather/history')
            .expect(502);

        expect(response.body).toEqual({ error: 'Wetterdaten konnten nicht geladen werden.' });
    });

    it('sanitizes WeatherHistoryServiceError responses for server-side status codes', async () => {
        const { app, weatherHistoryService, LocalWeatherError } = buildApp();
        weatherHistoryService.getWeatherHistory.mockRejectedValue(
            new LocalWeatherError('Internal provider detail', 502)
        );

        const response = await request(app)
            .get('/api/weather/history')
            .expect(502);

        expect(response.body).toEqual({ error: 'Wetterdaten konnten nicht geladen werden.' });
    });
});
