const { createApp } = require('./src/server/app/createApp');

const { startServer } = createApp({
    rootDir: __dirname,
    port: process.env.PORT
});

startServer();
