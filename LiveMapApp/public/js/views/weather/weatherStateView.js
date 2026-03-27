(function attachWeatherStateViewFactory(globalScope) {
    function createWeatherStateView({ getCachedTrack, toFiniteNumber }) {
        function createDefaultWeatherState() {
            return {
                status: 'idle',
                data: null,
                message: '',
                requestId: 0
            };
        }

        function findTrackStartAndEndTimeMs(points) {
            if (!Array.isArray(points) || !points.length) {
                return { startTimeMs: null, endTimeMs: null };
            }

            let startTimeMs = null;
            let endTimeMs = null;

            points.forEach(point => {
                const timeMs = toFiniteNumber(point?.meta?.timeMs);
                if (timeMs === null) {
                    return;
                }

                if (startTimeMs === null) {
                    startTimeMs = timeMs;
                }
                endTimeMs = timeMs;
            });

            return { startTimeMs, endTimeMs };
        }

        function getTrackWeatherState(profile, filename) {
            const entry = getCachedTrack(profile, filename);
            if (!entry) {
                return createDefaultWeatherState();
            }

            if (!entry.weatherState || typeof entry.weatherState !== 'object') {
                entry.weatherState = createDefaultWeatherState();
            }

            return entry.weatherState;
        }

        function setTrackWeatherState(profile, filename, nextState = {}) {
            const entry = getCachedTrack(profile, filename);
            if (!entry) {
                return;
            }

            const previousState = getTrackWeatherState(profile, filename);
            entry.weatherState = {
                ...previousState,
                ...nextState
            };
        }

        return {
            findTrackStartAndEndTimeMs,
            getTrackWeatherState,
            setTrackWeatherState
        };
    }

    globalScope.createWeatherStateView = createWeatherStateView;
})(window);
