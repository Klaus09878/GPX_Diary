function registerAppRoutes({
    app,
    coreApiRoutes,
    trackRoutes,
    activityMetaRoutes,
    uploadDomain,
    healthRoutes
}) {
    coreApiRoutes.registerRoutes(app);
    trackRoutes.registerRoutes(app);
    activityMetaRoutes.registerRoutes(app);
    uploadDomain.registerRoutes(app);
    healthRoutes.registerRoutes(app);

    app.use('/api', (req, res) => {
        return res.status(404).json({ error: 'API-Endpunkt nicht gefunden.' });
    });

    app.use((err, req, res, next) => {
        if (res.headersSent) {
            return next(err);
        }

        console.error('Unhandled server error:', err);
        return res.status(500).json({ error: 'Interner Serverfehler.' });
    });
}

module.exports = {
    registerAppRoutes
};
