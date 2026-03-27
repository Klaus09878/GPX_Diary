(function attachComparisonSummaryViewFactory(globalScope) {
    function createComparisonSummaryView({
        getCachedTrack,
        ensureTrackPoints,
        extractPointsSafely,
        findTrackStartAndEndTimeMs,
        resolvePointSpeedKmh,
        calculateMax,
        calculateAverage,
        collectNumericValues,
        getHeartRateValue,
        getPowerValue,
        getTrackDisplayName
    }) {
        async function collectComparisonSummary(profile, filename) {
            const entry = getCachedTrack(profile, filename);
            if (!entry?.layer) {
                return null;
            }

            let points = [];
            try {
                points = await ensureTrackPoints(profile, filename, entry.layer);
            } catch (_) {
                points = [];
            }

            if (!Array.isArray(points) || !points.length) {
                points = extractPointsSafely(entry.layer);
            }

            const { startTimeMs, endTimeMs } = findTrackStartAndEndTimeMs(points);
            const durationMinutes = Number.isFinite(startTimeMs) && Number.isFinite(endTimeMs) && endTimeMs > startTimeMs
                ? (endTimeMs - startTimeMs) / 60000
                : null;

            const distanceKmFromStats = (Number(entry?.stats?.distance) || 0) / 1000;
            const distanceKmFromPoints = points.length > 1
                ? ((points[points.length - 1]?.dist || 0) - (points[0]?.dist || 0)) / 1000
                : 0;
            const distanceKm = distanceKmFromStats > 0 ? distanceKmFromStats : Math.max(0, distanceKmFromPoints);

            const elevationMStats = Number(entry?.stats?.elevation) || 0;
            const elevationM = elevationMStats;

            const pointSpeeds = points.map((point, index) => resolvePointSpeedKmh(point, index > 0 ? points[index - 1] : null));
            const positiveSpeeds = pointSpeeds.filter(speed => Number.isFinite(speed) && speed > 0.1);
            const maxSpeedKmh = calculateMax(positiveSpeeds);

            let avgSpeedKmh = null;
            if (Number.isFinite(durationMinutes) && durationMinutes > 0 && distanceKm > 0) {
                avgSpeedKmh = distanceKm / (durationMinutes / 60);
            } else {
                const speedFromStats = Number(entry?.stats?.speed);
                if (Number.isFinite(speedFromStats) && speedFromStats > 0) {
                    avgSpeedKmh = speedFromStats;
                } else {
                    avgSpeedKmh = calculateAverage(positiveSpeeds);
                }
            }

            const paceMinPerKm = Number.isFinite(avgSpeedKmh) && avgSpeedKmh > 0 ? 60 / avgSpeedKmh : null;

            const heartRateValues = collectNumericValues(points, point => getHeartRateValue(point));
            const powerValues = collectNumericValues(points, point => getPowerValue(point));

            return {
                filename,
                profile,
                displayName: getTrackDisplayName(filename),
                dateMs: Number(entry?.stats?.date) || 0,
                points,
                distanceKm,
                elevationM,
                durationMinutes,
                avgSpeedKmh,
                paceMinPerKm,
                maxSpeedKmh,
                avgHeartRate: calculateAverage(heartRateValues),
                maxHeartRate: calculateMax(heartRateValues),
                avgPower: calculateAverage(powerValues),
                maxPower: calculateMax(powerValues),
                pointCount: points.length
            };
        }

        return {
            collectComparisonSummary
        };
    }

    globalScope.createComparisonSummaryView = createComparisonSummaryView;
})(window);
