(function attachStatisticsViewFactory(globalScope) {
    function createStatisticsView({
        getDashboardScope,
        getCurrentProfile,
        getCurrentProfileLabel,
        createStatsScopeSwitch,
        collectTrackStatsForScope,
        formatDashboardNumber,
        formatDashboardDate,
        createGoalProgressCard,
        createDashboardStatCard,
        computeRollingTrendKpis,
        formatSignedDelta,
        getDashboardTier,
        setActiveView,
        viewMap,
        focusTrackFromDashboard,
        showToast,
        getProfileSpecificInsight,
        createSportartInsightCard,
        createYearlyRecapSection,
        earthCircumferenceKm,
        everestHeightM,
        trendWindowDays
    }) {
        function renderDashboard() {
            const content = document.getElementById('dashboard-content');
            const title = document.querySelector('#dashboard-modal .modal-header h2');

            if (!content) {
                return;
            }

            const dashboardScope = getDashboardScope();
            const scopeLabel = dashboardScope === 'all' ? 'Alle Profile' : getCurrentProfileLabel();
            if (title) {
                title.textContent = `${scopeLabel} – Statistiken`;
            }

            renderStatisticsPanel(content, { scope: dashboardScope });
        }

        function renderStatisticsPanel(container, { scope = getDashboardScope() } = {}) {
            if (!container) {
                return;
            }

            container.innerHTML = '';
            container.appendChild(createStatsScopeSwitch());

            const stats = collectTrackStatsForScope(scope);
            if (!stats.length) {
                const empty = document.createElement('p');
                empty.className = 'placeholder-text';
                empty.textContent = 'Für den gewählten Scope sind aktuell keine Tracks verfügbar.';
                container.appendChild(empty);
                return;
            }

            const totalDistanceKm = stats.reduce((sum, item) => sum + item.distanceKm, 0);
            const totalElevationM = stats.reduce((sum, item) => sum + item.elevationM, 0);
            const avgSpeedKmh = stats.length > 0 ? stats.reduce((sum, item) => sum + item.speedKmh, 0) / stats.length : 0;
            const activeDays = new Set(stats.filter(item => item.dateMs > 0).map(item => new Date(item.dateMs).toISOString().slice(0, 10))).size;

            const longestTrack = stats.reduce((best, item) => (item.distanceKm > best.distanceKm ? item : best), stats[0]);
            const highestElevationTrack = stats.reduce((best, item) => (item.elevationM > best.elevationM ? item : best), stats[0]);
            const fastestTrack = stats.reduce((best, item) => (item.speedKmh > best.speedKmh ? item : best), stats[0]);
            const latestTrack = stats.reduce((best, item) => (item.dateMs > best.dateMs ? item : best), stats[0]);

            const hero = document.createElement('section');
            hero.className = 'stats-hero-premium';
            hero.innerHTML = `
                <div class="hero-main-stat">
                    <div class="hero-item">
                        <span class="hero-label">${scope === 'all' ? 'Gesamtdistanz (alle Profile)' : 'Gesamtdistanz'}</span>
                        <span class="hero-value">${formatDashboardNumber(totalDistanceKm, 1)} km</span>
                    </div>
                    <div class="hero-divider"></div>
                    <div class="hero-item">
                        <span class="hero-label">Gesamtanstieg</span>
                        <span class="hero-value">+${formatDashboardNumber(totalElevationM, 0)} m</span>
                    </div>
                </div>
                <div class="hero-track-count">${stats.length} Routen · ${activeDays || 1} aktive Tage · Ø ${formatDashboardNumber(avgSpeedKmh, 1)} km/h</div>
            `;

            const goalProgressGrid = document.createElement('section');
            goalProgressGrid.className = 'goal-progress-grid';

            const earthLoops = totalDistanceKm / earthCircumferenceKm;
            goalProgressGrid.appendChild(createGoalProgressCard({
                title: 'Erdumrundung',
                currentValue: totalDistanceKm,
                targetValue: earthCircumferenceKm,
                unit: 'km',
                extraText: `${formatDashboardNumber(earthLoops, 2)}x um die Erde`
            }));

            const everestLoops = totalElevationM / everestHeightM;
            goalProgressGrid.appendChild(createGoalProgressCard({
                title: 'Everest-Vergleich',
                currentValue: totalElevationM,
                targetValue: everestHeightM,
                unit: 'm',
                extraText: `${formatDashboardNumber(everestLoops, 2)}x Everest`
            }));

            const statsGrid = document.createElement('section');
            statsGrid.className = 'stats-grid';

            statsGrid.appendChild(createDashboardStatCard({
                icon: '📏',
                title: 'Längste Route',
                value: `${formatDashboardNumber(longestTrack.distanceKm, 1)} km`,
                sub: `${longestTrack.displayName} · ${formatDashboardDate(longestTrack.dateMs)}`,
                standout: true
            }));

            statsGrid.appendChild(createDashboardStatCard({
                icon: '⛰️',
                title: 'Höchster Anstieg',
                value: `+${formatDashboardNumber(highestElevationTrack.elevationM, 0)} m`,
                sub: `${highestElevationTrack.displayName} · ${formatDashboardDate(highestElevationTrack.dateMs)}`
            }));

            statsGrid.appendChild(createDashboardStatCard({
                icon: '⚡',
                title: 'Schnellste Route',
                value: `${formatDashboardNumber(fastestTrack.speedKmh, 1)} km/h`,
                sub: `${fastestTrack.displayName} · ${formatDashboardDate(fastestTrack.dateMs)}`
            }));

            statsGrid.appendChild(createDashboardStatCard({
                icon: '🗓️',
                title: 'Letzte Aktivität',
                value: `${formatDashboardDate(latestTrack.dateMs)}`,
                sub: `${latestTrack.displayName} · ${formatDashboardNumber(latestTrack.distanceKm, 1)} km`
            }));

            const trends = computeRollingTrendKpis(stats, {
                windowDays: trendWindowDays
            });

            const trendTitle = document.createElement('h3');
            trendTitle.className = 'ranking-title';
            trendTitle.textContent = `Trend · letzte ${trends.windowDays} Tage`;

            const trendHint = document.createElement('p');
            trendHint.className = 'trim-editor-hint';
            trendHint.textContent = 'Vergleich mit dem vorherigen Zeitraum gleicher Länge.';

            const trendGrid = document.createElement('section');
            trendGrid.className = 'stats-grid';

            const distanceSub = trends.hasComparisonData
                ? `Aktuell ${formatDashboardNumber(trends.recent.distanceKm, 1)} km · davor ${formatDashboardNumber(trends.previous.distanceKm, 1)} km`
                : `Aktuell ${formatDashboardNumber(trends.recent.distanceKm, 1)} km · Kein älterer Vergleichszeitraum.`;

            const elevationSub = trends.hasComparisonData
                ? `Aktuell +${formatDashboardNumber(trends.recent.elevationM, 0)} m · davor +${formatDashboardNumber(trends.previous.elevationM, 0)} m`
                : `Aktuell +${formatDashboardNumber(trends.recent.elevationM, 0)} m · Kein älterer Vergleichszeitraum.`;

            const activitySub = trends.hasComparisonData
                ? `Aktuell ${trends.recent.activities} Aktivitäten · davor ${trends.previous.activities}`
                : `Aktuell ${trends.recent.activities} Aktivitäten · Kein älterer Vergleichszeitraum.`;

            const speedSub = trends.hasComparisonData
                ? `Aktuell ${formatDashboardNumber(trends.recent.avgSpeedKmh, 1)} km/h · davor ${formatDashboardNumber(trends.previous.avgSpeedKmh, 1)} km/h`
                : `Aktuell ${formatDashboardNumber(trends.recent.avgSpeedKmh, 1)} km/h · Kein älterer Vergleichszeitraum.`;

            trendGrid.appendChild(createDashboardStatCard({
                icon: '📈',
                title: 'Distanztrend',
                value: formatSignedDelta(trends.deltaDistanceKm, 1, 'km'),
                sub: distanceSub,
                standout: trends.deltaDistanceKm > 0
            }));

            trendGrid.appendChild(createDashboardStatCard({
                icon: '⛰️',
                title: 'Anstiegstrend',
                value: formatSignedDelta(trends.deltaElevationM, 0, 'm'),
                sub: elevationSub,
                standout: trends.deltaElevationM > 0
            }));

            trendGrid.appendChild(createDashboardStatCard({
                icon: '🧭',
                title: 'Aktivitätstrend',
                value: formatSignedDelta(trends.deltaActivities, 0),
                sub: activitySub,
                standout: trends.deltaActivities > 0
            }));

            trendGrid.appendChild(createDashboardStatCard({
                icon: '⚡',
                title: 'Ø Tempo-Trend',
                value: formatSignedDelta(trends.deltaAvgSpeedKmh, 1, 'km/h'),
                sub: speedSub,
                standout: trends.deltaAvgSpeedKmh > 0
            }));

            const rankingTitle = document.createElement('h3');
            rankingTitle.className = 'ranking-title';
            rankingTitle.textContent = 'Tier List (beste Routen)';

            const rankingList = document.createElement('div');
            rankingList.className = 'ranking-list';

            const rankedTracks = [...stats]
                .sort((a, b) => b.score - a.score)
                .slice(0, 10);

            rankedTracks.forEach((track, index) => {
                const row = document.createElement('div');
                row.className = `ranking-row${index < 3 ? ' medal-row' : ''}`;

                const rank = document.createElement('div');
                rank.className = `ranking-rank${index < 3 ? ' medal' : ''}`;
                rank.textContent = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : String(index + 1);

                const info = document.createElement('div');
                info.className = 'ranking-info';

                const name = document.createElement('div');
                name.className = 'ranking-name';
                name.textContent = scope === 'all'
                    ? `${track.displayName} (${track.profileLabel})`
                    : track.displayName;

                const meta = document.createElement('div');
                meta.className = 'ranking-meta';
                const tier = getDashboardTier(index, rankedTracks.length);
                meta.textContent = `Tier ${tier} · ${formatDashboardNumber(track.distanceKm, 1)} km · +${formatDashboardNumber(track.elevationM, 0)} m · ${formatDashboardNumber(track.speedKmh, 1)} km/h`;

                info.appendChild(name);
                info.appendChild(meta);

                const viewButton = document.createElement('button');
                viewButton.className = 'view-btn';
                viewButton.textContent = 'Ansehen';
                viewButton.onclick = async () => {
                    setActiveView(viewMap);
                    try {
                        await focusTrackFromDashboard(track.filename, track.profile || getCurrentProfile());
                    } catch (error) {
                        console.error(error);
                        showToast('Route konnte nicht geöffnet werden.', 'error');
                    }
                };

                row.appendChild(rank);
                row.appendChild(info);
                row.appendChild(viewButton);

                rankingList.appendChild(row);
            });

            container.appendChild(hero);
            container.appendChild(goalProgressGrid);
            if (trends.hasAnyWindowData) {
                container.appendChild(trendTitle);
                container.appendChild(trendHint);
                container.appendChild(trendGrid);

                if (scope === 'profile') {
                    const activeProfile = getCurrentProfile();
                    const profileStats = stats.filter(item => (item.profile || activeProfile) === activeProfile);
                    if (profileStats.length > 0) {
                        const sportartInsight = getProfileSpecificInsight(activeProfile, trends, profileStats);
                        if (sportartInsight) {
                            const insightSection = document.createElement('section');
                            insightSection.className = 'sportart-insights-section';

                            const insightTitle = document.createElement('h3');
                            insightTitle.className = 'ranking-title';
                            insightTitle.textContent = 'Sportart-Spezifische Einblicke';

                            const insightContainer = document.createElement('div');
                            insightContainer.className = 'sportart-insights-grid';
                            const insightCard = createSportartInsightCard(sportartInsight);
                            if (insightCard) {
                                insightContainer.appendChild(insightCard);
                            }

                            insightSection.appendChild(insightTitle);
                            insightSection.appendChild(insightContainer);
                            container.appendChild(insightSection);
                        }
                    }
                }
            }
            container.appendChild(statsGrid);
            container.appendChild(rankingTitle);
            container.appendChild(rankingList);
            container.appendChild(createYearlyRecapSection(stats));
        }

        function renderStatisticsView() {
            const view = document.getElementById('statistics-view');
            if (!view) {
                return;
            }

            renderStatisticsPanel(view, { scope: getDashboardScope() });
        }

        return {
            renderDashboard,
            renderStatisticsPanel,
            renderStatisticsView
        };
    }

    globalScope.createStatisticsView = createStatisticsView;
})(window);
