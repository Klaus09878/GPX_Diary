(function attachTrimLifecycleViewFactory(globalScope) {
    function createTrimLifecycleView({
        getTrimSelection,
        setTrimSelection,
        clearTrimSelectionLayers,
        getActiveTrackName,
        getCurrentProfile,
        getCachedTrack,
        applyActiveTrackVisualState,
        refreshDetailsPanelIfPossible
    }) {
        function endTrimMode({ refreshPanel = true } = {}) {
            const trimSelection = getTrimSelection();
            const wasActive = Boolean(trimSelection);
            clearTrimSelectionLayers();
            setTrimSelection(null);

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

        return {
            endTrimMode
        };
    }

    globalScope.createTrimLifecycleView = createTrimLifecycleView;
})(window);
