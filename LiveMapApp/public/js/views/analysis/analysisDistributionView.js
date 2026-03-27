(function attachAnalysisDistributionViewFactory(globalScope) {
    function createAnalysisDistributionView({
        toPercentShare,
        escapeHtml,
        formatDistanceKm,
        formatDashboardNumber
    }) {
        function mergeAnalysisBandTotals(targetTotals, sourceTotals) {
            if (!targetTotals || !sourceTotals) {
                return;
            }

            Object.keys(targetTotals).forEach(bandId => {
                const source = sourceTotals[bandId];
                if (!source) {
                    return;
                }

                const sourceDistance = Number(source.distanceM);
                const sourceTime = Number(source.timeSeconds);

                if (Number.isFinite(sourceDistance) && sourceDistance > 0) {
                    targetTotals[bandId].distanceM += sourceDistance;
                }

                if (Number.isFinite(sourceTime) && sourceTime > 0) {
                    targetTotals[bandId].timeSeconds += sourceTime;
                }
            });
        }

        function summarizeAnalysisBands({ bands, totalsByBand, totalDistanceM, totalTimeSeconds }) {
            return (Array.isArray(bands) ? bands : [])
                .map(band => {
                    const totals = totalsByBand?.[band.id] || { distanceM: 0, timeSeconds: 0 };
                    const distanceM = Number(totals.distanceM) || 0;
                    const timeSeconds = Number(totals.timeSeconds) || 0;

                    return {
                        id: band.id,
                        label: band.label,
                        rangeLabel: band.rangeLabel || '',
                        color: band.color,
                        distanceM,
                        timeSeconds,
                        distanceShare: toPercentShare(distanceM, totalDistanceM),
                        timeShare: toPercentShare(timeSeconds, totalTimeSeconds)
                    };
                })
                .filter(item => item.distanceM > 0 || item.timeSeconds > 0)
                .sort((left, right) => right.distanceM - left.distanceM || right.timeSeconds - left.timeSeconds);
        }

        function createAnalysisBandRowsMarkup(summaryRows = [], { maxItems = 6 } = {}) {
            if (!Array.isArray(summaryRows) || summaryRows.length === 0) {
                return '<p class="placeholder-text">Keine auswertbaren Daten vorhanden.</p>';
            }

            return summaryRows
                .slice(0, Math.max(1, maxItems))
                .map(row => {
                    const rangeText = row.rangeLabel ? `<span class="analysis-page-list__metric-sub">${escapeHtml(row.rangeLabel)}</span>` : '';
                    return `
                <div class="analysis-page-list__row analysis-page-list__row--metric">
                    <div class="analysis-page-list__metric-main">
                        <span class="analysis-page-list__swatch" style="background:${row.color}"></span>
                        <span class="analysis-page-list__metric-text">
                            <strong>${escapeHtml(row.label)}</strong>
                            ${rangeText}
                        </span>
                    </div>
                    <div class="analysis-page-list__metric-values">
                        <strong>${formatDistanceKm(row.distanceM, 2)} · ${formatDashboardNumber(row.distanceShare, 1)}%</strong>
                        <span class="analysis-page-list__metric-sub">Zeit ${formatDashboardNumber(row.timeShare, 1)}%</span>
                    </div>
                </div>
            `;
                })
                .join('');
        }

        function createAnalysisDistributionCardMarkup({ kicker = '', title = '', description = '', summaryRows = [], highlightText = '' } = {}) {
            return `
        <article class="analysis-page-card analysis-page-card--distribution">
            <span class="home-section-kicker">${escapeHtml(kicker)}</span>
            <h3>${escapeHtml(title)}</h3>
            <p>${escapeHtml(description)}</p>
            ${highlightText ? `<div class="analysis-kpi-row"><span class="analysis-kpi-pill">${escapeHtml(highlightText)}</span></div>` : ''}
            <div class="analysis-page-list analysis-page-list--metrics">
                ${createAnalysisBandRowsMarkup(summaryRows, { maxItems: 6 })}
            </div>
        </article>
    `;
        }

        return {
            mergeAnalysisBandTotals,
            summarizeAnalysisBands,
            createAnalysisBandRowsMarkup,
            createAnalysisDistributionCardMarkup
        };
    }

    globalScope.createAnalysisDistributionView = createAnalysisDistributionView;
})(window);
