export function createFrontendApp({ windowRef, registry }) {
    const runtime = {
        windowRef,
        registry,
        initializedAt: Date.now()
    };

    function getLegacyRuntime() {
        return runtime.windowRef.__legacyFrontendRuntime || null;
    }

    async function bootstrapLegacy() {
        const legacyRuntime = getLegacyRuntime();
        const controller = legacyRuntime?.frontendAppController;

        if (!controller || typeof controller.bootstrap !== 'function') {
            throw new Error('Legacy frontend controller is not available for bootstrap.');
        }

        await controller.bootstrap();
        return true;
    }

    function getStatus() {
        const legacyRuntime = getLegacyRuntime();

        return {
            initializedAt: runtime.initializedAt,
            hasLegacyRuntime: Boolean(legacyRuntime),
            hasLegacyController: Boolean(legacyRuntime?.frontendAppController),
            registryReady: Boolean(runtime.registry)
        };
    }

    return {
        getLegacyRuntime,
        bootstrapLegacy,
        getStatus
    };
}
