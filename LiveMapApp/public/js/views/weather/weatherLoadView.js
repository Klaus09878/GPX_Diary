(function attachWeatherLoadViewFactory(globalScope) {
    function createWeatherLoadView({
        apiBase,
        getCurrentProfile,
        getCachedTrack,
        getTrackWeatherState,
        setTrackWeatherState,
        getWeatherRequestPayloadForTrack,
        getActiveTrackName,
        refreshDetailsPanelIfPossible,
        showToast
    }) {
        async function loadWeatherForTrack(filename, gpxLayer, { force = false } = {}) {
            const profile = getCurrentProfile();
            const entry = getCachedTrack(profile, filename);
            if (!entry) {
                return;
            }

            const currentWeatherState = getTrackWeatherState(profile, filename);
            if (currentWeatherState.status === 'loading') {
                return;
            }

            if (currentWeatherState.status === 'ready' && !force) {
                return;
            }

            const requestPayload = getWeatherRequestPayloadForTrack(filename, gpxLayer);
            if (!requestPayload) {
                setTrackWeatherState(profile, filename, {
                    status: 'unavailable',
                    message: 'Keine Positions- oder Zeitdaten für den Wetterabruf vorhanden.',
                    data: null
                });
                if (getActiveTrackName() === filename) {
                    refreshDetailsPanelIfPossible();
                }
                return;
            }

            const requestId = (currentWeatherState.requestId || 0) + 1;

            setTrackWeatherState(profile, filename, {
                status: 'loading',
                message: '',
                data: null,
                requestId
            });

            if (getActiveTrackName() === filename) {
                refreshDetailsPanelIfPossible();
            }

            try {
                const params = new URLSearchParams({
                    lat: requestPayload.lat.toFixed(6),
                    lon: requestPayload.lon.toFixed(6),
                    timeMs: String(Math.round(requestPayload.timeMs))
                });

                const response = await fetch(`${apiBase}/weather/history?${params.toString()}`);
                const data = await response.json().catch(() => ({}));

                const latestEntry = getCachedTrack(profile, filename);
                if (!latestEntry?.weatherState || latestEntry.weatherState.requestId !== requestId) {
                    return;
                }

                if (!response.ok) {
                    throw new Error(data.error || 'Wetterdaten konnten nicht geladen werden.');
                }

                if (data?.available) {
                    setTrackWeatherState(profile, filename, {
                        status: 'ready',
                        data,
                        message: ''
                    });
                } else {
                    setTrackWeatherState(profile, filename, {
                        status: 'unavailable',
                        data: data || null,
                        message: data.reason || 'Für diesen Zeitpunkt sind keine Wetterdaten verfügbar.'
                    });
                }
            } catch (err) {
                console.error(err);
                setTrackWeatherState(profile, filename, {
                    status: 'error',
                    message: err?.message || 'Wetterdaten konnten nicht geladen werden.'
                });
                showToast('Wetterdaten konnten nicht geladen werden.', 'warning');
            } finally {
                if (getActiveTrackName() === filename) {
                    refreshDetailsPanelIfPossible();
                }
            }
        }

        return {
            loadWeatherForTrack
        };
    }

    globalScope.createWeatherLoadView = createWeatherLoadView;
})(window);
