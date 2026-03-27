(function attachWeatherRequestPayloadViewFactory(globalScope) {
    function createWeatherRequestPayloadView({
        getCurrentProfile,
        getActiveTrackName,
        getPlaybackPoints,
        getCachedTrack,
        toFiniteNumber
    }) {
        function getWeatherRequestPayloadForTrack(filename, gpxLayer) {
            const currentProfile = getCurrentProfile();
            const entry = getCachedTrack(currentProfile, filename);
            const playbackPoints = getPlaybackPoints();
            const candidatePoints = (getActiveTrackName() === filename && Array.isArray(playbackPoints) && playbackPoints.length)
                ? playbackPoints
                : (Array.isArray(entry?.points) ? entry.points : []);

            let anchorPoint = null;

            if (candidatePoints.length) {
                anchorPoint = candidatePoints.find(point =>
                    Number.isFinite(point?.lat) &&
                    Number.isFinite(point?.lng) &&
                    toFiniteNumber(point?.meta?.timeMs) !== null
                ) || candidatePoints.find(point =>
                    Number.isFinite(point?.lat) && Number.isFinite(point?.lng)
                );
            }

            const boundsCenter = gpxLayer?.getBounds?.()?.getCenter?.();

            const lat = Number.isFinite(anchorPoint?.lat) ? Number(anchorPoint.lat) : Number(boundsCenter?.lat);
            const lon = Number.isFinite(anchorPoint?.lng) ? Number(anchorPoint.lng) : Number(boundsCenter?.lng);

            let timeMs = toFiniteNumber(anchorPoint?.meta?.timeMs);
            if (timeMs === null) {
                const startTime = gpxLayer?.get_start_time?.();
                if (startTime instanceof Date && Number.isFinite(startTime.getTime())) {
                    timeMs = startTime.getTime();
                }
            }

            if (!Number.isFinite(lat) || !Number.isFinite(lon) || !Number.isFinite(timeMs)) {
                return null;
            }

            return {
                lat,
                lon,
                timeMs
            };
        }

        return {
            getWeatherRequestPayloadForTrack
        };
    }

    globalScope.createWeatherRequestPayloadView = createWeatherRequestPayloadView;
})(window);
