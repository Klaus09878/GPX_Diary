(function(global) {
    function createHeatmapLayerBridgeService(deps) {
        const {
            heatmapLayerService,
            overlayHeatmapToggleService,
            heatmapTimeFilterService,
            heatmapGradientService
        } = deps;

        function initHeatmapToggle() {
            return overlayHeatmapToggleService.initHeatmapToggle();
        }

        function initHeatmapScopeToggle() {
            return overlayHeatmapToggleService.initHeatmapScopeToggle();
        }

        function initOverlayToggle() {
            return overlayHeatmapToggleService.initOverlayToggle();
        }

        function refreshOverlayVisibility() {
            return overlayHeatmapToggleService.refreshOverlayVisibility();
        }

        function getHeatmapPointTimestampMs(point) {
            return heatmapTimeFilterService.getHeatmapPointTimestampMs(point);
        }

        function getHeatmapSeason(dateValue) {
            return heatmapTimeFilterService.getHeatmapSeason(dateValue);
        }

        function getHeatmapWeekdayToken(dateValue) {
            return heatmapTimeFilterService.getHeatmapWeekdayToken(dateValue);
        }

        function isHeatmapPointMatchingTimeFilters(point) {
            return heatmapTimeFilterService.isHeatmapPointMatchingTimeFilters(point);
        }

        function initHeatmapTimeFilters() {
            return heatmapTimeFilterService.initHeatmapTimeFilters();
        }

        function parseColorToRgb(colorValue) {
            return heatmapGradientService.parseColorToRgb(colorValue);
        }

        function mixRgb(fromRgb, toRgb, ratio) {
            return heatmapGradientService.mixRgb(fromRgb, toRgb, ratio);
        }

        function rgbToCss(rgb, alpha = 1) {
            return heatmapGradientService.rgbToCss(rgb, alpha);
        }

        function getProfileBaseColor(profile) {
            return heatmapGradientService.getProfileBaseColor(profile);
        }

        function buildHeatmapGradientForProfile(profile) {
            return heatmapGradientService.buildHeatmapGradientForProfile(profile);
        }

        function getHeatmapSourceEntries() {
            return heatmapLayerService.getHeatmapSourceEntries();
        }

        function getHeatmapPointsForEntry(entry) {
            return heatmapLayerService.getHeatmapPointsForEntry(entry);
        }

        function sampleTrackPointsForHeatmap(points) {
            return heatmapLayerService.sampleTrackPointsForHeatmap(points);
        }

        function clearHeatmapLayers() {
            return heatmapLayerService.clearHeatmapLayers();
        }

        function buildHeatmapBucketsByProfile(sourceEntries) {
            return heatmapLayerService.buildHeatmapBucketsByProfile(sourceEntries);
        }

        function updateHeatmap() {
            return heatmapLayerService.updateHeatmap();
        }

        return {
            initHeatmapToggle,
            initHeatmapScopeToggle,
            initOverlayToggle,
            refreshOverlayVisibility,
            getHeatmapPointTimestampMs,
            getHeatmapSeason,
            getHeatmapWeekdayToken,
            isHeatmapPointMatchingTimeFilters,
            initHeatmapTimeFilters,
            parseColorToRgb,
            mixRgb,
            rgbToCss,
            getProfileBaseColor,
            buildHeatmapGradientForProfile,
            getHeatmapSourceEntries,
            getHeatmapPointsForEntry,
            sampleTrackPointsForHeatmap,
            clearHeatmapLayers,
            buildHeatmapBucketsByProfile,
            updateHeatmap
        };
    }

    global.createHeatmapLayerBridgeService = createHeatmapLayerBridgeService;
})(window);
