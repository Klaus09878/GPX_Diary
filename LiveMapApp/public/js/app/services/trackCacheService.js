(function attachTrackCacheServiceFactory(globalScope) {
    function createTrackCacheService({ getCachedTracks }) {
        function getTrackCacheKey(profile, filename) {
            return `${profile}::${filename}`;
        }

        function getCachedTrack(profile, filename) {
            return getCachedTracks()[getTrackCacheKey(profile, filename)] || null;
        }

        function setCachedTrack(profile, filename, value) {
            getCachedTracks()[getTrackCacheKey(profile, filename)] = value;
        }

        function removeCachedTrack(profile, filename) {
            delete getCachedTracks()[getTrackCacheKey(profile, filename)];
        }

        return {
            getTrackCacheKey,
            getCachedTrack,
            setCachedTrack,
            removeCachedTrack
        };
    }

    globalScope.createTrackCacheService = createTrackCacheService;
})(window);
