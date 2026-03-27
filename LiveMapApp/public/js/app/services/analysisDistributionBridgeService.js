(function(global) {
    function createAnalysisDistributionBridgeService(deps) {
        const {
            getAnalysisDistributionViewApi,
            getAnalysisThresholdControlsViewApi,
            getAnalysisModeViewApi,
            analysisNormalizationService
        } = deps;

        function clampNumber(value, min, max, fallback) {
            return analysisNormalizationService.clampNumber(value, min, max, fallback);
        }

        function normalizeAnalysisThresholdEntry(profile, rawEntry) {
            return analysisNormalizationService.normalizeAnalysisThresholdEntry(profile, rawEntry);
        }

        function normalizeAnalysisThresholdsByProfile(rawByProfile) {
            return analysisNormalizationService.normalizeAnalysisThresholdsByProfile(rawByProfile);
        }

        function normalizeHeatmapTimeFilters(rawFilters) {
            return analysisNormalizationService.normalizeHeatmapTimeFilters(rawFilters);
        }

        function isAnalysisModeEnabled(mode) {
            return getAnalysisModeViewApi()?.isAnalysisModeEnabled(mode);
        }

        function isAnalysisAvailable() {
            return getAnalysisModeViewApi()?.isAnalysisAvailable();
        }

        function syncAnalysisToggleButtons() {
            return getAnalysisModeViewApi()?.syncAnalysisToggleButtons();
        }

        function updateAnalysisControlAvailability() {
            return getAnalysisModeViewApi()?.updateAnalysisControlAvailability();
        }

        function setAnalysisMode(nextMode, { refreshSelection = true } = {}) {
            return getAnalysisModeViewApi()?.setAnalysisMode(nextMode, { refreshSelection });
        }

        function initGradientToggle() {
            return getAnalysisModeViewApi()?.initGradientToggle();
        }

        function mergeAnalysisBandTotals(targetTotals, sourceTotals) {
            return getAnalysisDistributionViewApi()?.mergeAnalysisBandTotals(targetTotals, sourceTotals);
        }

        function summarizeAnalysisBands({ bands, totalsByBand, totalDistanceM, totalTimeSeconds }) {
            return getAnalysisDistributionViewApi()?.summarizeAnalysisBands({ bands, totalsByBand, totalDistanceM, totalTimeSeconds }) || [];
        }

        function createAnalysisBandRowsMarkup(summaryRows = [], { maxItems = 6 } = {}) {
            return getAnalysisDistributionViewApi()?.createAnalysisBandRowsMarkup(summaryRows, { maxItems }) || '<p class="placeholder-text">Keine auswertbaren Daten vorhanden.</p>';
        }

        function createAnalysisDistributionCardMarkup({ kicker = '', title = '', description = '', summaryRows = [], highlightText = '' } = {}) {
            return getAnalysisDistributionViewApi()?.createAnalysisDistributionCardMarkup({ kicker, title, description, summaryRows, highlightText }) || '';
        }

        function createAnalysisThresholdControlsMarkup({ profile, profileLabel, thresholds }) {
            return getAnalysisThresholdControlsViewApi()?.createAnalysisThresholdControlsMarkup({ profile, profileLabel, thresholds }) || '';
        }

        function bindAnalysisThresholdControls(profile) {
            return getAnalysisThresholdControlsViewApi()?.bindAnalysisThresholdControls(profile);
        }

        return {
            clampNumber,
            normalizeAnalysisThresholdEntry,
            normalizeAnalysisThresholdsByProfile,
            normalizeHeatmapTimeFilters,
            isAnalysisModeEnabled,
            isAnalysisAvailable,
            syncAnalysisToggleButtons,
            updateAnalysisControlAvailability,
            setAnalysisMode,
            initGradientToggle,
            mergeAnalysisBandTotals,
            summarizeAnalysisBands,
            createAnalysisBandRowsMarkup,
            createAnalysisDistributionCardMarkup,
            createAnalysisThresholdControlsMarkup,
            bindAnalysisThresholdControls
        };
    }

    global.createAnalysisDistributionBridgeService = createAnalysisDistributionBridgeService;
})(window);
