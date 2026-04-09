(function attachMapStateManagerFactory(globalScope) {
    function createMapStateManager(accessors = {}) {
        function read(name, fallback) {
            const getter = accessors[name];
            return typeof getter === 'function' ? getter() : fallback;
        }

        function write(name, value) {
            const setter = accessors[name];
            if (typeof setter === 'function') {
                setter(value);
            }
            return value;
        }

        function getMap() {
            return read('getMap', null);
        }

        function setMap(nextMap) {
            return write('setMap', nextMap);
        }

        function getIsHeatmapActive() {
            return Boolean(read('getIsHeatmapActive', false));
        }

        function setIsHeatmapActive(nextValue) {
            const normalized = Boolean(nextValue);
            return write('setIsHeatmapActive', normalized);
        }

        function getIsGlobalHeatmapActive() {
            return Boolean(read('getIsGlobalHeatmapActive', false));
        }

        function setIsGlobalHeatmapActive(nextValue) {
            const normalized = Boolean(nextValue);
            return write('setIsGlobalHeatmapActive', normalized);
        }

        function getIsOverlayActive() {
            return Boolean(read('getIsOverlayActive', false));
        }

        function setIsOverlayActive(nextValue) {
            const normalized = Boolean(nextValue);
            return write('setIsOverlayActive', normalized);
        }

        function getHeatmapLayers() {
            const layers = read('getHeatmapLayers', []);
            return Array.isArray(layers) ? layers : [];
        }

        function setHeatmapLayers(nextValue) {
            const normalized = Array.isArray(nextValue) ? nextValue : [];
            return write('setHeatmapLayers', normalized);
        }

        return {
            getMap,
            setMap,
            getIsHeatmapActive,
            setIsHeatmapActive,
            getIsGlobalHeatmapActive,
            setIsGlobalHeatmapActive,
            getIsOverlayActive,
            setIsOverlayActive,
            getHeatmapLayers,
            setHeatmapLayers
        };
    }

    globalScope.createMapStateManager = createMapStateManager;
})(window);
