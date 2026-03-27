(function attachAnalysisModeViewFactory(globalScope) {
    function createAnalysisModeView({
        analysisModeOff,
        analysisModeElevation,
        analysisModeSpeed,
        getAnalysisMode,
        setAnalysisModeState,
        getActiveTrackName,
        getCurrentProfile,
        getCachedTrack,
        getPlaybackPoints,
        clearAnalysisOverlayLayers,
        closeElevationPanel,
        selectTrack,
        showToast
    }) {
        function isAnalysisModeEnabled(mode = getAnalysisMode()) {
            return mode === analysisModeElevation || mode === analysisModeSpeed;
        }

        function isAnalysisAvailable() {
            const activeTrackName = getActiveTrackName();
            if (!activeTrackName) {
                return false;
            }

            const entry = getCachedTrack(getCurrentProfile(), activeTrackName);
            if (!entry?.layer) {
                return false;
            }

            const playbackPoints = getPlaybackPoints();
            return Array.isArray(playbackPoints) && playbackPoints.length > 1;
        }

        function syncAnalysisToggleButtons() {
            const elevationBtn = document.getElementById('gradient-overlay-toggle');
            const speedBtn = document.getElementById('speed-overlay-toggle');
            const analysisMode = getAnalysisMode();

            if (elevationBtn) {
                elevationBtn.classList.toggle('active', analysisMode === analysisModeElevation);
            }

            if (speedBtn) {
                speedBtn.classList.toggle('active', analysisMode === analysisModeSpeed);
            }
        }

        function updateAnalysisControlAvailability() {
            const elevationBtn = document.getElementById('gradient-overlay-toggle');
            const speedBtn = document.getElementById('speed-overlay-toggle');
            const available = isAnalysisAvailable();

            [elevationBtn, speedBtn].forEach(btn => {
                if (!btn) {
                    return;
                }

                btn.disabled = !available;
                btn.classList.toggle('is-disabled', !available);
            });

            if (elevationBtn) {
                elevationBtn.title = available
                    ? 'Steigungs-Analyse (50m Segmente) ein/aus'
                    : 'Bitte zuerst einen Track laden und auswählen.';
            }

            if (speedBtn) {
                speedBtn.title = available
                    ? 'Geschwindigkeits-Analyse ein/aus'
                    : 'Bitte zuerst einen Track laden und auswählen.';
            }

            if (!available) {
                clearAnalysisOverlayLayers();
            }

            syncAnalysisToggleButtons();
        }

        function setAnalysisMode(nextMode, { refreshSelection = true } = {}) {
            const normalizedMode = (nextMode === analysisModeElevation || nextMode === analysisModeSpeed)
                ? nextMode
                : analysisModeOff;

            setAnalysisModeState(normalizedMode);
            syncAnalysisToggleButtons();

            if (isAnalysisModeEnabled()) {
                closeElevationPanel();
            }

            const activeTrackName = getActiveTrackName();
            if (refreshSelection && activeTrackName) {
                selectTrack(activeTrackName);
                return;
            }

            if (!isAnalysisModeEnabled()) {
                clearAnalysisOverlayLayers();
            }
        }

        function initGradientToggle() {
            const elevationBtn = document.getElementById('gradient-overlay-toggle');
            const speedBtn = document.getElementById('speed-overlay-toggle');

            if (elevationBtn) {
                elevationBtn.onclick = () => {
                    if (!isAnalysisAvailable()) {
                        showToast('Bitte zuerst einen Track laden und auswählen.', 'info');
                        return;
                    }

                    const nextMode = getAnalysisMode() === analysisModeElevation
                        ? analysisModeOff
                        : analysisModeElevation;
                    setAnalysisMode(nextMode);
                };
            }

            if (speedBtn) {
                speedBtn.onclick = () => {
                    if (!isAnalysisAvailable()) {
                        showToast('Bitte zuerst einen Track laden und auswählen.', 'info');
                        return;
                    }

                    const nextMode = getAnalysisMode() === analysisModeSpeed
                        ? analysisModeOff
                        : analysisModeSpeed;
                    setAnalysisMode(nextMode);
                };
            }

            syncAnalysisToggleButtons();
            updateAnalysisControlAvailability();
        }

        return {
            isAnalysisModeEnabled,
            isAnalysisAvailable,
            syncAnalysisToggleButtons,
            updateAnalysisControlAvailability,
            setAnalysisMode,
            initGradientToggle
        };
    }

    globalScope.createAnalysisModeView = createAnalysisModeView;
})(window);
