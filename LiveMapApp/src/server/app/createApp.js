const { createAppContext } = require('./createAppContext');
const { registerAppRoutes } = require('./registerAppRoutes');

function createApp({ rootDir, port }) {
    const context = createAppContext({ rootDir, port });

    registerAppRoutes({
        app: context.app,
        coreApiRoutes: context.coreApiRoutes,
        trackRoutes: context.trackRoutes,
        activityMetaRoutes: context.activityMetaRoutes,
        uploadDomain: context.uploadDomain,
        healthRoutes: context.healthRoutes
    });

    async function startServer() {
        try {
            await context.metadataStore.initialize();
            await context.syncMetadataForAllProfiles();

            const server = context.app.listen(context.port, () => {
                console.log(`Server running on http://localhost:${context.port}`);
            });

            return server;
        } catch (err) {
            console.error('Server startup failed:', err);
            process.exit(1);
        }
    }

    return {
        app: context.app,
        startServer,
        metadataStore: context.metadataStore,
        config: {
            port: context.port
        }
    };
}

module.exports = {
    createApp
};
