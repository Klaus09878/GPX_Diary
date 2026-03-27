(function(global) {
    function createPlaybackControlBridgeService(deps) {
        const {
            playbackControlService
        } = deps;

        function initPlaybackUI() {
            return playbackControlService.initPlaybackUI();
        }

        function updatePlaybackControlState() {
            return playbackControlService.updatePlaybackControlState();
        }

        function setPlaybackIndex(nextIndex) {
            return playbackControlService.setPlaybackIndex(nextIndex);
        }

        function stepPlayback(stepDelta) {
            return playbackControlService.stepPlayback(stepDelta);
        }

        function togglePlayback() {
            return playbackControlService.togglePlayback();
        }

        function pausePlayback() {
            return playbackControlService.pausePlayback();
        }

        function startPlaybackLoop() {
            return playbackControlService.startPlaybackLoop();
        }

        function stopPlayback() {
            return playbackControlService.stopPlayback();
        }

        return {
            initPlaybackUI,
            updatePlaybackControlState,
            setPlaybackIndex,
            stepPlayback,
            togglePlayback,
            pausePlayback,
            startPlaybackLoop,
            stopPlayback
        };
    }

    global.createPlaybackControlBridgeService = createPlaybackControlBridgeService;
})(window);
