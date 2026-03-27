(function(global) {
    function createInitializationBridgeService(deps) {
        const {
            getMapInitViewApi,
            getProfileSwitcherViewApi,
            getView3DToggleViewApi,
            getStartupOverlayViewApi,
            resolveViewApi,
            showToast,
            formatDashboardNumber
        } = deps;

        function getHealthDashboardViewApi() {
            return resolveViewApi('__healthDashboardViewApi', 'createHealthDashboardView', () => ({
                showToast,
                formatDashboardNumber
            }));
        }

        function initMap() {
            return getMapInitViewApi()?.initMap();
        }

        async function initializeProfiles() {
            return getProfileSwitcherViewApi()?.initializeProfiles();
        }

        function initProfileSwitcher() {
            return getProfileSwitcherViewApi()?.initProfileSwitcher();
        }

        function initView3DToggle() {
            return getView3DToggleViewApi()?.initView3DToggle();
        }

        function updateStartupProgress({ total = 0, processed = 0, statusText = '' } = {}) {
            return getStartupOverlayViewApi()?.updateStartupProgress({ total, processed, statusText });
        }

        function beginStartupExperience() {
            return getStartupOverlayViewApi()?.beginStartupExperience() || {
                finish: async () => {}
            };
        }

        async function renderHealthView() {
            return getHealthDashboardViewApi()?.renderHealthView();
        }

        async function handleHealthUpload(file) {
            return getHealthDashboardViewApi()?.handleHealthUpload(file);
        }

        async function refreshHealthDashboard() {
            return getHealthDashboardViewApi()?.refreshHealthDashboard();
        }

        function renderHealthKPIs(stats) {
            return getHealthDashboardViewApi()?.renderHealthKPIs(stats);
        }

        function renderHealthMainChart(data) {
            return getHealthDashboardViewApi()?.renderHealthMainChart(data);
        }

        async function renderHealthWeekdayChart() {
            return getHealthDashboardViewApi()?.renderHealthWeekdayChart();
        }

        return {
            initMap,
            initializeProfiles,
            initProfileSwitcher,
            initView3DToggle,
            updateStartupProgress,
            beginStartupExperience,
            getHealthDashboardViewApi,
            renderHealthView,
            handleHealthUpload,
            refreshHealthDashboard,
            renderHealthKPIs,
            renderHealthMainChart,
            renderHealthWeekdayChart
        };
    }

    global.createInitializationBridgeService = createInitializationBridgeService;
})(window);
