import { initLegacyWindowBridge } from './bridge/legacyWindowBridge.js';
import { createViewApiRegistry } from './registry/viewApiRegistry.js';
import { bootstrapFrontendApp } from './bootstrapFrontendApp.js';

function initModuleBootstrap() {
    initLegacyWindowBridge();
    window.__esmViewApiRegistry = window.__esmViewApiRegistry || createViewApiRegistry(window);
    window.__frontendApp = window.__frontendApp || bootstrapFrontendApp(window);
    window.__appBootstrap = window.__appBootstrap || {
        moduleMode: true,
        initializedAt: Date.now()
    };
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initModuleBootstrap, { once: true });
} else {
    initModuleBootstrap();
}
