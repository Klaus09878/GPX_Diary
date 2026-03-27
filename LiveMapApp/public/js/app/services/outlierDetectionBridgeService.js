(function attachOutlierDetectionBridgeServiceFactory(globalScope) {
    function createOutlierDetectionBridgeService({
        getOutlierRulesViewApi,
        getOutlierLabelViewApi,
        getOutlierSegmentsViewApi,
        getOutlierCandidateAssemblyViewApi,
        getOutlierDetectionViewApi,
        getOutlierHighlightViewApi,
        getOutlierModeViewApi,
        getOutlierCleanupViewApi
    }) {
        function getOutlierDetectionRules(profile) {
            return getOutlierRulesViewApi()?.getOutlierDetectionRules(profile) || null;
        }

        function formatOutlierPointLabel(point, fallbackIndex) {
            return getOutlierLabelViewApi()?.formatOutlierPointLabel(point, fallbackIndex) || `Punkt ${fallbackIndex + 1}`;
        }

        function buildTrackSegments(points) {
            return getOutlierSegmentsViewApi()?.buildTrackSegments(points) || [];
        }

        function mergeOutlierBases(bases) {
            return getOutlierCandidateAssemblyViewApi()?.mergeOutlierBases(bases) || [];
        }

        function finalizeOutlierCandidates(candidateBases, points) {
            return getOutlierCandidateAssemblyViewApi()?.finalizeOutlierCandidates(candidateBases, points) || [];
        }

        function detectOutlierCandidates(points, profile) {
            return getOutlierDetectionViewApi()?.detectOutlierCandidates(points, profile) || [];
        }

        function clearOutlierSelectionLayers() {
            return getOutlierHighlightViewApi()?.clearOutlierSelectionLayers();
        }

        function getOutlierCandidateColor(candidate) {
            return getOutlierHighlightViewApi()?.getOutlierCandidateColor(candidate) || '#f59e0b';
        }

        function refreshOutlierHighlights() {
            return getOutlierHighlightViewApi()?.refreshOutlierHighlights();
        }

        function focusOutlierCandidate(candidateId) {
            return getOutlierHighlightViewApi()?.focusOutlierCandidate(candidateId);
        }

        function setOutlierDecision(candidateId, decision) {
            return getOutlierHighlightViewApi()?.setOutlierDecision(candidateId, decision);
        }

        function applyOutlierPreviewVisualState(gpxLayer) {
            return getOutlierModeViewApi()?.applyOutlierPreviewVisualState(gpxLayer);
        }

        function endOutlierMode({ refreshPanel = true } = {}) {
            return getOutlierModeViewApi()?.endOutlierMode({ refreshPanel });
        }

        function beginOutlierMode(filename) {
            return getOutlierModeViewApi()?.beginOutlierMode(filename);
        }

        async function applyOutlierCleanup() {
            return getOutlierCleanupViewApi()?.applyOutlierCleanup();
        }

        return {
            getOutlierDetectionRules,
            formatOutlierPointLabel,
            buildTrackSegments,
            mergeOutlierBases,
            finalizeOutlierCandidates,
            detectOutlierCandidates,
            clearOutlierSelectionLayers,
            getOutlierCandidateColor,
            refreshOutlierHighlights,
            focusOutlierCandidate,
            setOutlierDecision,
            applyOutlierPreviewVisualState,
            endOutlierMode,
            beginOutlierMode,
            applyOutlierCleanup
        };
    }

    globalScope.createOutlierDetectionBridgeService = createOutlierDetectionBridgeService;
})(window);
