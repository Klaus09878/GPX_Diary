(function attachOutlierSegmentsViewFactory(globalScope) {
    function createOutlierSegmentsView({
        calculateSegmentDistanceMeters,
        toFiniteNumber,
        resolvePointSpeedKmh
    }) {
        function buildTrackSegments(points) {
            const segments = [];

            for (let index = 1; index < points.length; index += 1) {
                const previousPoint = points[index - 1];
                const point = points[index];
                const distanceMeters = calculateSegmentDistanceMeters(previousPoint, point);

                let deltaSeconds = null;
                const currentTimeMs = toFiniteNumber(point?.meta?.timeMs);
                const previousTimeMs = toFiniteNumber(previousPoint?.meta?.timeMs);
                if (currentTimeMs !== null && previousTimeMs !== null) {
                    const rawDelta = (currentTimeMs - previousTimeMs) / 1000;
                    if (rawDelta > 0 && rawDelta < 600) {
                        deltaSeconds = rawDelta;
                    }
                }

                segments.push({
                    startIndex: index - 1,
                    endIndex: index,
                    distanceMeters,
                    deltaSeconds,
                    speedKmh: resolvePointSpeedKmh(point, previousPoint)
                });
            }

            return segments;
        }

        return {
            buildTrackSegments
        };
    }

    globalScope.createOutlierSegmentsView = createOutlierSegmentsView;
})(window);
