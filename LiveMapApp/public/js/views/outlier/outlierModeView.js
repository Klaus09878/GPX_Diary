(function attachOutlierModeViewFactory(globalScope) {
    function createOutlierModeView({
        applyTrimPreviewVisualState,
        getOutlierSelection,
        setOutlierSelection,
        clearOutlierSelectionLayers,
        getActiveTrackName,
        getCurrentProfile,
        getCachedTrack,
        applyActiveTrackVisualState,
        refreshDetailsPanelIfPossible,
        showToast,
        getPlaybackPoints,
        isOutlierModeFor,
        focusOutlierCandidate,
        endTrimMode,
        detectOutlierCandidates,
        refreshOutlierHighlights
    }) {
        function applyOutlierPreviewVisualState(gpxLayer) {
            applyTrimPreviewVisualState(gpxLayer);
        }

        function endOutlierMode({ refreshPanel = true } = {}) {
            const outlierSelection = getOutlierSelection();
            const wasActive = Boolean(outlierSelection);
            clearOutlierSelectionLayers();
            setOutlierSelection(null);

            const activeTrackName = getActiveTrackName();
            if (wasActive && activeTrackName) {
                const entry = getCachedTrack(getCurrentProfile(), activeTrackName);
                if (entry?.layer) {
                    applyActiveTrackVisualState(entry.layer);
                }
            }

            if (refreshPanel) {
                refreshDetailsPanelIfPossible();
            }
        }

        function beginOutlierMode(filename) {
            const activeTrackName = getActiveTrackName();
            if (!activeTrackName || activeTrackName !== filename) {
                showToast('Bitte zuerst das gewünschte Training auswählen.', 'warning');
                return;
            }

            const playbackPoints = getPlaybackPoints();
            if (!Array.isArray(playbackPoints) || playbackPoints.length < 3) {
                showToast('Zu wenig Trackpunkte für eine Ausreißer-Prüfung.', 'warning');
                return;
            }

            const currentProfile = getCurrentProfile();
            if (isOutlierModeFor(currentProfile, filename)) {
                const firstCandidate = getOutlierSelection()?.candidates?.[0];
                if (firstCandidate) {
                    focusOutlierCandidate(firstCandidate.id);
                }
                return;
            }

            endTrimMode({ refreshPanel: false });
            endOutlierMode({ refreshPanel: false });

            const entry = getCachedTrack(currentProfile, filename);
            if (!entry?.layer) {
                showToast('Track konnte nicht für die Ausreißer-Prüfung vorbereitet werden.', 'error');
                return;
            }

            const candidates = detectOutlierCandidates(playbackPoints, currentProfile);
            if (!candidates.length) {
                applyActiveTrackVisualState(entry.layer);
                showToast('Keine klaren Ausreißer erkannt.', 'info');
                return;
            }

            setOutlierSelection({
                profile: currentProfile,
                filename,
                candidates
            });

            applyOutlierPreviewVisualState(entry.layer);
            refreshOutlierHighlights();
            refreshDetailsPanelIfPossible();
            showToast(`${candidates.length} potenzielle Ausreißer gefunden. Bitte jeden Fund einzeln prüfen.`, 'warning');
        }

        return {
            applyOutlierPreviewVisualState,
            endOutlierMode,
            beginOutlierMode
        };
    }

    globalScope.createOutlierModeView = createOutlierModeView;
})(window);
