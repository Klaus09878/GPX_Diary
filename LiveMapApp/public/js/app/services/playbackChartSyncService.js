(function attachPlaybackChartSyncServiceFactory(globalScope) {
    function createPlaybackChartSyncService({
        buildPlaybackTimeline,
        getPlaybackPoints,
        getPlaybackIndex,
        setPlaybackIndex,
        getPlaybackTimelineSeconds,
        setPlaybackTimelineSeconds,
        setPlaybackVirtualSeconds,
        getCharts,
        getPlaybackMarker,
        setPlaybackMarker,
        getLeaflet,
        getMap,
        updatePlaybackControlState
    }) {
        function rebuildPlaybackTimeline() {
            const playbackPoints = getPlaybackPoints();
            const playbackIndex = getPlaybackIndex();
            const playbackTimelineSeconds = buildPlaybackTimeline(playbackPoints);
            setPlaybackTimelineSeconds(playbackTimelineSeconds);
            setPlaybackVirtualSeconds(playbackTimelineSeconds[playbackIndex] || 0);
        }

        function getPlaybackIndexForVirtualTime(virtualSeconds) {
            const playbackTimelineSeconds = getPlaybackTimelineSeconds();
            if (!playbackTimelineSeconds.length) {
                return 0;
            }

            if (virtualSeconds <= 0) {
                return 0;
            }

            const lastIndex = playbackTimelineSeconds.length - 1;
            const endSeconds = playbackTimelineSeconds[lastIndex] || 0;
            if (virtualSeconds >= endSeconds) {
                return lastIndex;
            }

            let low = 0;
            let high = lastIndex;

            while (low <= high) {
                const mid = Math.floor((low + high) / 2);
                const value = playbackTimelineSeconds[mid] || 0;

                if (value <= virtualSeconds) {
                    low = mid + 1;
                } else {
                    high = mid - 1;
                }
            }

            return Math.max(0, low - 1);
        }

        function syncAllCharts(idx) {
            getCharts().forEach(chart => {
                if (chart) {
                    chart.options.plugins.syncLine.index = idx;
                    chart.update('none');
                }
            });

            const playbackPoints = getPlaybackPoints();
            const map = getMap();
            const L = getLeaflet();

            if (playbackPoints[idx]) {
                const point = playbackPoints[idx];
                let playbackMarker = getPlaybackMarker();
                if (!playbackMarker) {
                    playbackMarker = L.circleMarker([point.lat, point.lng], {
                        radius: 7,
                        color: '#ffffff',
                        fillColor: '#38bdf8',
                        fillOpacity: 1,
                        weight: 3
                    }).addTo(map);
                    setPlaybackMarker(playbackMarker);
                } else {
                    playbackMarker.setLatLng([point.lat, point.lng]);
                    if (!map.hasLayer(playbackMarker)) {
                        playbackMarker.addTo(map);
                    }
                }

                const markerLatLng = L.latLng(point.lat, point.lng);
                if (!map.getBounds().pad(-0.18).contains(markerLatLng)) {
                    map.panTo(markerLatLng, { animate: true, duration: 0.35 });
                }
            }

            setPlaybackIndex(idx);
            updatePlaybackControlState();
        }

        function clearChartSync() {
            const map = getMap();
            getCharts().forEach(chart => {
                if (chart?.options?.plugins?.syncLine) {
                    chart.options.plugins.syncLine.index = undefined;
                    chart.update('none');
                }
            });

            const playbackMarker = getPlaybackMarker();
            if (playbackMarker && map && map.hasLayer(playbackMarker)) {
                map.removeLayer(playbackMarker);
            }

            setPlaybackMarker(null);
        }

        return {
            rebuildPlaybackTimeline,
            getPlaybackIndexForVirtualTime,
            syncAllCharts,
            clearChartSync
        };
    }

    globalScope.createPlaybackChartSyncService = createPlaybackChartSyncService;
})(window);
