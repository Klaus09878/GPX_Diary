(function attachAnalysisThresholdPresetServiceFactory(globalScope) {
    function createAnalysisThresholdPresetService({
        getCurrentProfile,
        normalizeAnalysisThresholdEntry,
        analysisSteepThresholdDefault,
        getSpeedThresholdsForProfile,
        getAnalysisThresholds,
        escapeHtml
    }) {
        function getDefaultAnalysisThresholds(profile = getCurrentProfile()) {
            return normalizeAnalysisThresholdEntry(profile, {
                steepGradePercent: analysisSteepThresholdDefault,
                fastSpeedKmh: typeof getSpeedThresholdsForProfile === 'function'
                    ? (Number(getSpeedThresholdsForProfile(profile).normalMax) || 20)
                    : 20
            });
        }

        function getAnalysisSpeedPresetDelta(profile = getCurrentProfile()) {
            if (profile === 'spazieren') {
                return 1;
            }

            if (profile === 'laufen') {
                return 1.5;
            }

            if (profile === 'rennrad') {
                return 3;
            }

            if (profile === 'motorrad') {
                return 12;
            }

            return 2;
        }

        function getAnalysisThresholdPreset(profile = getCurrentProfile(), presetKey = 'standard') {
            const base = getDefaultAnalysisThresholds(profile);
            const speedDelta = getAnalysisSpeedPresetDelta(profile);

            if (presetKey === 'conservative') {
                return normalizeAnalysisThresholdEntry(profile, {
                    steepGradePercent: base.steepGradePercent - 2,
                    fastSpeedKmh: base.fastSpeedKmh - speedDelta
                });
            }

            if (presetKey === 'sport') {
                return normalizeAnalysisThresholdEntry(profile, {
                    steepGradePercent: base.steepGradePercent + 2,
                    fastSpeedKmh: base.fastSpeedKmh + speedDelta
                });
            }

            return base;
        }

        function areAnalysisThresholdValuesEqual(leftValue, rightValue) {
            const leftNumber = Number(leftValue);
            const rightNumber = Number(rightValue);

            if (!Number.isFinite(leftNumber) || !Number.isFinite(rightNumber)) {
                return false;
            }

            return Math.abs(leftNumber - rightNumber) < 0.05;
        }

        function areAnalysisThresholdsEqual(leftThresholds, rightThresholds) {
            if (!leftThresholds || !rightThresholds) {
                return false;
            }

            return areAnalysisThresholdValuesEqual(leftThresholds.steepGradePercent, rightThresholds.steepGradePercent)
                && areAnalysisThresholdValuesEqual(leftThresholds.fastSpeedKmh, rightThresholds.fastSpeedKmh);
        }

        function getAnalysisThresholdPresetKey(profile = getCurrentProfile(), thresholds = null) {
            const resolvedThresholds = normalizeAnalysisThresholdEntry(profile, thresholds || getAnalysisThresholds(profile));
            const conservativePreset = getAnalysisThresholdPreset(profile, 'conservative');
            const standardPreset = getAnalysisThresholdPreset(profile, 'standard');
            const sportPreset = getAnalysisThresholdPreset(profile, 'sport');

            if (areAnalysisThresholdsEqual(resolvedThresholds, conservativePreset)) {
                return 'conservative';
            }

            if (areAnalysisThresholdsEqual(resolvedThresholds, standardPreset)) {
                return 'standard';
            }

            if (areAnalysisThresholdsEqual(resolvedThresholds, sportPreset)) {
                return 'sport';
            }

            return 'custom';
        }

        function getAnalysisThresholdPresetLabel(presetKey) {
            if (presetKey === 'conservative') {
                return 'Konservativ';
            }

            if (presetKey === 'sport') {
                return 'Sportlich';
            }

            if (presetKey === 'standard') {
                return 'Standard';
            }

            return 'Benutzerdefiniert';
        }

        function getAnalysisThresholdPresetIcon(presetKey) {
            if (presetKey === 'conservative') {
                return '🟢';
            }

            if (presetKey === 'sport') {
                return '🟠';
            }

            if (presetKey === 'standard') {
                return '🔵';
            }

            return '⚪';
        }

        function getAnalysisThresholdPresetStateMarkup(presetKey) {
            const label = getAnalysisThresholdPresetLabel(presetKey);
            const icon = getAnalysisThresholdPresetIcon(presetKey);

            return `<span class="analysis-threshold-controls__preset-state-icon" aria-hidden="true">${icon}</span><span>Aktiv: ${escapeHtml(label)}</span>`;
        }

        return {
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

    globalScope.createAnalysisThresholdPresetService = createAnalysisThresholdPresetService;
})(window);
