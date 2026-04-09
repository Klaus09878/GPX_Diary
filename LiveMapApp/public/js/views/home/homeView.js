(function attachHomeViewFactory(globalScope) {
    function createHomeStatCard({ label, value, sub }) {
        return `
        <article class="home-card">
            <span class="home-card__label">${label}</span>
            <strong class="home-card__value">${value}</strong>
            <span class="home-card__sub">${sub}</span>
        </article>
    `;
    }

    function createHomeView({
        getActivityNoteSummariesByProfile,
        getCurrentProfile,
        getTrackDataCache,
        getEquipmentReminderSummary,
        getEquipmentItems,
        escapeHtml,
        getCurrentProfileLabel,
        formatDashboardNumber,
        formatDashboardDate,
        getTrackDisplayName,
        bindHomeQuickActions
    }) {
        function renderHomeView() {
            const homeView = document.getElementById('home-view');
            if (!homeView) {
                return;
            }

            const currentProfile = getCurrentProfile();
            const notesByFile = getActivityNoteSummariesByProfile()?.[currentProfile] || {};
            const notes = Object.values(notesByFile);
            const stats = [...getTrackDataCache()];
            const equipmentSummary = getEquipmentReminderSummary(currentProfile);
            const equipmentItemsCount = getEquipmentItems(currentProfile).length;
            const equipmentReminderText = equipmentSummary.dueCount > 0
                ? `${equipmentSummary.dueCount} Service überfällig`
                : equipmentSummary.warningCount > 0
                    ? `${equipmentSummary.warningCount} Service bald fällig`
                    : equipmentSummary.totalActive > 0
                        ? 'Ausrüstung im grünen Bereich'
                        : 'Noch kein Equipment erfasst';

            if (!stats.length) {
                homeView.innerHTML = `
            <section class="home-hero">
                <article class="home-hero-card">
                    <span class="home-hero-kicker">Willkommen</span>
                    <h2>Bereit für dein nächstes Training.</h2>
                    <p>Für das Profil ${escapeHtml(getCurrentProfileLabel())} sind noch keine Trainings geladen. Du kannst direkt GPX-, FIT- oder FIR-Dateien importieren und anschließend auf der Karte analysieren.</p>
                    <div class="home-quick-actions">
                        <button class="home-action-btn" type="button" data-home-action="import-files">Dateien importieren</button>
                        <button class="home-action-btn" type="button" data-home-action="open-dashboard">Statistik öffnen</button>
                        <button class="home-action-btn" type="button" data-home-action="open-statistics">Statistik-Seite</button>
                        <button class="home-action-btn" type="button" data-home-action="open-analyses">Analysen-Seite</button>
                        <button class="home-action-btn" type="button" data-home-action="open-equipment">Equipment öffnen</button>
                    </div>
                </article>
            </section>
        `;
                return;
            }

            const totalDistanceKm = stats.reduce((sum, item) => sum + ((Number(item.distance) || 0) / 1000), 0);
            const totalElevationM = stats.reduce((sum, item) => sum + (Number(item.elevation) || 0), 0);
            const avgSpeedKmh = stats.length ? stats.reduce((sum, item) => sum + (Number(item.speed) || 0), 0) / stats.length : 0;
            const recentTracks = [...stats]
                .sort((left, right) => (Number(right.date) || 0) - (Number(left.date) || 0))
                .slice(0, 6);
            const recentNotes = notes
                .filter(note => note.hasNote)
                .sort((left, right) => (Number(right.updatedAt) || 0) - (Number(left.updatedAt) || 0))
                .slice(0, 5);
            const activeDays = new Set(
                stats
                    .filter(item => Number(item.date) > 0)
                    .map(item => new Date(Number(item.date)).toISOString().slice(0, 10))
            ).size;
            const avgDistanceKm = stats.length ? totalDistanceKm / stats.length : 0;
            const latestTrack = recentTracks[0] || null;

            homeView.innerHTML = `
        <section class="home-hero">
            <article class="home-hero-card">
                <span class="home-hero-kicker">Home · ${escapeHtml(getCurrentProfileLabel())}</span>
                <h2>Dein Trainings-Überblick ist bereit.</h2>
                <p>Alle wichtigen Bereiche sind direkt erreichbar: Karte, Analysen, Statistik, Vergleich und PR. Letzte Einheiten, Notizen und Equipment-Status sind in einer kompakten Übersicht zusammengeführt.</p>
                <div class="home-quick-actions">
                    <button class="home-action-btn" type="button" data-home-action="open-map">Zur Karte</button>
                    <button class="home-action-btn" type="button" data-home-action="open-analyses">Analysen-Seite</button>
                    <button class="home-action-btn" type="button" data-home-action="open-statistics">Statistik-Seite</button>
                    <button class="home-action-btn" type="button" data-home-action="open-dashboard">Statistiken</button>
                    <button class="home-action-btn" type="button" data-home-action="open-compare">Vergleich</button>
                    <button class="home-action-btn" type="button" data-home-action="open-pr">PR & Segmente</button>
                    <button class="home-action-btn" type="button" data-home-action="open-equipment">Equipment</button>
                </div>
            </article>
            <article class="home-hero-card">
                <span class="home-section-kicker">Aktueller Status</span>
                <h2>${stats.length} Trainings im Profil</h2>
                <p>${recentNotes.length} aktuelle Notizen · Ø ${formatDashboardNumber(avgSpeedKmh, 1)} km/h · ${equipmentReminderText}</p>
                <div class="home-status-chips">
                    <span class="home-status-chip">Aktive Tage: ${activeDays}</span>
                    <span class="home-status-chip">Ø Distanz: ${formatDashboardNumber(avgDistanceKm, 1)} km</span>
                    <span class="home-status-chip">Letzter Track: ${latestTrack ? formatDashboardDate(Number(latestTrack.date) || 0) : '—'}</span>
                </div>
            </article>
        </section>

        <section class="home-stats-grid">
            ${createHomeStatCard({ label: 'Gesamtdistanz', value: `${formatDashboardNumber(totalDistanceKm, 1)} km`, sub: 'Aktuelles Profil' })}
            ${createHomeStatCard({ label: 'Höhenmeter', value: `+${formatDashboardNumber(totalElevationM, 0)} m`, sub: 'Kumuliert' })}
            ${createHomeStatCard({ label: 'Ø Geschwindigkeit', value: `${formatDashboardNumber(avgSpeedKmh, 1)} km/h`, sub: 'Über alle Einheiten' })}
            ${createHomeStatCard({ label: 'Notizen', value: `${recentNotes.length}`, sub: 'Mit Einträgen im Profil' })}
            ${createHomeStatCard({ label: 'Equipment', value: `${equipmentItemsCount}`, sub: equipmentReminderText })}
        </section>

        <section class="home-sections-grid">
            <article class="home-section">
                <span class="home-section-kicker">Zuletzt gefahren</span>
                <h3>Aktuelle Trainings</h3>
                <div class="home-list">
                    ${recentTracks.map(track => `
                        <div class="home-list-row">
                            <div class="home-list-row__content">
                                <span class="home-list-row__title">${escapeHtml(getTrackDisplayName(track.filename))}</span>
                                <span class="home-list-row__meta">${formatDashboardDate(Number(track.date) || 0)} · ${formatDashboardNumber((Number(track.distance) || 0) / 1000, 1)} km · +${formatDashboardNumber(Number(track.elevation) || 0, 0)} m</span>
                            </div>
                            <button class="home-open-btn" type="button" data-open-track="${encodeURIComponent(track.filename)}">Öffnen</button>
                        </div>
                    `).join('')}
                </div>
            </article>

            <article class="home-section">
                <span class="home-section-kicker">Trainings-Notizen</span>
                <h3>Letzte Einträge</h3>
                <div class="home-list">
                    ${recentNotes.length ? recentNotes.map(note => `
                        <div class="home-list-row">
                            <div class="home-list-row__content">
                                <span class="home-list-row__title">${escapeHtml(getTrackDisplayName(note.filename))}</span>
                                <span class="home-list-row__meta">Aktualisiert ${formatDashboardDate(Number(note.updatedAt) || 0)}</span>
                                <span class="home-list-row__preview">${escapeHtml(note.notePreview || 'Bewertungen gespeichert')}</span>
                            </div>
                            <button class="home-open-btn" type="button" data-open-track="${encodeURIComponent(note.filename)}">Öffnen</button>
                        </div>
                    `).join('') : '<p class="home-empty">Noch keine Notizen gespeichert. Öffne ein Training und ergänze Form, Wettergefühl, Schlaf und RPE.</p>'}
                </div>
            </article>
        </section>
    `;

            bindHomeQuickActions(homeView);
        }

        return {
            renderHomeView
        };
    }

    globalScope.createHomeView = createHomeView;
})(window);
