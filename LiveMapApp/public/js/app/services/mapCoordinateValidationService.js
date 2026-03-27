(function attachMapCoordinateValidationServiceFactory(globalScope) {
    function createMapCoordinateValidationService() {
        function isValidLatitude(value) {
            const numericValue = Number(value);
            return Number.isFinite(numericValue) && numericValue >= -90 && numericValue <= 90;
        }

        function isValidLongitude(value) {
            const numericValue = Number(value);
            return Number.isFinite(numericValue) && numericValue >= -180 && numericValue <= 180;
        }

        function isValidMapCoordinatePair(lat, lng) {
            return isValidLatitude(lat) && isValidLongitude(lng);
        }

        function isFiniteTrackPoint(point) {
            return isValidMapCoordinatePair(point?.lat, point?.lng);
        }

        function normalizeTrackPoints(points) {
            if (!Array.isArray(points)) {
                return [];
            }

            return points.filter(isFiniteTrackPoint);
        }

        return {
            isValidLatitude,
            isValidLongitude,
            isValidMapCoordinatePair,
            isFiniteTrackPoint,
            normalizeTrackPoints
        };
    }

    globalScope.createMapCoordinateValidationService = createMapCoordinateValidationService;
})(window);
