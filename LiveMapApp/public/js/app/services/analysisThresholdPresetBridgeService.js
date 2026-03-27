(function(global) {
    function createAnalysisThresholdPresetBridgeService(deps) {
        const {
            analysisThresholdPresetService,
            speedThresholdService
        } = deps;

        function getSpeedThresholdsForProfile(profile) {
            return speedThresholdService.getSpeedThresholdsForProfile(profile);
        }

        function updateSpeedLabels() {
            return speedThresholdService.updateSpeedLabels();
        }

        function updateElevationLabels() {
            return speedThresholdService.updateElevationLabels();
        }

        function getDefaultAnalysisThresholds(profile) {
            return analysisThresholdPresetService.getDefaultAnalysisThresholds(profile);
        }

        function getAnalysisSpeedPresetDelta(profile) {
            return analysisThresholdPresetService.getAnalysisSpeedPresetDelta(profile);
        }

        function getAnalysisThresholdPreset(profile, presetKey) {
            return analysisThresholdPresetService.getAnalysisThresholdPreset(profile, presetKey);
        }

        function areAnalysisThresholdValuesEqual(leftValue, rightValue) {
            return analysisThresholdPresetService.areAnalysisThresholdValuesEqual(leftValue, rightValue);
        }

        function areAnalysisThresholdsEqual(leftThresholds, rightThresholds) {
            return analysisThresholdPresetService.areAnalysisThresholdsEqual(leftThresholds, rightThresholds);
        }

        function getAnalysisThresholdPresetKey(profile, thresholds) {
            return analysisThresholdPresetService.getAnalysisThresholdPresetKey(profile, thresholds);
        }

        function getAnalysisThresholdPresetLabel(presetKey) {
            return analysisThresholdPresetService.getAnalysisThresholdPresetLabel(presetKey);
        }

        function getAnalysisThresholdPresetIcon(presetKey) {
            return analysisThresholdPresetService.getAnalysisThresholdPresetIcon(presetKey);
        }

        function getAnalysisThresholdPresetStateMarkup(presetKey) {
            return analysisThresholdPresetService.getAnalysisThresholdPresetStateMarkup(presetKey);
        }

        return {
            getSpeedThresholdsForProfile,
            updateSpeedLabels,
            updateElevationLabels,
            getDefaultAnalysisThresholds,
            getAnalysisSpeedPresetDelta,
            getAnalysisThresholdPreset,
            areAnalysisThresholdValuesEqual,
            areAnalysisThresholdsEqual,
            getAnalysisThresholdPresetKey,
            getAnalysisThresholdPresetLabel,
            getAnalysisThresholdPresetIcon,
            getAnalysisThresholdPresetStateMarkup
        };
    }

    global.createAnalysisThresholdPresetBridgeService = createAnalysisThresholdPresetBridgeService;
})(window);
