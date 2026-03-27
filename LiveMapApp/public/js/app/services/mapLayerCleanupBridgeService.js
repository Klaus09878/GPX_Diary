(function attachMapLayerCleanupBridgeServiceFactory(globalScope) {
    function createMapLayerCleanupBridgeService({ getMapLayerCleanupViewApi, getTrackVisualStateViewApi }) {
        function removeMapLayer(layer) {
            return getMapLayerCleanupViewApi()?.removeMapLayer(layer);
        }

        function clearComparisonOverlay() {
            return getMapLayerCleanupViewApi()?.clearComparisonOverlay();
        }

        function clearPrHighlightLayer() {
            return getMapLayerCleanupViewApi()?.clearPrHighlightLayer();
        }

        function applyActiveTrackVisualState(gpxLayer) {
            return getTrackVisualStateViewApi()?.applyActiveTrackVisualState(gpxLayer);
        }

        function applyTrimPreviewVisualState(gpxLayer) {
            return getTrackVisualStateViewApi()?.applyTrimPreviewVisualState(gpxLayer);
        }

        return {
            removeMapLayer,
            clearComparisonOverlay,
            clearPrHighlightLayer,
            applyActiveTrackVisualState,
            applyTrimPreviewVisualState
        };
    }

    globalScope.createMapLayerCleanupBridgeService = createMapLayerCleanupBridgeService;
})(window);
