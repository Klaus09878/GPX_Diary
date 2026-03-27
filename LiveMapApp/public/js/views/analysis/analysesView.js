(function attachAnalysesViewFactory(globalScope) {
    function createAnalysesView({
        getCurrentProfile,
        getCurrentProfileLabel,
        getActiveTrackName,
        getPlaybackPoints,
        getTracksByProfile,
        getAnalysisThresholds,
        formatThresholdLabel,
        escapeHtml,
        createAnalysisThresholdControlsMarkup,
        setActiveView,
        viewMap,
        viewStatistics,
        bindAnalysisThresholdControls,
        collectProfileAnalysisOverview,
        summarizeAnalysisBands,
        toPercentShare,
        formatDistanceKm,
        formatDashboardNumber,
        createAnalysisDistributionCardMarkup,
        getAnalysisTimeline,
        buildTopSpeedPassages,
        computeElevationAnalysisTotals,
        computeSpeedAnalysisTotals,
        getTrackDisplayName,
        formatEffortTime,
        formatDistanceLabel,
        setAnalysisMode,
        analysisModeElevation,
        analysisModeSpeed,
        selectTrack,
        showToast
    }) {
        let analysisOverviewRenderRequestId = 0;

        function renderAnalysesView() {
            const view = document.getElementById('analyses-view');
            if (!view) {
                return;
            }

            const activeTrackName = getActiveTrackName();
            const playbackPoints = getPlaybackPoints();
            const hasTrack = Boolean(activeTrackName && Array.isArray(playbackPoints) && playbackPoints.length > 1);
            if (!hasTrack) {
                const selectedProfile = getCurrentProfile();
                const profileLabel = getCurrentProfileLabel();
                const analysisThresholds = getAnalysisThresholds(selectedProfile);
                const steepThresholdLabel = formatThresholdLabel(analysisThresholds.steepGradePercent, '%');
                const tracksByProfile = getTracksByProfile();
                const profileTrackCount = (tracksByProfile[selectedProfile] || []).length;
                const requestId = ++analysisOverviewRenderRequestId;

                view.innerHTML = `
                    <section class="analysis-page analysis-page--overview">
                        <article class="analysis-page-card">
                            <span class="home-section-kicker">Analysen</span>
                            <h3>Profil-Überblick · ${escapeHtml(profileLabel)}</h3>
                            <p>Keine aktive Route ausgewählt. Es wird eine Gesamtanalyse über alle Trainings des gewählten Profils geladen – inklusive Steigungsanteilen über ${escapeHtml(steepThresholdLabel)} und schneller Geschwindigkeitszonen.</p>
                            ${createAnalysisThresholdControlsMarkup({
                                profile: selectedProfile,
                                profileLabel,
                                thresholds: analysisThresholds
                            })}
                            <div class="home-quick-actions">
                                <button class="home-action-btn" type="button" id="analysis-go-map">Zur Karte</button>
                                <button class="home-action-btn" type="button" id="analysis-go-statistics">Zur Statistik</button>
                            </div>
                        </article>

                        <article class="analysis-page-card" id="analysis-overview-status-card">
                            <span class="home-section-kicker">Datenbasis</span>
                            <h3>Profil wird ausgewertet</h3>
                            <p id="analysis-overview-status-text">${profileTrackCount > 0
                                ? `${profileTrackCount} Trainings gefunden. Verteilungen werden berechnet...`
                                : 'Für dieses Profil sind aktuell keine Trainings geladen.'}</p>
                        </article>

                        <article class="analysis-page-card" id="analysis-overview-grade">
                            <span class="home-section-kicker">Steigungsverteilung</span>
                            <h3>Wird geladen…</h3>
                            <p class="placeholder-text">Sobald Daten vorliegen, siehst du pro Steigungsband Distanz und Prozentwerte.</p>
                        </article>

                        <article class="analysis-page-card" id="analysis-overview-speed">
                            <span class="home-section-kicker">Geschwindigkeitsverteilung</span>
                            <h3>Wird geladen…</h3>
                            <p class="placeholder-text">Sobald Daten vorliegen, siehst du pro Geschwindigkeitsband Distanz und Prozentwerte.</p>
                        </article>
                    </section>
                `;

                document.getElementById('analysis-go-map')?.addEventListener('click', () => setActiveView(viewMap));
                document.getElementById('analysis-go-statistics')?.addEventListener('click', () => setActiveView(viewStatistics));
                bindAnalysisThresholdControls(selectedProfile);

                if (!profileTrackCount) {
                    return;
                }

                collectProfileAnalysisOverview(selectedProfile)
                    .then(overview => {
                        const nextActiveTrackName = getActiveTrackName();
                        const nextPlaybackPoints = getPlaybackPoints();
                        const stillValidView = requestId === analysisOverviewRenderRequestId
                            && selectedProfile === getCurrentProfile()
                            && !(nextActiveTrackName && Array.isArray(nextPlaybackPoints) && nextPlaybackPoints.length > 1);

                        if (!stillValidView || !overview) {
                            return;
                        }

                        const gradeSummaryRows = summarizeAnalysisBands({
                            bands: overview.grade.bands,
                            totalsByBand: overview.grade.totalsByBand,
                            totalDistanceM: overview.grade.totalDistanceM,
                            totalTimeSeconds: overview.grade.totalTimeSeconds
                        });

                        const speedSummaryRows = summarizeAnalysisBands({
                            bands: overview.speed.bands,
                            totalsByBand: overview.speed.totalsByBand,
                            totalDistanceM: overview.speed.totalDistanceM,
                            totalTimeSeconds: overview.speed.totalTimeSeconds
                        });

                        const steepShare = toPercentShare(overview.grade.steepDistanceM, overview.grade.totalDistanceM);
                        const fastShare = toPercentShare(overview.speed.fastDistanceM, overview.speed.totalDistanceM);
                        const steepThresholdLabel = formatThresholdLabel(overview.grade.steepThresholdPercent, '%');

                        const statusText = `${overview.availableTrackCount} von ${overview.trackCount} Trainings auswertbar · Gesamtdistanz ${formatDistanceKm(overview.grade.totalDistanceM, 1)} · ${steepThresholdLabel} ${formatDashboardNumber(steepShare, 1)}%`;
                        const statusHost = document.getElementById('analysis-overview-status-text');
                        if (statusHost) {
                            statusHost.textContent = statusText;
                        }

                        const gradeCard = document.getElementById('analysis-overview-grade');
                        if (gradeCard) {
                            gradeCard.outerHTML = createAnalysisDistributionCardMarkup({
                                kicker: 'Steigungsverteilung',
                                title: 'Alle Trainings im Profil',
                                description: 'Distanz- und Zeitanteile je Steigungsband.',
                                summaryRows: gradeSummaryRows,
                                highlightText: `${steepThresholdLabel}: ${formatDistanceKm(overview.grade.steepDistanceM, 2)} (${formatDashboardNumber(steepShare, 1)}%)`
                            });
                        }

                        const speedCard = document.getElementById('analysis-overview-speed');
                        if (speedCard) {
                            const thresholdLabel = formatThresholdLabel(overview.speed.fastThresholdKmh, 'km/h');

                            speedCard.outerHTML = createAnalysisDistributionCardMarkup({
                                kicker: 'Geschwindigkeitsverteilung',
                                title: 'Alle Trainings im Profil',
                                description: 'Distanz- und Zeitanteile je Geschwindigkeitszone.',
                                summaryRows: speedSummaryRows,
                                highlightText: `${thresholdLabel}: ${formatDistanceKm(overview.speed.fastDistanceM, 2)} (${formatDashboardNumber(fastShare, 1)}%)`
                            });
                        }
                    })
                    .catch(error => {
                        console.error(error);
                        const statusHost = document.getElementById('analysis-overview-status-text');
                        if (statusHost) {
                            statusHost.textContent = 'Die Profilanalyse konnte nicht vollständig berechnet werden.';
                        }
                    });

                return;
            }

            const timelineSeconds = getAnalysisTimeline(playbackPoints);
            const distanceMeters = Math.max(0, (playbackPoints[playbackPoints.length - 1]?.dist || 0) - (playbackPoints[0]?.dist || 0));
            const totalDistanceKm = distanceMeters / 1000;
            const totalSeconds = Number(timelineSeconds[timelineSeconds.length - 1] || 0);
            const avgSpeedKmh = totalSeconds > 0 ? (totalDistanceKm / (totalSeconds / 3600)) : 0;
            const topPassages = buildTopSpeedPassages(playbackPoints, timelineSeconds);
            const currentProfile = getCurrentProfile();
            const analysisThresholds = getAnalysisThresholds(currentProfile);
            const profileLabel = getCurrentProfileLabel();
            const elevationTotals = computeElevationAnalysisTotals(playbackPoints, {
                steepThresholdPercent: analysisThresholds.steepGradePercent
            });
            const speedTotals = computeSpeedAnalysisTotals(playbackPoints, {
                profile: currentProfile,
                fastThresholdKmh: analysisThresholds.fastSpeedKmh
            });

            const elevationSummaryRows = summarizeAnalysisBands({
                bands: elevationTotals.bands,
                totalsByBand: elevationTotals.totalsByBand,
                totalDistanceM: elevationTotals.totalDistanceM,
                totalTimeSeconds: elevationTotals.totalTimeSeconds
            });

            const speedSummaryRows = summarizeAnalysisBands({
                bands: speedTotals.bands,
                totalsByBand: speedTotals.totalsByBand,
                totalDistanceM: speedTotals.totalDistanceM,
                totalTimeSeconds: speedTotals.totalTimeSeconds
            });

            const steepShare = toPercentShare(elevationTotals.steepDistanceM, elevationTotals.totalDistanceM);
            const fastShare = toPercentShare(speedTotals.fastDistanceM, speedTotals.totalDistanceM);
            const steepThresholdLabel = formatThresholdLabel(elevationTotals.steepThresholdPercent, '%');
            const fastThresholdLabel = formatThresholdLabel(speedTotals.fastThresholdKmh, 'km/h');

            view.innerHTML = `
                <section class="analysis-page">
                    <article class="analysis-page-card">
                        <span class="home-section-kicker">Aktive Route</span>
                        <h3>${escapeHtml(getTrackDisplayName(activeTrackName))}</h3>
                        <p>${formatDashboardNumber(totalDistanceKm, 1)} km · ${formatEffortTime(totalSeconds)} · Ø ${formatDashboardNumber(avgSpeedKmh, 1)} km/h</p>
                        ${createAnalysisThresholdControlsMarkup({
                            profile: currentProfile,
                            profileLabel,
                            thresholds: analysisThresholds
                        })}
                        <div class="home-quick-actions">
                            <button class="home-action-btn" type="button" id="analysis-open-elevation">Höhenanalyse</button>
                            <button class="home-action-btn" type="button" id="analysis-open-speed">Speedanalyse</button>
                            <button class="home-action-btn" type="button" id="analysis-open-map">Route auf Karte</button>
                        </div>
                    </article>

                    <article class="analysis-page-card">
                        <span class="home-section-kicker">Top-Passagen</span>
                        <h3>Geschwindigkeit</h3>
                        <div class="analysis-page-list">
                            ${topPassages.length ? topPassages.map(passage => `
                                <div class="analysis-page-list__row">
                                    <span>${formatDistanceLabel(passage.distanceMeters)}</span>
                                    <strong>${formatEffortTime(passage.timeSeconds)} · ${formatDashboardNumber(passage.avgSpeedKmh, 1)} km/h</strong>
                                </div>
                            `).join('') : '<p class="placeholder-text">Keine auswertbaren Passagen gefunden.</p>'}
                        </div>
                    </article>

                    ${createAnalysisDistributionCardMarkup({
                        kicker: 'Steigungsverteilung',
                        title: 'Aktive Route',
                        description: 'Distanz und Zeit je Steigungsband der aktuellen Strecke.',
                        summaryRows: elevationSummaryRows,
                        highlightText: `${steepThresholdLabel}: ${formatDistanceKm(elevationTotals.steepDistanceM, 2)} (${formatDashboardNumber(steepShare, 1)}%)`
                    })}

                    ${createAnalysisDistributionCardMarkup({
                        kicker: 'Geschwindigkeitsverteilung',
                        title: 'Aktive Route',
                        description: 'Distanz und Zeit je Geschwindigkeitszone der aktuellen Strecke.',
                        summaryRows: speedSummaryRows,
                        highlightText: `${fastThresholdLabel}: ${formatDistanceKm(speedTotals.fastDistanceM, 2)} (${formatDashboardNumber(fastShare, 1)}%)`
                    })}
                </section>
            `;

            document.getElementById('analysis-open-elevation')?.addEventListener('click', () => {
                setActiveView(viewMap);
                setAnalysisMode(analysisModeElevation);
            });

            document.getElementById('analysis-open-speed')?.addEventListener('click', () => {
                setActiveView(viewMap);
                setAnalysisMode(analysisModeSpeed);
            });

            document.getElementById('analysis-open-map')?.addEventListener('click', () => {
                setActiveView(viewMap);
                selectTrack(activeTrackName).catch(error => {
                    console.error(error);
                    showToast('Route konnte nicht geladen werden.', 'error');
                });
            });

            bindAnalysisThresholdControls(currentProfile);
        }

        return {
            renderAnalysesView
        };
    }

    globalScope.createAnalysesView = createAnalysesView;
})(window);
