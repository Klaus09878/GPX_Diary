(function attachAnalysisThresholdControlsViewFactory(globalScope) {
    function createAnalysisThresholdControlsView({
        formatNumericInputValue,
        getAnalysisThresholdPreset,
        getAnalysisThresholdPresetKey,
        formatThresholdLabel,
        getAnalysisThresholdPresetIcon,
        escapeHtml,
        getAnalysisThresholdPresetStateMarkup,
        analysisSteepThresholdMin,
        analysisSteepThresholdMax,
        analysisSpeedThresholdMin,
        analysisSpeedThresholdMax,
        normalizeAnalysisThresholdEntry,
        setAnalysisThresholds,
        resetAnalysisThresholds,
        getAnalysisThresholds
    }) {
        function createAnalysisThresholdControlsMarkup({ profile, profileLabel, thresholds }) {
            const steepValue = formatNumericInputValue(thresholds?.steepGradePercent, 1);
            const speedValue = formatNumericInputValue(thresholds?.fastSpeedKmh, 1);
            const conservativePreset = getAnalysisThresholdPreset(profile, 'conservative');
            const sportPreset = getAnalysisThresholdPreset(profile, 'sport');
            const activePresetKey = getAnalysisThresholdPresetKey(profile, thresholds);
            const conservativeTitle = `Setzt auf ${formatThresholdLabel(conservativePreset.steepGradePercent, '%')} und ${formatThresholdLabel(conservativePreset.fastSpeedKmh, 'km/h')}`;
            const sportTitle = `Setzt auf ${formatThresholdLabel(sportPreset.steepGradePercent, '%')} und ${formatThresholdLabel(sportPreset.fastSpeedKmh, 'km/h')}`;
            const conservativeIcon = getAnalysisThresholdPresetIcon('conservative');
            const sportIcon = getAnalysisThresholdPresetIcon('sport');
            const standardIcon = getAnalysisThresholdPresetIcon('standard');

            return `
        <div class="analysis-threshold-controls" data-analysis-threshold-profile="${escapeHtml(profile)}">
            <div class="activity-note-grid analysis-threshold-grid">
                <label class="activity-note-field">
                    <span class="mini-label">Steigungs-KPI ab (%)</span>
                    <input
                        type="number"
                        id="analysis-threshold-grade"
                        class="activity-note-select"
                        min="${analysisSteepThresholdMin}"
                        max="${analysisSteepThresholdMax}"
                        step="0.5"
                        value="${steepValue}"
                    />
                </label>
                <label class="activity-note-field">
                    <span class="mini-label">Geschwindigkeits-KPI ab (km/h)</span>
                    <input
                        type="number"
                        id="analysis-threshold-speed"
                        class="activity-note-select"
                        min="${analysisSpeedThresholdMin}"
                        max="${analysisSpeedThresholdMax}"
                        step="0.5"
                        value="${speedValue}"
                    />
                </label>
            </div>
            <div class="analysis-threshold-controls__footer">
                <div class="analysis-threshold-controls__meta">
                    <span class="analysis-threshold-controls__hint">Gilt für ${escapeHtml(profileLabel)} und bleibt gespeichert.</span>
                    <span class="analysis-threshold-controls__preset-state" id="analysis-threshold-preset-state" data-preset="${escapeHtml(activePresetKey)}">${getAnalysisThresholdPresetStateMarkup(activePresetKey)}</span>
                </div>
                <div class="analysis-threshold-controls__actions">
                    <button type="button" class="action-btn-secondary${activePresetKey === 'conservative' ? ' active' : ''}" id="analysis-threshold-preset-conservative" title="${escapeHtml(conservativeTitle)}" aria-pressed="${activePresetKey === 'conservative'}"><span class="analysis-threshold-preset-icon" aria-hidden="true">${conservativeIcon}</span><span>Konservativ</span></button>
                    <button type="button" class="action-btn-secondary${activePresetKey === 'sport' ? ' active' : ''}" id="analysis-threshold-preset-sport" title="${escapeHtml(sportTitle)}" aria-pressed="${activePresetKey === 'sport'}"><span class="analysis-threshold-preset-icon" aria-hidden="true">${sportIcon}</span><span>Sportlich</span></button>
                    <button type="button" class="action-btn-secondary${activePresetKey === 'standard' ? ' active' : ''}" id="analysis-threshold-reset" aria-pressed="${activePresetKey === 'standard'}"><span class="analysis-threshold-preset-icon" aria-hidden="true">${standardIcon}</span><span>Standard</span></button>
                </div>
            </div>
        </div>
    `;
        }

        function bindAnalysisThresholdControls(profile) {
            if (!profile) {
                return;
            }

            const gradeInput = document.getElementById('analysis-threshold-grade');
            const speedInput = document.getElementById('analysis-threshold-speed');
            const conservativeButton = document.getElementById('analysis-threshold-preset-conservative');
            const sportButton = document.getElementById('analysis-threshold-preset-sport');
            const resetButton = document.getElementById('analysis-threshold-reset');
            const presetState = document.getElementById('analysis-threshold-preset-state');

            if (!gradeInput || !speedInput) {
                return;
            }

            const syncInputs = (thresholds) => {
                gradeInput.value = formatNumericInputValue(thresholds?.steepGradePercent, 1);
                speedInput.value = formatNumericInputValue(thresholds?.fastSpeedKmh, 1);
            };

            const setPresetButtonState = (button, shouldActivate) => {
                if (!button) {
                    return;
                }

                button.classList.toggle('active', shouldActivate);
                button.setAttribute('aria-pressed', shouldActivate ? 'true' : 'false');
            };

            const refreshPresetState = (thresholds) => {
                const activePresetKey = getAnalysisThresholdPresetKey(profile, thresholds);
                const previousPresetKey = presetState?.dataset?.preset || '';

                setPresetButtonState(conservativeButton, activePresetKey === 'conservative');
                setPresetButtonState(sportButton, activePresetKey === 'sport');
                setPresetButtonState(resetButton, activePresetKey === 'standard');

                if (presetState) {
                    presetState.dataset.preset = activePresetKey;
                    presetState.innerHTML = getAnalysisThresholdPresetStateMarkup(activePresetKey);

                    if (previousPresetKey && previousPresetKey !== activePresetKey) {
                        presetState.classList.remove('is-transitioning');
                        void presetState.offsetWidth;
                        presetState.classList.add('is-transitioning');
                    }
                }
            };

            const applyThresholds = () => {
                const normalizedThresholds = normalizeAnalysisThresholdEntry(profile, {
                    steepGradePercent: Number(gradeInput.value),
                    fastSpeedKmh: Number(speedInput.value)
                });

                syncInputs(normalizedThresholds);
                setAnalysisThresholds(profile, normalizedThresholds);
                refreshPresetState(normalizedThresholds);
            };

            gradeInput.addEventListener('change', applyThresholds);
            speedInput.addEventListener('change', applyThresholds);
            gradeInput.addEventListener('blur', applyThresholds);
            speedInput.addEventListener('blur', applyThresholds);

            const applyPreset = (presetKey) => {
                const preset = getAnalysisThresholdPreset(profile, presetKey);
                syncInputs(preset);
                setAnalysisThresholds(profile, preset);
                refreshPresetState(preset);
            };

            conservativeButton?.addEventListener('click', () => {
                applyPreset('conservative');
            });

            sportButton?.addEventListener('click', () => {
                applyPreset('sport');
            });

            resetButton?.addEventListener('click', () => {
                resetAnalysisThresholds(profile);
            });

            refreshPresetState(getAnalysisThresholds(profile));
        }

        return {
            createAnalysisThresholdControlsMarkup,
            bindAnalysisThresholdControls
        };
    }

    globalScope.createAnalysisThresholdControlsView = createAnalysisThresholdControlsView;
})(window);
