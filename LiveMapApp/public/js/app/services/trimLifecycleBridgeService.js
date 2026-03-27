(function attachTrimLifecycleBridgeServiceFactory(globalScope) {
    function createTrimLifecycleBridgeService({
        getTrimModeStateViewApi,
        getTrimHandleIconViewApi,
        getTrimSummaryViewApi,
        getTrimPreviewViewApi,
        getTrimInteractionViewApi,
        getTrimLifecycleViewApi,
        getTrimBeginViewApi,
        getTrimCommitViewApi
    }) {
        function isTrimModeFor(profile, filename) {
            return getTrimModeStateViewApi()?.isTrimModeFor(profile, filename) || false;
        }

        function createTrimHandleIcon(kind) {
            return getTrimHandleIconViewApi()?.createTrimHandleIcon(kind) || null;
        }

        function findNearestPlaybackPointIndex(latLng, points = []) {
            return getTrimSummaryViewApi()?.findNearestPlaybackPointIndex(latLng, points) || 0;
        }

        function calculateTrimSummary(startIndex, endIndex) {
            return getTrimSummaryViewApi()?.calculateTrimSummary(startIndex, endIndex) || null;
        }

        function clearTrimSelectionLayers() {
            return getTrimPreviewViewApi()?.clearTrimSelectionLayers();
        }

        function syncTrimMarkers() {
            return getTrimPreviewViewApi()?.syncTrimMarkers();
        }

        function updateTrimPreview({ fitBounds = false } = {}) {
            return getTrimPreviewViewApi()?.updateTrimPreview({ fitBounds });
        }

        function refreshDetailsPanelIfPossible() {
            return getTrimInteractionViewApi()?.refreshDetailsPanelIfPossible();
        }

        function setTrimBoundary(kind, requestedIndex, { refreshPanel = true, fitBounds = false } = {}) {
            return getTrimInteractionViewApi()?.setTrimBoundary(kind, requestedIndex, { refreshPanel, fitBounds });
        }

        function focusTrimSelection() {
            return getTrimInteractionViewApi()?.focusTrimSelection();
        }

        function endTrimMode({ refreshPanel = true } = {}) {
            return getTrimLifecycleViewApi()?.endTrimMode({ refreshPanel });
        }

        function beginTrimMode(filename) {
            return getTrimBeginViewApi()?.beginTrimMode(filename);
        }

        async function commitTrimSelection() {
            return getTrimCommitViewApi()?.commitTrimSelection();
        }

        return {
            isTrimModeFor,
            createTrimHandleIcon,
            findNearestPlaybackPointIndex,
            calculateTrimSummary,
            clearTrimSelectionLayers,
            syncTrimMarkers,
            updateTrimPreview,
            refreshDetailsPanelIfPossible,
            setTrimBoundary,
            focusTrimSelection,
            endTrimMode,
            beginTrimMode,
            commitTrimSelection
        };
    }

    globalScope.createTrimLifecycleBridgeService = createTrimLifecycleBridgeService;
})(window);
