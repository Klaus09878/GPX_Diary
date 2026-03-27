(function attachTrimBeginViewFactory(globalScope) {
    function createTrimBeginView({
        getActiveTrackName,
        getCurrentProfile,
        getPlaybackPoints,
        isTrimModeFor,
        focusTrimSelection,
        endOutlierMode,
        endTrimMode,
        getCachedTrack,
        showToast,
        setTrimSelection,
        getTrimSelection,
        getMap,
        leaflet,
        createTrimHandleIcon,
        findNearestPlaybackPointIndex,
        setTrimBoundary,
        applyTrimPreviewVisualState,
        updateTrimPreview,
        refreshDetailsPanelIfPossible
    }) {
        function beginTrimMode(filename) {
            const activeTrackName = getActiveTrackName();
            if (!activeTrackName || activeTrackName !== filename) {
                showToast('Bitte zuerst das gewünschte Training auswählen.', 'warning');
                return;
            }

            const playbackPoints = getPlaybackPoints();
            if (!Array.isArray(playbackPoints) || playbackPoints.length < 2) {
                showToast('Zu wenig Trackpunkte zum Zuschneiden.', 'warning');
                return;
            }

            const currentProfile = getCurrentProfile();
            if (isTrimModeFor(currentProfile, filename)) {
                focusTrimSelection();
                return;
            }

            endOutlierMode({ refreshPanel: false });
            endTrimMode({ refreshPanel: false });

            const entry = getCachedTrack(currentProfile, filename);
            if (!entry?.layer) {
                showToast('Track konnte nicht für den Zuschnitt vorbereitet werden.', 'error');
                return;
            }

            setTrimSelection({
                profile: currentProfile,
                filename,
                startIndex: 0,
                endIndex: playbackPoints.length - 1,
                startMarker: null,
                endMarker: null,
                previewLayer: null
            });

            const map = getMap();
            const trimSelection = getTrimSelection();
            trimSelection.startMarker = leaflet.marker([playbackPoints[0].lat, playbackPoints[0].lng], {
                draggable: true,
                icon: createTrimHandleIcon('start'),
                zIndexOffset: 1100
            }).addTo(map);

            trimSelection.endMarker = leaflet.marker([playbackPoints[playbackPoints.length - 1].lat, playbackPoints[playbackPoints.length - 1].lng], {
                draggable: true,
                icon: createTrimHandleIcon('end'),
                zIndexOffset: 1100
            }).addTo(map);

            trimSelection.startMarker.on('dragend', () => {
                const snappedIndex = findNearestPlaybackPointIndex(trimSelection.startMarker.getLatLng());
                setTrimBoundary('start', snappedIndex);
            });

            trimSelection.endMarker.on('dragend', () => {
                const snappedIndex = findNearestPlaybackPointIndex(trimSelection.endMarker.getLatLng());
                setTrimBoundary('end', snappedIndex);
            });

            applyTrimPreviewVisualState(entry.layer);
            updateTrimPreview();
            refreshDetailsPanelIfPossible();
            showToast('Trim-Modus aktiv. Ziehe Start und Ende direkt auf der Karte.', 'info');
        }

        return {
            beginTrimMode
        };
    }

    globalScope.createTrimBeginView = createTrimBeginView;
})(window);
