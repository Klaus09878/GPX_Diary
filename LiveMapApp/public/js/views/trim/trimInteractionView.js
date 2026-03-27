(function attachTrimInteractionViewFactory(globalScope) {
    function createTrimInteractionView({
        getActiveTrackName,
        getCurrentProfile,
        getCachedTrack,
        updateDetailsPanel,
        getTrimSelection,
        getPlaybackPoints,
        updateTrimPreview,
        getMap
    }) {
        function refreshDetailsPanelIfPossible() {
            const activeTrackName = getActiveTrackName();
            if (!activeTrackName) {
                return;
            }

            const entry = getCachedTrack(getCurrentProfile(), activeTrackName);
            if (entry?.layer) {
                updateDetailsPanel(activeTrackName, entry.layer);
            }
        }

        function setTrimBoundary(kind, requestedIndex, { refreshPanel = true, fitBounds = false } = {}) {
            const trimSelection = getTrimSelection();
            const playbackPoints = getPlaybackPoints();
            if (!trimSelection || !playbackPoints.length) {
                return;
            }

            const maxIndex = playbackPoints.length - 1;
            let nextIndex = Math.max(0, Math.min(maxIndex, Number(requestedIndex) || 0));

            if (kind === 'start') {
                nextIndex = Math.min(nextIndex, trimSelection.endIndex - 1);
                trimSelection.startIndex = nextIndex;
            } else {
                nextIndex = Math.max(nextIndex, trimSelection.startIndex + 1);
                trimSelection.endIndex = nextIndex;
            }

            updateTrimPreview({ fitBounds });

            if (refreshPanel) {
                refreshDetailsPanelIfPossible();
            }
        }

        function focusTrimSelection() {
            const trimSelection = getTrimSelection();
            const map = getMap();
            if (!map || !trimSelection?.previewLayer) {
                return;
            }

            map.fitBounds(trimSelection.previewLayer.getBounds(), { padding: [50, 50] });
        }

        return {
            refreshDetailsPanelIfPossible,
            setTrimBoundary,
            focusTrimSelection
        };
    }

    globalScope.createTrimInteractionView = createTrimInteractionView;
})(window);
