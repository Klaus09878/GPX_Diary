(function attachMapLayerCleanupViewFactory(globalScope) {
    function createMapLayerCleanupView({
        getMap,
        getCompareOverlayLayers,
        setCompareOverlayLayers,
        getPrHighlightLayer,
        setPrHighlightLayer
    }) {
        function removeMapLayer(layer) {
            const map = getMap();
            if (layer && map && map.hasLayer(layer)) {
                map.removeLayer(layer);
            }
        }

        function clearComparisonOverlay() {
            const compareOverlayLayers = getCompareOverlayLayers();
            if (!compareOverlayLayers.length) {
                return;
            }

            compareOverlayLayers.forEach(layer => removeMapLayer(layer));
            setCompareOverlayLayers([]);
        }

        function clearPrHighlightLayer() {
            const prHighlightLayer = getPrHighlightLayer();
            if (!prHighlightLayer) {
                return;
            }

            removeMapLayer(prHighlightLayer);
            setPrHighlightLayer(null);
        }

        return {
            removeMapLayer,
            clearComparisonOverlay,
            clearPrHighlightLayer
        };
    }

    globalScope.createMapLayerCleanupView = createMapLayerCleanupView;
})(window);
