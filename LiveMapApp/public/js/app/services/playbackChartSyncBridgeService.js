(function(global) {
    function createPlaybackChartSyncBridgeService(deps) {
        const {
            playbackTimelineService,
            playbackChartSyncService
        } = deps;

        function resolvePointSpeedKmh(point, previousPoint) {
            return playbackTimelineService.resolvePointSpeedKmh(point, previousPoint);
        }

        function buildPlaybackTimeline(points) {
            return playbackTimelineService.buildPlaybackTimeline(points);
        }

        function rebuildPlaybackTimeline() {
            return playbackChartSyncService.rebuildPlaybackTimeline();
        }

        function getPlaybackIndexForVirtualTime(virtualSeconds) {
            return playbackChartSyncService.getPlaybackIndexForVirtualTime(virtualSeconds);
        }

        function syncAllCharts(idx) {
            return playbackChartSyncService.syncAllCharts(idx);
        }

        function clearChartSync() {
            return playbackChartSyncService.clearChartSync();
        }

        return {
            resolvePointSpeedKmh,
            buildPlaybackTimeline,
            rebuildPlaybackTimeline,
            getPlaybackIndexForVirtualTime,
            syncAllCharts,
            clearChartSync
        };
    }

    global.createPlaybackChartSyncBridgeService = createPlaybackChartSyncBridgeService;
})(window);
