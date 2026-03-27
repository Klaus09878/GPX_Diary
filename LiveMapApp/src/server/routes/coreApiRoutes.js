function createCoreApiRoutes({
    profiles,
    weatherHistoryService,
    WeatherHistoryServiceError
}) {
    function registerRoutes(app) {
        app.get('/api/profiles', (req, res) => {
            return res.json(profiles);
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
                    return res.status(err.statusCode).json({ error: err.message });
                }

                console.error('Error fetching weather data:', err);
                return res.status(502).json({ error: err.message || 'Wetterdaten konnten nicht geladen werden.' });
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
