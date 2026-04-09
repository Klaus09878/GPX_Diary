function createCoreApiRoutes({
    profiles,
    supportUrl,
    weatherHistoryService,
    WeatherHistoryServiceError
}) {
    function isClientErrorStatus(statusCode) {
        return Number.isInteger(statusCode) && statusCode >= 400 && statusCode < 500;
    }

    function registerRoutes(app) {
        app.get('/api/profiles', (req, res) => {
            return res.json(profiles);
        });

        app.get('/api/public-config', (req, res) => {
            return res.json({
                supportUrl: typeof supportUrl === 'string' ? supportUrl : ''
            });
        });

        app.get('/api/weather/history', async (req, res) => {
            try {
                const weatherPayload = await weatherHistoryService.getWeatherHistory({
                    lat: req.query.lat,
                    lon: req.query.lon,
                    timeMs: req.query.timeMs,
                    timestamp: req.query.timestamp
                });

                return res.json(weatherPayload);
            } catch (err) {
                if (err instanceof WeatherHistoryServiceError && Number.isInteger(err.statusCode)) {
                    if (isClientErrorStatus(err.statusCode)) {
                        return res.status(err.statusCode).json({ error: err.message });
                    }

                    console.error('Weather service failure:', err);
                    return res.status(err.statusCode).json({ error: 'Wetterdaten konnten nicht geladen werden.' });
                }

                console.error('Error fetching weather data:', err);
                return res.status(502).json({ error: 'Wetterdaten konnten nicht geladen werden.' });
            }
        });
    }

    return {
        registerRoutes
    };
}

module.exports = {
    createCoreApiRoutes
};
