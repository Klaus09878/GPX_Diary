(function attachTrackPointLoadViewFactory(globalScope) {
    function createTrackPointLoadView({ getCachedTrack, fetchTrackPoints, extractPointsSafely }) {
        async function ensureTrackPoints(profile, filename, gpxLayer) {
            const entry = getCachedTrack(profile, filename);

            if (!entry) {
                return extractPointsSafely(gpxLayer);
            }

            if (Array.isArray(entry.points) && entry.points.length > 0) {
                return entry.points;
            }

            if (!entry.pointsPromise) {
                entry.pointsPromise = fetchTrackPoints(profile, filename)
                    .then(points => {
                        entry.points = points;
                        entry.pointsPromise = null;
                        return points;
                    })
                    .catch(err => {
                        console.warn(err);
                        entry.pointsPromise = null;
                        return [];
                    });
            }

            const points = await entry.pointsPromise;
            if (Array.isArray(points) && points.length > 0) {
                return points;
            }

            return extractPointsSafely(gpxLayer);
        }

        return {
            ensureTrackPoints
        };
    }

    globalScope.createTrackPointLoadView = createTrackPointLoadView;
})(window);
