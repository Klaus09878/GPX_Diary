const { createApp } = require('./src/server/app/createApp');

const { startServer, metadataStore } = createApp({
    rootDir: __dirname,
    port: process.env.PORT
});

let server = null;

async function start() {
    try {
        server = await startServer();
    } catch (err) {
        console.error('Failed to start server:', err);
        process.exit(1);
    }
}

/**
 * Graceful shutdown handler
 * Allows in-flight requests to complete before closing
 */
function gracefulShutdown(signal) {
    console.log(`\n[shutdown] Received ${signal}, performing graceful shutdown...`);
    
    if (server) {
        server.close(() => {
            console.log('[shutdown] Server closed');
            process.exit(0);
        });

        // Force shutdown after 10 seconds if connections don't close
        setTimeout(() => {
            console.error('[shutdown] Forced shutdown after timeout');
            process.exit(1);
        }, 10000);
    } else {
        process.exit(0);
    }
}

// Register signal handlers for graceful shutdown
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
    console.error('[fatal] Uncaught exception:', err);
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('[fatal] Unhandled rejection at:', promise, 'reason:', reason);
    process.exit(1);
});

start();
