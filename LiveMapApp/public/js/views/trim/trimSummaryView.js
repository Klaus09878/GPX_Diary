(function attachTrimSummaryViewFactory(globalScope) {
    function createTrimSummaryView({
        getPlaybackPoints,
        getMap
    }) {
        function findNearestPlaybackPointIndex(latLng, points = getPlaybackPoints()) {
            if (!latLng || !Array.isArray(points) || !points.length) {
                return 0;
            }

            const map = getMap();
            if (!map) {
                return 0;
            }

            let nearestIndex = 0;
            let nearestDistance = Infinity;

            points.forEach((point, index) => {
                const delta = map.distance([latLng.lat, latLng.lng], [point.lat, point.lng]);
                if (delta < nearestDistance) {
                    nearestDistance = delta;
                    nearestIndex = index;
                }
            });

            return nearestIndex;
        }

        function calculateTrimSummary(startIndex, endIndex) {
            const playbackPoints = getPlaybackPoints();
            if (!Array.isArray(playbackPoints) || playbackPoints.length < 2) {
                return null;
            }

            const startPoint = playbackPoints[startIndex];
            const endPoint = playbackPoints[endIndex];
            if (!startPoint || !endPoint) {
                return null;
            }

            const slice = playbackPoints.slice(startIndex, endIndex + 1);
            const distanceKm = Math.max(0, ((endPoint.dist || 0) - (startPoint.dist || 0)) / 1000);
            let elevationGainM = 0;
            for (let index = 1; index < slice.length; index += 1) {
                const deltaAlt = Number(slice[index]?.alt || 0) - Number(slice[index - 1]?.alt || 0);
                if (deltaAlt > 0) {
                    elevationGainM += deltaAlt;
                }
            }

            const startTimeMs = Number(startPoint?.meta?.timeMs);
            const endTimeMs = Number(endPoint?.meta?.timeMs);
            const durationMinutes = Number.isFinite(startTimeMs) && Number.isFinite(endTimeMs) && endTimeMs > startTimeMs
                ? (endTimeMs - startTimeMs) / 60000
                : null;

            return {
                startIndex,
                endIndex,
                pointCount: slice.length,
                distanceKm,
                elevationGainM,
                durationMinutes,
                startLabel: Number.isFinite(startTimeMs)
                    ? new Date(startTimeMs).toLocaleString('de-DE', { dateStyle: 'short', timeStyle: 'short' })
                    : `Punkt ${startIndex + 1}`,
                endLabel: Number.isFinite(endTimeMs)
                    ? new Date(endTimeMs).toLocaleString('de-DE', { dateStyle: 'short', timeStyle: 'short' })
                    : `Punkt ${endIndex + 1}`
            };
        }

        return {
            findNearestPlaybackPointIndex,
            calculateTrimSummary
        };
    }

    globalScope.createTrimSummaryView = createTrimSummaryView;
})(window);
