(function attachGpxParserBridgeServiceFactory(globalScope) {
    function createGpxParserBridgeService({ getGpxParserViewApi, getTrackPointLoadViewApi, getTrackPointFallbackViewApi, trackCacheService }) {
        function getTrackCacheKey(profile, filename) {
            return trackCacheService.getTrackCacheKey(profile, filename);
        }

        function getCachedTrack(profile, filename) {
            return trackCacheService.getCachedTrack(profile, filename);
        }

        function setCachedTrack(profile, filename, value) {
            return trackCacheService.setCachedTrack(profile, filename, value);
        }

        function removeCachedTrack(profile, filename) {
            return trackCacheService.removeCachedTrack(profile, filename);
        }

        function parseNumericOrNull(value) {
            return getGpxParserViewApi()?.parseNumericOrNull(value);
        }

        function findFirstDescendantText(node, localNames) {
            return getGpxParserViewApi()?.findFirstDescendantText(node, localNames) || null;
        }

        function parseSpeedToKmh(rawSpeed) {
            return getGpxParserViewApi()?.parseSpeedToKmh(rawSpeed);
        }

        function toFiniteNumber(value) {
            return getGpxParserViewApi()?.toFiniteNumber(value);
        }

        function getHeartRateValue(point) {
            return getGpxParserViewApi()?.getHeartRateValue(point);
        }

        function getPowerValue(point) {
            return getGpxParserViewApi()?.getPowerValue(point);
        }

        function countValidPowerSamples(points) {
            return getGpxParserViewApi()?.countValidPowerSamples(points) || 0;
        }

        function parseTrackPointsFromGpxText(xmlText) {
            return getGpxParserViewApi()?.parseTrackPointsFromGpxText(xmlText) || [];
        }

        async function fetchTrackPoints(profile, filename) {
            return getGpxParserViewApi()?.fetchTrackPoints(profile, filename);
        }

        async function ensureTrackPoints(profile, filename, gpxLayer) {
            return getTrackPointLoadViewApi()?.ensureTrackPoints(profile, filename, gpxLayer);
        }

        function extractPointsSafely(gpxLayer) {
            return getTrackPointFallbackViewApi()?.extractPointsSafely(gpxLayer) || [];
        }

        return {
            getTrackCacheKey,
            getCachedTrack,
            setCachedTrack,
            removeCachedTrack,
            parseNumericOrNull,
            findFirstDescendantText,
            parseSpeedToKmh,
            toFiniteNumber,
            getHeartRateValue,
            getPowerValue,
            countValidPowerSamples,
            parseTrackPointsFromGpxText,
            fetchTrackPoints,
            ensureTrackPoints,
            extractPointsSafely
        };
    }

    globalScope.createGpxParserBridgeService = createGpxParserBridgeService;
})(window);
