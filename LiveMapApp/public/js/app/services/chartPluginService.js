(function attachChartPluginServiceFactory(globalScope) {
    function createChartPluginService() {
        function registerSyncLinePlugin({ chartCtor } = {}) {
            if (!chartCtor || typeof chartCtor.register !== 'function') {
                return;
            }

            chartCtor.register({
                id: 'syncLine',
                afterDraw: (chart) => {
                    const index = chart.options.plugins.syncLine?.index;
                    if (index === null || index === undefined) return;
                    const meta = chart.getDatasetMeta(0);
                    if (!meta || !meta.data || !meta.data[index]) return;
                    const ctx = chart.ctx;
                    const x = meta.data[index].x;
                    const yTop = chart.scales.y.top;
                    const yBottom = chart.scales.y.bottom;
                    ctx.save();
                    ctx.beginPath();
                    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
                    ctx.lineWidth = 1.5;
                    ctx.setLineDash([4, 4]);
                    ctx.moveTo(x, yTop);
                    ctx.lineTo(x, yBottom);
                    ctx.stroke();
                    ctx.restore();
                }
            });
        }

        return {
            registerSyncLinePlugin
        };
    }

    globalScope.createChartPluginService = createChartPluginService;
})(window);
