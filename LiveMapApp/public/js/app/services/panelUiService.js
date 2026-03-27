(function attachPanelUiServiceFactory(globalScope) {
    function createPanelUiService({
        endOutlierMode,
        endTrimMode,
        stopPlayback,
        clearChartSync,
        getActiveCharts,
        setActiveCharts,
        refreshChartContainers
    }) {
        function closeFloatingPanel() {
            endOutlierMode({ refreshPanel: false });
            endTrimMode({ refreshPanel: false });
            document.getElementById('floating-info-panel')?.classList.remove('visible');
            const showFloatingButton = document.getElementById('show-floating-btn');
            if (showFloatingButton) {
                showFloatingButton.style.display = 'block';
            }
            stopPlayback();
        }

        function toggleFloatingPanel() {
            const panel = document.getElementById('floating-info-panel');
            const showBtn = document.getElementById('show-floating-btn');
            if (panel?.classList.contains('visible')) {
                closeFloatingPanel();
            } else {
                panel?.classList.add('visible');
                if (showBtn) {
                    showBtn.style.display = 'none';
                }
            }
        }

        function closeElevationPanel() {
            document.getElementById('elevation-panel')?.classList.remove('open');
            document.getElementById('show-elevation-btn')?.classList.add('visible');
            clearChartSync();
        }

        function updateChartTabsVisibility(hasHR, hasPower) {
            const hrTab = document.getElementById('tab-hr');
            const powerTab = document.getElementById('tab-power');
            let activeCharts = getActiveCharts();

            if (hrTab) {
                hrTab.style.display = hasHR ? '' : 'none';
                if (!hasHR) {
                    hrTab.classList.remove('active');
                    activeCharts = activeCharts.filter(c => c !== 'hr');
                }
            }

            if (powerTab) {
                powerTab.style.display = hasPower ? '' : 'none';
                if (!hasPower) {
                    powerTab.classList.remove('active');
                    activeCharts = activeCharts.filter(c => c !== 'power');
                }
            }

            setActiveCharts(activeCharts);
            refreshChartContainers();
        }

        return {
            closeFloatingPanel,
            toggleFloatingPanel,
            closeElevationPanel,
            updateChartTabsVisibility
        };
    }

    globalScope.createPanelUiService = createPanelUiService;
})(window);
