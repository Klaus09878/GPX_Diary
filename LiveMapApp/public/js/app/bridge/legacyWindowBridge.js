const REQUIRED_GLOBAL_HANDLERS = [
    'setActiveView',
    'closeElevationPanel'
];

function hasGlobalFunction(name) {
    return typeof window[name] === 'function';
}

function warnMissingGlobals() {
    const missing = REQUIRED_GLOBAL_HANDLERS.filter(name => !hasGlobalFunction(name));
    if (!missing.length) {
        return;
    }

    console.warn('[esm-bridge] Missing expected global handlers:', missing.join(', '));
}

export function initLegacyWindowBridge() {
    window.__legacyBridge = window.__legacyBridge || {
        enabled: true,
        initializedAt: Date.now(),
        mode: 'classic-globals'
    };

    warnMissingGlobals();
}
