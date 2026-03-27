(function(global) {
    function createPrAnalysisBridgeService(deps) {
        const {
            getAnalysesViewApi,
            getPrAnalysisViewApi,
            prAlertsService
        } = deps;

        function buildPersonalRecordSnapshot(entries) {
            return prAlertsService.buildPersonalRecordSnapshot(entries);
        }

        function createPersonalRecordAlertMessages(previousSnapshot, nextSnapshot) {
            return prAlertsService.createPersonalRecordAlertMessages(previousSnapshot, nextSnapshot);
        }

        async function runPersonalRecordAlertCheck(options = {}) {
            return prAlertsService.runPersonalRecordAlertCheck(options);
        }

        function renderAnalysesView() {
            return getAnalysesViewApi()?.renderAnalysesView();
        }

        function initPrAnalysisModal() {
            return getPrAnalysisViewApi()?.initPrAnalysisModal();
        }

        async function renderPrAnalysisModal() {
            return getPrAnalysisViewApi()?.renderPrAnalysisModal();
        }

        return {
            buildPersonalRecordSnapshot,
            createPersonalRecordAlertMessages,
            runPersonalRecordAlertCheck,
            renderAnalysesView,
            initPrAnalysisModal,
            renderPrAnalysisModal
        };
    }

    global.createPrAnalysisBridgeService = createPrAnalysisBridgeService;
})(window);
