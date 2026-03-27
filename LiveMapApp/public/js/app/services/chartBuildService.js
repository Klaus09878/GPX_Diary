(function attachChartBuildServiceFactory(globalScope) {
    function createChartBuildService({
        getPlaybackPoints,
        getElevationChart,
        setElevationChart,
        getSpeedChart,
        setSpeedChart,
        getHrChart,
        setHrChart,
        getPowerChart,
        setPowerChart,
        getHeartRateValue,
        getPowerValue,
        countValidPowerSamples,
        resolvePointSpeedKmh,
        syncAllCharts,
        pausePlayback,
        setPlaybackIndex,
        updateChartTabsVisibility,
        scheduleChartResize,
        getChartCtor
    }) {
        function getCommonChartOptions(unit, onHover) {
            return {
                responsive: true,
                maintainAspectRatio: false,
                animation: false,
                interaction: { mode: 'index', intersect: false },
                onHover: (event, elements) => {
                    if (elements.length > 0) {
                        onHover(elements[0].index);
                    }
                },
                onClick: (event, elements) => {
                    if (!elements || !elements.length) {
                        return;
                    }
                    pausePlayback();
                    setPlaybackIndex(elements[0].index);
                },
                plugins: {
                    legend: { display: false },
                    syncLine: { index: undefined },
                    tooltip: {
                        backgroundColor: 'rgba(15,23,42,0.95)',
                        callbacks: { label: context => `${context.parsed.y.toFixed(1)} ${unit}` }
                    }
                },
                layout: { padding: { top: 6, right: 8, bottom: 14, left: 6 } },
                scales: {
                    x: {
                        display: true,
                        ticks: {
                            color: '#94a3b8',
                            font: { size: 10 },
                            padding: 6,
                            maxTicksLimit: 8,
                            autoSkip: true,
                            maxRotation: 0,
                            callback(value) {
                                const label = Number(this.getLabelForValue(value));
                                if (!Number.isFinite(label)) {
                                    return '';
                                }

                                return `${label.toFixed(label >= 10 ? 0 : 1)} km`;
                            }
                        },
                        grid: { color: 'rgba(148,163,184,0.08)' }
                    },
                    y: {
                        ticks: { color: '#64748b', font: { size: 10 } },
                        grid: { color: 'rgba(148,163,184,0.08)' },
                        grace: '8%'
                    }
                }
            };
        }

        function buildElevationChart(themeColor) {
            const canvas = document.getElementById('elevation-chart');
            const noData = document.getElementById('elevation-no-data');
            const existing = getElevationChart();
            if (existing) {
                existing.destroy();
            }

            const playbackPoints = getPlaybackPoints();
            if (!playbackPoints.length) {
                if (noData) {
                    noData.style.display = 'flex';
                }
                canvas.style.display = 'none';
                return;
            }

            if (noData) {
                noData.style.display = 'none';
            }
            canvas.style.display = 'block';

            const ChartCtor = getChartCtor();
            setElevationChart(new ChartCtor(canvas, {
                type: 'line',
                data: {
                    labels: playbackPoints.map(point => (point.dist / 1000).toFixed(2)),
                    datasets: [{
                        label: 'Höhe (m)',
                        data: playbackPoints.map(point => point.alt),
                        borderColor: themeColor,
                        backgroundColor: themeColor + '33',
                        fill: true,
                        pointRadius: 0,
                        tension: 0.2
                    }]
                },
                options: getCommonChartOptions('m', index => syncAllCharts(index))
            }));
        }

        function buildSpeedChart(themeColor) {
            const canvas = document.getElementById('speed-chart');
            const noData = document.getElementById('speed-no-data');
            const existing = getSpeedChart();
            if (existing) {
                existing.destroy();
            }

            const playbackPoints = getPlaybackPoints();
            const speeds = playbackPoints.map((point, index) => resolvePointSpeedKmh(point, index > 0 ? playbackPoints[index - 1] : null));
            const isAllZero = speeds.every(speed => speed <= 0.05);
            if (isAllZero) {
                canvas.style.display = 'none';
                noData.style.display = 'flex';
                return;
            }

            canvas.style.display = 'block';
            noData.style.display = 'none';

            const ChartCtor = getChartCtor();
            setSpeedChart(new ChartCtor(canvas, {
                type: 'line',
                data: {
                    labels: playbackPoints.map(point => (point.dist / 1000).toFixed(2)),
                    datasets: [{
                        label: 'km/h',
                        data: speeds,
                        borderColor: '#60a5fa',
                        backgroundColor: 'rgba(96,165,250,0.15)',
                        fill: true,
                        pointRadius: 0,
                        tension: 0.4
                    }]
                },
                options: getCommonChartOptions('km/h', index => syncAllCharts(index))
            }));
        }

        function buildHRChart() {
            const canvas = document.getElementById('hr-chart');
            const noData = document.getElementById('hr-no-data');
            const existing = getHrChart();
            if (existing) {
                existing.destroy();
            }

            const playbackPoints = getPlaybackPoints();
            const data = playbackPoints.map(getHeartRateValue);
            if (!data.some(value => value !== null)) {
                if (noData) {
                    noData.style.display = 'flex';
                }
                canvas.style.display = 'none';
                return;
            }

            if (noData) {
                noData.style.display = 'none';
            }
            canvas.style.display = 'block';

            const ChartCtor = getChartCtor();
            setHrChart(new ChartCtor(canvas, {
                type: 'line',
                data: {
                    labels: playbackPoints.map(point => (point.dist / 1000).toFixed(2)),
                    datasets: [{ label: 'Puls', data, borderColor: '#ef4444', pointRadius: 0, tension: 0.2 }]
                },
                options: getCommonChartOptions('bpm', index => syncAllCharts(index))
            }));
        }

        function buildPowerChart() {
            const canvas = document.getElementById('power-chart');
            const noData = document.getElementById('power-no-data');
            const existing = getPowerChart();
            if (existing) {
                existing.destroy();
            }

            const playbackPoints = getPlaybackPoints();
            const data = playbackPoints.map(getPowerValue);
            if (data.filter(value => value !== null).length <= 1) {
                if (noData) {
                    noData.style.display = 'flex';
                }
                canvas.style.display = 'none';
                return;
            }

            if (noData) {
                noData.style.display = 'none';
            }
            canvas.style.display = 'block';

            const ChartCtor = getChartCtor();
            setPowerChart(new ChartCtor(canvas, {
                type: 'line',
                data: {
                    labels: playbackPoints.map(point => (point.dist / 1000).toFixed(2)),
                    datasets: [{ label: 'Watt', data, borderColor: '#fbbf24', pointRadius: 0, tension: 0.2 }]
                },
                options: getCommonChartOptions('W', index => syncAllCharts(index))
            }));
        }

        function showCharts(gpxLayer) {
            const panel = document.getElementById('elevation-panel');
            if (panel) {
                panel.classList.add('open');
                document.getElementById('show-elevation-btn')?.classList.remove('visible');
            }

            const themeColor = getComputedStyle(document.documentElement).getPropertyValue('--active-theme-color').trim();
            const playbackPoints = getPlaybackPoints();
            const hasHR = playbackPoints.some(point => getHeartRateValue(point) !== null);
            const hasPower = countValidPowerSamples(playbackPoints) > 1;

            updateChartTabsVisibility(hasHR, hasPower);
            buildElevationChart(themeColor);
            buildSpeedChart(themeColor);
            buildHRChart();
            buildPowerChart();
            scheduleChartResize();
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

    globalScope.createChartBuildService = createChartBuildService;
})(window);
