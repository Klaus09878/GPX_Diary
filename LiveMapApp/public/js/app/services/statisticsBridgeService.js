(function(global) {
    function createStatisticsBridgeService(deps) {
        const {
            getStatisticsViewApi,
            getStatsAggregateViewApi,
            getComparisonSummaryViewApi,
            getComparisonSelectionViewApi,
            getComparisonViewApi
        } = deps;

        function collectNumericValues(points, extractor) {
            return getStatsAggregateViewApi()?.collectNumericValues(points, extractor) || [];
        }

        function calculateAverage(values) {
            return getStatsAggregateViewApi()?.calculateAverage(values);
        }

        function calculateMax(values) {
            return getStatsAggregateViewApi()?.calculateMax(values);
        }

        function renderDashboard() {
            return getStatisticsViewApi()?.renderDashboard();
        }

        function renderStatisticsPanel(container, options) {
            return getStatisticsViewApi()?.renderStatisticsPanel(container, options);
        }

        function renderStatisticsView() {
            return getStatisticsViewApi()?.renderStatisticsView();
        }

        async function collectComparisonSummary(profile, filename) {
            return getComparisonSummaryViewApi()?.collectComparisonSummary(profile, filename) || null;
        }

        function ensureComparisonSelection() {
            return getComparisonSelectionViewApi()?.ensureComparisonSelection() || [];
        }

        function initComparisonModal() {
            return getComparisonViewApi()?.initComparisonModal();
        }

        function showComparisonOnMap(leftSummary, rightSummary) {
            return getComparisonViewApi()?.showComparisonOnMap(leftSummary, rightSummary);
        }

        async function renderComparisonModal() {
            return getComparisonViewApi()?.renderComparisonModal();
        }

        return {
            collectNumericValues,
            calculateAverage,
            calculateMax,
            renderDashboard,
            renderStatisticsPanel,
            renderStatisticsView,
            collectComparisonSummary,
            ensureComparisonSelection,
            initComparisonModal,
            showComparisonOnMap,
            renderComparisonModal
        };
    }

    global.createStatisticsBridgeService = createStatisticsBridgeService;
})(window);
