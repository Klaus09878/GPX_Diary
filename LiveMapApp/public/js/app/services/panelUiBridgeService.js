(function(global) {
    function createPanelUiBridgeService(deps) {
        const {
            panelUiService,
            loadingOverlayService,
            chartPanelService,
            toastNotificationService
        } = deps;

        function closeFloatingPanel() {
            return panelUiService.closeFloatingPanel();
        }

        function closeElevationPanel() {
            return panelUiService.closeElevationPanel();
        }

        function initFloatingPanelControls() {
            return panelUiService.initFloatingPanelControls();
        }

        function updateChartTabsVisibility(hasHR, hasPower) {
            return panelUiService.updateChartTabsVisibility(hasHR, hasPower);
        }

        function showLoadingOverlay(show) {
            return loadingOverlayService.showLoadingOverlay(show);
        }

        function scheduleChartResize() {
            return chartPanelService.scheduleChartResize();
        }

        function initElevationPanel() {
            return chartPanelService.initElevationPanel();
        }

        function initChartTabs() {
            return chartPanelService.initChartTabs();
        }

        function refreshChartContainers() {
            return chartPanelService.refreshChartContainers();
        }

        function ensureToastContainer() {
            return toastNotificationService.ensureToastContainer();
        }

        function dismissToast(toast, delayMs = 200) {
            return toastNotificationService.dismissToast(toast, delayMs);
        }

        function showToast(message, type = 'info') {
            return toastNotificationService.showToast(message, type);
        }

        return {
            closeFloatingPanel,
            closeElevationPanel,
            initFloatingPanelControls,
            updateChartTabsVisibility,
            showLoadingOverlay,
            scheduleChartResize,
            initElevationPanel,
            initChartTabs,
            refreshChartContainers,
            ensureToastContainer,
            dismissToast,
            showToast
        };
    }

    global.createPanelUiBridgeService = createPanelUiBridgeService;
})(window);
