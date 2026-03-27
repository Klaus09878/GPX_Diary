(function attachChartPanelServiceFactory(globalScope) {
    function createChartPanelService({
        getActiveCharts,
        setActiveCharts,
        getCharts
    }) {
        function scheduleChartResize() {
            window.setTimeout(() => {
                getCharts().forEach(chart => {
                    if (!chart) {
                        return;
                    }

                    chart.resize();
                    chart.update('none');
                });
            }, 220);
        }

        function initElevationPanel() {
            const showBtn = document.getElementById('show-elevation-btn');
            const panel = document.getElementById('elevation-panel');
            if (!showBtn || !panel) {
                return;
            }

            showBtn.onclick = () => {
                panel.classList.add('open');
                showBtn.classList.remove('visible');
                scheduleChartResize();
            };
        }

        function refreshChartContainers() {
            const fallbackCharts = ['elevation', 'speed'];
            let activeCharts = getActiveCharts();
            if (!activeCharts.length) {
                activeCharts = [...fallbackCharts];
            }

            activeCharts = Array.from(new Set(activeCharts));

            const visibleKeys = [];

            ['elevation', 'speed', 'hr', 'power'].forEach(key => {
                const container = document.getElementById(`${key}-chart-container`);
                if (!container) {
                    return;
                }

                const isVisible = activeCharts.includes(key);
                container.style.display = isVisible ? '' : 'none';
                if (isVisible) {
                    visibleKeys.push(key);
                }
            });

            if (!visibleKeys.length) {
                activeCharts = ['elevation'];
                const elevationContainer = document.getElementById('elevation-chart-container');
                if (elevationContainer) {
                    elevationContainer.style.display = '';
                    visibleKeys.push('elevation');
                }

                const elevationTab = document.querySelector('.chart-tab[data-chart="elevation"]');
                if (elevationTab) {
                    elevationTab.classList.add('active');
                }
            }

            setActiveCharts(activeCharts);

            const wrapper = document.getElementById('charts-wrapper');
            if (wrapper) {
                wrapper.dataset.visibleCount = String(Math.max(1, visibleKeys.length));
            }

            scheduleChartResize();
        }

        function initChartTabs() {
            document.querySelectorAll('.chart-tab[data-chart]').forEach(tab => {
                tab.onclick = () => {
                    const chartKey = tab.getAttribute('data-chart');
                    if (!chartKey || tab.style.display === 'none') {
                        return;
                    }

                    let activeCharts = getActiveCharts();
                    const isActive = tab.classList.contains('active');
                    if (isActive && activeCharts.length > 1) {
                        activeCharts = activeCharts.filter(c => c !== chartKey);
                        tab.classList.remove('active');
                    } else if (!isActive) {
                        activeCharts = [...activeCharts, chartKey];
                        tab.classList.add('active');
                    }

                    setActiveCharts(Array.from(new Set(activeCharts)));
                    refreshChartContainers();
                };
            });

            refreshChartContainers();
        }

        return {
            scheduleChartResize,
            initElevationPanel,
            initChartTabs,
            refreshChartContainers
        };
    }

    globalScope.createChartPanelService = createChartPanelService;
})(window);
