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
        getMap
    }) {
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

                if (!nextHeatmapActive) {
                    clearHeatmapLayers();
                }

                if (nextHeatmapActive) {
                    updateHeatmap();
                }
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
