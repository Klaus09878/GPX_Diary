(function attachWeatherBridgeServiceFactory(globalScope) {
    function createWeatherBridgeService({
        getWeatherStateViewApi,
        getWeatherRequestPayloadViewApi,
        getWeatherLoadViewApi,
        getWeatherCardViewApi
    }) {
        function getTrackWeatherState(profile, filename) {
            return getWeatherStateViewApi()?.getTrackWeatherState(profile, filename) || {
                status: 'idle',
                data: null,
                message: '',
                requestId: 0
            };
        }

        function setTrackWeatherState(profile, filename, nextState = {}) {
            return getWeatherStateViewApi()?.setTrackWeatherState(profile, filename, nextState);
        }

        function getWeatherRequestPayloadForTrack(filename, gpxLayer) {
            return getWeatherRequestPayloadViewApi()?.getWeatherRequestPayloadForTrack(filename, gpxLayer) || null;
        }

        async function loadWeatherForTrack(filename, gpxLayer, { force = false } = {}) {
            return getWeatherLoadViewApi()?.loadWeatherForTrack(filename, gpxLayer, { force });
        }

        function buildWeatherCard(filename, gpxLayer) {
            return getWeatherCardViewApi()?.buildWeatherCard(filename, gpxLayer);
        }

        function findTrackStartAndEndTimeMs(points) {
            return getWeatherStateViewApi()?.findTrackStartAndEndTimeMs(points) || { startTimeMs: null, endTimeMs: null };
        }

        return {
            getTrackWeatherState,
            setTrackWeatherState,
            getWeatherRequestPayloadForTrack,
            loadWeatherForTrack,
            buildWeatherCard,
            findTrackStartAndEndTimeMs
        };
    }

    globalScope.createWeatherBridgeService = createWeatherBridgeService;
})(window);
