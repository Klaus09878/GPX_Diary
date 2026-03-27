(function(global) {
    function createChartBuildBridgeService(deps) {
        const {
            chartBuildService
        } = deps;

        function showCharts(gpxLayer) {
            return chartBuildService.showCharts(gpxLayer);
        }

        function buildElevationChart(themeColor) {
            return chartBuildService.buildElevationChart(themeColor);
        }

        function buildSpeedChart(themeColor) {
            return chartBuildService.buildSpeedChart(themeColor);
        }

        function buildHRChart() {
            return chartBuildService.buildHRChart();
        }

        function buildPowerChart() {
            return chartBuildService.buildPowerChart();
        }

        function getCommonChartOptions(unit, onHover) {
            return chartBuildService.getCommonChartOptions(unit, onHover);
        }

        return {
            showCharts,
            buildElevationChart,
            buildSpeedChart,
            buildHRChart,
            buildPowerChart,
            getCommonChartOptions
        };
    }

    global.createChartBuildBridgeService = createChartBuildBridgeService;
})(window);
