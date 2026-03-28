(function attachTrackVisualStateViewFactory(globalScope) {
    function createTrackVisualStateView({
        getCurrentProfile,
        getTrackLayers,
        isAnalysisModeEnabled,
        isAnalysisAvailable,
        getAnalysisMode,
        analysisModeElevation,
        analysisModeSpeed,
        drawElevationAnalysis,
        drawSpeedAnalysis,
        clearAnalysisOverlayLayers,
        getPlaybackPoints,
        updateAnalysisControlAvailability
    }) {
        function applyActiveTrackVisualState(gpxLayer) {
            const currentProfile = getCurrentProfile();
            const profileColor = getComputedStyle(document.documentElement).getPropertyValue(`--${currentProfile}-color`).trim();
            const canRenderAnalysis = isAnalysisModeEnabled() && isAnalysisAvailable();

            Object.values(getTrackLayers()).forEach(layer => {
                layer.setStyle({ color: profileColor, weight: 5, opacity: 0.3 });
            });

            const analysisMode = getAnalysisMode();
            if (canRenderAnalysis && analysisMode === analysisModeElevation) {
                gpxLayer.setStyle({ color: '#f8fafc', weight: 4, opacity: 0.28 });
                gpxLayer.bringToBack();
                drawElevationAnalysis(getPlaybackPoints());
            } else if (canRenderAnalysis && analysisMode === analysisModeSpeed) {
                gpxLayer.setStyle({ color: '#f8fafc', weight: 4, opacity: 0.28 });
                gpxLayer.bringToBack();
                drawSpeedAnalysis(getPlaybackPoints());
            } else {
                clearAnalysisOverlayLayers();
                gpxLayer.setStyle({ color: '#ffdd00', weight: 5, opacity: 0.95 });
                gpxLayer.bringToFront();
            }

            updateAnalysisControlAvailability();
        }

        function applyTrimPreviewVisualState(gpxLayer) {
            const currentProfile = getCurrentProfile();
            const profileColor = getComputedStyle(document.documentElement).getPropertyValue(`--${currentProfile}-color`).trim();

            Object.values(getTrackLayers()).forEach(layer => {
                layer.setStyle({ color: profileColor, weight: 5, opacity: 0.24 });
            });

            clearAnalysisOverlayLayers();

            gpxLayer.setStyle({ color: '#94a3b8', weight: 5, opacity: 0.32 });
            gpxLayer.bringToBack();
        }

        return {
            applyActiveTrackVisualState,
            applyTrimPreviewVisualState
        };
    }

    globalScope.createTrackVisualStateView = createTrackVisualStateView;
})(window);
