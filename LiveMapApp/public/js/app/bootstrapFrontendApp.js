import { createFrontendApp } from './createFrontendApp.js';

export function bootstrapFrontendApp(windowRef = window) {
    if (windowRef.__frontendApp) {
        return windowRef.__frontendApp;
    }

    const app = createFrontendApp({
        windowRef,
        registry: windowRef.__esmViewApiRegistry
    });

    windowRef.__frontendApp = app;
    return app;
}
