(function(global) {
    function createMapSafetyBridgeService(deps) {
        const {
            mapCoordinateValidationService,
            mapViewportSafetyService
        } = deps;

        function isFiniteTrackPoint(point) {
            return mapCoordinateValidationService.isFiniteTrackPoint(point);
        }

        function isValidLatitude(value) {
            return mapCoordinateValidationService.isValidLatitude(value);
        }

        function isValidLongitude(value) {
            return mapCoordinateValidationService.isValidLongitude(value);
        }

        function isValidMapCoordinatePair(lat, lng) {
            return mapCoordinateValidationService.isValidMapCoordinatePair(lat, lng);
        }

        function normalizeTrackPoints(points) {
            return mapCoordinateValidationService.normalizeTrackPoints(points);
        }

        function isMapViewportReady() {
            return mapViewportSafetyService.isMapViewportReady();
        }

        function isMapViewActive() {
            return mapViewportSafetyService.isMapViewActive();
        }

        function canRenderMapOverlays() {
            return mapViewportSafetyService.canRenderMapOverlays();
        }

        async function ensureMapViewportReady({ timeoutMs = 1200, intervalMs = 50 } = {}) {
            return mapViewportSafetyService.ensureMapViewportReady({ timeoutMs, intervalMs });
        }

        function isLeafletBoundsFinite(bounds) {
            return mapViewportSafetyService.isLeafletBoundsFinite(bounds);
        }

        function safeSetView(lat, lng, zoom, options) {
            return mapViewportSafetyService.safeSetView(lat, lng, zoom, options);
        }

        function safeFocusBounds(bounds, options) {
            return mapViewportSafetyService.safeFocusBounds(bounds, options);
        }

        function safeFitBounds(bounds, options) {
            return mapViewportSafetyService.safeFitBounds(bounds, options);
        }

        return {
            isFiniteTrackPoint,
            isValidLatitude,
            isValidLongitude,
            isValidMapCoordinatePair,
            normalizeTrackPoints,
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

    global.createMapSafetyBridgeService = createMapSafetyBridgeService;
})(window);
