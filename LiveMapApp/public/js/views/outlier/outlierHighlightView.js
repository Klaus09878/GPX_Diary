(function attachOutlierHighlightViewFactory(globalScope) {
    function createOutlierHighlightView({
        getOutlierSelection,
        getPlaybackPoints,
        getMap,
        removeMapLayer,
        refreshDetailsPanelIfPossible,
        leaflet
    }) {
        function clearOutlierSelectionLayers() {
            const outlierSelection = getOutlierSelection();
            if (!outlierSelection?.candidates?.length) {
                return;
            }

            outlierSelection.candidates.forEach(candidate => {
                if (candidate.layer) {
                    removeMapLayer(candidate.layer);
                    candidate.layer = null;
                }
            });
        }

        function getOutlierCandidateColor(candidate) {
            if (candidate.decision === 'remove') {
                return '#ef4444';
            }
            if (candidate.decision === 'keep') {
                return '#64748b';
            }
            return '#f59e0b';
        }

        function refreshOutlierHighlights() {
            const outlierSelection = getOutlierSelection();
            if (!outlierSelection) {
                return;
            }

            clearOutlierSelectionLayers();

            const playbackPoints = getPlaybackPoints();
            const map = getMap();
            outlierSelection.candidates.forEach(candidate => {
                const slice = playbackPoints.slice(candidate.startIndex, candidate.endIndex + 1);
                if (slice.length < 2) {
                    return;
                }

                candidate.layer = leaflet.polyline(slice.map(point => [point.lat, point.lng]), {
                    color: getOutlierCandidateColor(candidate),
                    weight: candidate.decision === 'remove' ? 8 : 7,
                    opacity: candidate.decision === 'keep' ? 0.55 : 0.95,
                    lineCap: 'round'
                }).addTo(map);

                candidate.layer.bindTooltip(candidate.title, { sticky: true, className: 'gradient-tooltip' });
                candidate.layer.bringToFront();
            });
        }

        function focusOutlierCandidate(candidateId) {
            const outlierSelection = getOutlierSelection();
            if (!outlierSelection) {
                return;
            }

            const candidate = outlierSelection.candidates.find(entry => entry.id === candidateId);
            const map = getMap();
            if (map && candidate?.layer) {
                map.fitBounds(candidate.layer.getBounds(), { padding: [50, 50] });
            }
        }

        function setOutlierDecision(candidateId, decision) {
            const outlierSelection = getOutlierSelection();
            if (!outlierSelection) {
                return;
            }

            const candidate = outlierSelection.candidates.find(entry => entry.id === candidateId);
            if (!candidate) {
                return;
            }

            candidate.decision = decision;
            refreshOutlierHighlights();
            refreshDetailsPanelIfPossible();
        }

        return {
            clearOutlierSelectionLayers,
            getOutlierCandidateColor,
            refreshOutlierHighlights,
            focusOutlierCandidate,
            setOutlierDecision
        };
    }

    globalScope.createOutlierHighlightView = createOutlierHighlightView;
})(window);
