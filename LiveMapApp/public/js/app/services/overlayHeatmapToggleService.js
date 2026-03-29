(function attachOverlayHeatmapToggleServiceFactory(globalScope) {
    function createOverlayHeatmapToggleService({
        getIsHeatmapActive,
        setIsHeatmapActive,
        getIsGlobalHeatmapActive,
        setIsGlobalHeatmapActive,
        getIsOverlayActive,
        setIsOverlayActive,
        clearHeatmapLayers,
        updateHeatmap,
        getTrackLayers,
        getActiveTrackName,
        getMap,
        getAllLineLayers,
        getHeatmapLayers
    }) {
        let hiddenLineSnapshot = [];

        function isLeafletLayer(layer) {
            return Boolean(layer && typeof layer.addTo === 'function');
        }

        function getVisibleNonHeatmapLineLayers() {
            const map = getMap();
            const heatmapLayerSet = new Set((getHeatmapLayers?.() || []).filter(isLeafletLayer));
            return (getAllLineLayers?.() || [])
                .filter(isLeafletLayer)
                .filter(layer => !heatmapLayerSet.has(layer))
                .filter(layer => map.hasLayer(layer));
        }

        function hideAllLineLayersWithSnapshot() {
            const map = getMap();
            hiddenLineSnapshot = getVisibleNonHeatmapLineLayers();
            hiddenLineSnapshot.forEach((layer) => {
                if (map.hasLayer(layer)) {
                    map.removeLayer(layer);
                }
            });
        }

        function restoreLineLayersFromSnapshot() {
            const map = getMap();
            const activeLineLayerSet = new Set((getAllLineLayers?.() || []).filter(isLeafletLayer));

            hiddenLineSnapshot.forEach((layer) => {
                if (!isLeafletLayer(layer)) {
                    return;
                }
                if (!activeLineLayerSet.has(layer)) {
                    return;
                }
                if (!map.hasLayer(layer)) {
                    layer.addTo(map);
                }
            });

            hiddenLineSnapshot = [];
        }

        function applyTrackVisibilityForOverlayState() {
            const map = getMap();
            const activeTrackName = getActiveTrackName();
            Object.entries(getTrackLayers()).forEach(([name, layer]) => {
                const shouldShow = getIsOverlayActive() || name === activeTrackName;
                if (shouldShow) {
                    if (!map.hasLayer(layer)) {
                        layer.addTo(map);
                    }
                } else if (map.hasLayer(layer)) {
                    map.removeLayer(layer);
                }
            });
        }

        function initHeatmapToggle() {
            const btn = document.getElementById('heatmap-toggle');
            if (!btn) {
                return;
            }

            btn.onclick = () => {
                const nextHeatmapActive = !getIsHeatmapActive();
                setIsHeatmapActive(nextHeatmapActive);
                btn.classList.toggle('active', nextHeatmapActive);
                document.querySelector('.map-container')?.classList.toggle('heatmap-active', nextHeatmapActive);

                if (nextHeatmapActive) {
                    hideAllLineLayersWithSnapshot();
                    updateHeatmap();
                    return;
                }

                clearHeatmapLayers();
                restoreLineLayersFromSnapshot();
                applyTrackVisibilityForOverlayState();
            };
        }

        function initHeatmapScopeToggle() {
            const btn = document.getElementById('heatmap-global-toggle');
            if (!btn) {
                return;
            }

            btn.onclick = () => {
                const nextGlobalHeatmapActive = !getIsGlobalHeatmapActive();
                setIsGlobalHeatmapActive(nextGlobalHeatmapActive);
                btn.classList.toggle('active', nextGlobalHeatmapActive);

                if (getIsHeatmapActive()) {
                    updateHeatmap();
                }
            };
        }

        function refreshOverlayVisibility() {
            if (getIsHeatmapActive()) {
                const map = getMap();
                getVisibleNonHeatmapLineLayers().forEach((layer) => {
                    if (map.hasLayer(layer)) {
                        map.removeLayer(layer);
                    }
                });
                updateHeatmap();
                return;
            }

            if (hiddenLineSnapshot.length) {
                hiddenLineSnapshot = [];
            }

            applyTrackVisibilityForOverlayState();

            if (getIsHeatmapActive()) {
                updateHeatmap();
            }
        }

        function initOverlayToggle() {
            const btn = document.getElementById('overlay-toggle');
            if (!btn) {
                return;
            }

            btn.onclick = () => {
                const nextOverlayActive = !getIsOverlayActive();
                setIsOverlayActive(nextOverlayActive);
                btn.classList.toggle('active', nextOverlayActive);
                refreshOverlayVisibility();
            };
        }

        return {
            initHeatmapToggle,
            initHeatmapScopeToggle,
            initOverlayToggle,
            refreshOverlayVisibility
        };
    }

    globalScope.createOverlayHeatmapToggleService = createOverlayHeatmapToggleService;
})(window);
