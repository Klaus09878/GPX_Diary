(function attachAnalysisNormalizationServiceFactory(globalScope) {
    function createAnalysisNormalizationService({
        analysisSteepThresholdMin,
        analysisSteepThresholdMax,
        analysisSteepThresholdDefault,
        analysisSpeedThresholdMin,
        analysisSpeedThresholdMax,
        getSpeedThresholdsForProfile
    }) {
        function clampNumber(value, min, max, fallback) {
            const numericValue = Number(value);
            if (!Number.isFinite(numericValue)) {
                return fallback;
            }
            return Math.min(max, Math.max(min, numericValue));
        }

        function normalizeAnalysisThresholdEntry(profile, rawEntry) {
            const source = rawEntry && typeof rawEntry === 'object' ? rawEntry : {};
            const speedThresholds = typeof getSpeedThresholdsForProfile === 'function'
                ? getSpeedThresholdsForProfile(profile)
                : {};
            const defaultSpeedThreshold = Number(speedThresholds.normalMax) || 20;

            const steepGradePercent = clampNumber(
                source.steepGradePercent,
                analysisSteepThresholdMin,
                analysisSteepThresholdMax,
                analysisSteepThresholdDefault
            );

            const fastSpeedKmh = clampNumber(
                source.fastSpeedKmh,
                analysisSpeedThresholdMin,
                analysisSpeedThresholdMax,
                defaultSpeedThreshold
            );

            return {
                steepGradePercent: Number(steepGradePercent.toFixed(1)),
                fastSpeedKmh: Number(fastSpeedKmh.toFixed(1))
            };
        }

        function normalizeAnalysisThresholdsByProfile(rawByProfile) {
            const source = rawByProfile && typeof rawByProfile === 'object' ? rawByProfile : {};
            const normalized = {};
            Object.keys(source).forEach(profile => {
                normalized[profile] = normalizeAnalysisThresholdEntry(profile, source[profile]);
            });
            return normalized;
        }

        function normalizeHeatmapTimeFilters(rawFilters) {
            const raw = rawFilters && typeof rawFilters === 'object' ? rawFilters : {};
            const allowedDaytime = new Set(['all', 'day', 'night']);
            const allowedWeekday = new Set(['all', 'weekday', 'weekend', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']);
            const allowedSeason = new Set(['all', 'spring', 'summer', 'autumn', 'winter']);

            return {
                daytime: allowedDaytime.has(raw.daytime) ? raw.daytime : 'all',
                weekday: allowedWeekday.has(raw.weekday) ? raw.weekday : 'all',
                season: allowedSeason.has(raw.season) ? raw.season : 'all'
            };
        }

        return {
            clampNumber,
            normalizeAnalysisThresholdEntry,
            normalizeAnalysisThresholdsByProfile,
            normalizeHeatmapTimeFilters
        };
    }

    globalScope.createAnalysisNormalizationService = createAnalysisNormalizationService;
})(window);
