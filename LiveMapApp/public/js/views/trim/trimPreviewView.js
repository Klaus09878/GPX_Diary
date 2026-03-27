(function attachTrimPreviewViewFactory(globalScope) {
    function createTrimPreviewView({
        getTrimSelection,
        getPlaybackPoints,
        getMap,
        removeMapLayer,
        leaflet
    }) {
        function clearTrimSelectionLayers() {
            const trimSelection = getTrimSelection();
            removeMapLayer(trimSelection?.previewLayer);
            removeMapLayer(trimSelection?.startMarker);
            removeMapLayer(trimSelection?.endMarker);
        }

        function syncTrimMarkers() {
            const trimSelection = getTrimSelection();
            if (!trimSelection) {
                return;
            }

            const playbackPoints = getPlaybackPoints();
            const startPoint = playbackPoints[trimSelection.startIndex];
            const endPoint = playbackPoints[trimSelection.endIndex];
            if (trimSelection.startMarker && startPoint) {
                trimSelection.startMarker.setLatLng([startPoint.lat, startPoint.lng]);
            }
            if (trimSelection.endMarker && endPoint) {
                trimSelection.endMarker.setLatLng([endPoint.lat, endPoint.lng]);
            }
        }

        function updateTrimPreview({ fitBounds = false } = {}) {
            const trimSelection = getTrimSelection();
            if (!trimSelection) {
                return;
            }

            const map = getMap();
            if (!map) {
                return;
            }

            removeMapLayer(trimSelection.previewLayer);

            const playbackPoints = getPlaybackPoints();
            const slice = playbackPoints.slice(trimSelection.startIndex, trimSelection.endIndex + 1);
            if (slice.length < 2) {
                return;
            }

            trimSelection.previewLayer = leaflet.polyline(slice.map(point => [point.lat, point.lng]), {
                color: '#22d3ee',
                weight: 6,
                opacity: 0.96,
                lineCap: 'round'
            }).addTo(map);

            trimSelection.previewLayer.bringToFront();
            syncTrimMarkers();

            if (trimSelection.startMarker) {
                trimSelection.startMarker.addTo(map);
            }
            if (trimSelection.endMarker) {
                trimSelection.endMarker.addTo(map);
            }

            if (fitBounds) {
                map.fitBounds(trimSelection.previewLayer.getBounds(), { padding: [50, 50] });
            }
        }

        return {
            clearTrimSelectionLayers,
            syncTrimMarkers,
            updateTrimPreview
        };
    }

    globalScope.createTrimPreviewView = createTrimPreviewView;
})(window);
