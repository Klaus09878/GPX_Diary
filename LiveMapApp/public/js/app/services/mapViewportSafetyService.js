(function attachMapViewportSafetyServiceFactory(globalScope) {
    function createMapViewportSafetyService({
        getMap,
        getCurrentView,
        mapView,
        isValidMapCoordinatePair,
        warn
    }) {
        function isMapViewportReady() {
            const map = getMap();
            if (!map || typeof map.getContainer !== 'function' || typeof map.getSize !== 'function') {
                return false;
            }

            const container = map.getContainer();
            if (!container) {
                return false;
            }

            const width = Number(container.clientWidth);
            const height = Number(container.clientHeight);
            if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
                return false;
            }

            const size = map.getSize();
            const mapWidth = Number(size?.x);
            const mapHeight = Number(size?.y);
            return Number.isFinite(mapWidth) && Number.isFinite(mapHeight) && mapWidth > 0 && mapHeight > 0;
        }

        function isMapViewActive() {
            return getCurrentView() === mapView;
        }

        function canRenderMapOverlays() {
            return isMapViewActive() && isMapViewportReady();
        }

        async function ensureMapViewportReady({ timeoutMs = 1200, intervalMs = 50 } = {}) {
            const startedAt = Date.now();
            while (!isMapViewportReady() && (Date.now() - startedAt) < timeoutMs) {
                const map = getMap();
                if (typeof map?.invalidateSize === 'function') {
                    map.invalidateSize(false);
                }
                await new Promise(resolve => setTimeout(resolve, intervalMs));
            }

            return isMapViewportReady();
        }

        function isLeafletBoundsFinite(bounds) {
            if (!bounds || typeof bounds.isValid !== 'function' || !bounds.isValid()) {
                return false;
            }

            const sw = typeof bounds.getSouthWest === 'function' ? bounds.getSouthWest() : null;
            const ne = typeof bounds.getNorthEast === 'function' ? bounds.getNorthEast() : null;
            return isValidMapCoordinatePair(sw?.lat, sw?.lng)
                && isValidMapCoordinatePair(ne?.lat, ne?.lng);
        }

        function safeSetView(lat, lng, zoom, options) {
            if (!isValidMapCoordinatePair(lat, lng)) {
                return false;
            }

            try {
                const map = getMap();
                if (typeof map?.invalidateSize === 'function' && !isMapViewportReady()) {
                    map.invalidateSize(false);
                }

                map.setView([Number(lat), Number(lng)], zoom, {
                    ...(options || {}),
                    animate: false
                });
                return true;
            } catch (error) {
                warn('setView failed for invalid target', error);
                return false;
            }
        }

        function safeFocusBounds(bounds, options) {
            if (!isLeafletBoundsFinite(bounds)) {
                return false;
            }

            try {
                const map = getMap();
                if (typeof map?.invalidateSize === 'function' && !isMapViewportReady()) {
                    map.invalidateSize(false);
                }

                map.fitBounds(bounds, {
                    ...(options || {}),
                    animate: false
                });
                return true;
            } catch (error) {
                warn('fitBounds failed for safe bounds focus', error);
                return false;
            }
        }

        function safeFitBounds(bounds, options) {
            if (!isLeafletBoundsFinite(bounds)) {
                return false;
            }

            try {
                const map = getMap();
                if (typeof map?.invalidateSize === 'function' && !isMapViewportReady()) {
                    map.invalidateSize(false);
                }

                map.fitBounds(bounds, {
                    ...(options || {}),
                    animate: false
                });
                return true;
            } catch (error) {
                warn('fitBounds failed for invalid bounds', error);
                return false;
            }
        }

        return {
            isMapViewportReady,
            isMapViewActive,
            canRenderMapOverlays,
            ensureMapViewportReady,
            isLeafletBoundsFinite,
            safeSetView,
            safeFocusBounds,
            safeFitBounds
        };
    }

    globalScope.createMapViewportSafetyService = createMapViewportSafetyService;
})(window);
