(function attachPrAnalysisViewFactory(globalScope) {
    function createPrAnalysisView({
        initStandardModal,
        getCurrentProfile,
        getCurrentProfileLabel,
        collectProfileAnalysisEntries,
        loadSegmentFavorites,
        createSegmentFavoritesSection,
        createPrLeaderboardTable,
        createPrProgressionTable,
        buildPrLeaderboard,
        buildPrProgression,
        createTopClimbTable,
        buildTopClimbRanking,
        prDistanceMeters
    }) {
        let prRenderRequestId = 0;

        function initPrAnalysisModal() {
            initStandardModal({
                modalId: 'pr-modal',
                triggerId: 'pr-analysis-btn',
                closeId: 'close-pr-modal',
                initialFocusSelector: '#close-pr-modal',
                onOpen: async () => {
                    try {
                        await renderPrAnalysisModal();
                    } catch (err) {
                        console.error(err);
                        const content = document.getElementById('pr-content');
                        if (content) {
                            content.innerHTML = '<p class="placeholder-text">Analyse konnte nicht geladen werden.</p>';
                        }
                    }
                }
            });
        }

        async function renderPrAnalysisModal() {
            const content = document.getElementById('pr-content');
            const header = document.querySelector('#pr-modal .modal-header h2');
            if (!content) {
                return;
            }

            if (header) {
                header.textContent = `${getCurrentProfileLabel()} – PR & Segmentanalyse`;
            }

            content.innerHTML = '<p class="placeholder-text">Analysiere Trainingsdaten ...</p>';

            const requestId = ++prRenderRequestId;
            const currentProfile = getCurrentProfile();
            const [entries, favorites] = await Promise.all([
                collectProfileAnalysisEntries(),
                loadSegmentFavorites(currentProfile, { force: true })
            ]);

            if (requestId !== prRenderRequestId) {
                return;
            }

            content.innerHTML = '';

            if (entries.length < 1) {
                const empty = document.createElement('p');
                empty.className = 'placeholder-text';
                empty.textContent = 'Für dieses Profil sind aktuell keine auswertbaren Trainings verfügbar.';
                content.appendChild(empty);

                content.appendChild(createSegmentFavoritesSection([], favorites));
                return;
            }

            const intro = document.createElement('p');
            intro.className = 'trim-editor-hint';
            intro.textContent = 'Feste PR-Distanzen (1/5/10 km), beste Anstiege und PR-Entwicklung über die Zeit. „Ansehen“ öffnet den Abschnitt direkt auf der Karte.';
            content.appendChild(intro);

            prDistanceMeters.forEach(distanceMeters => {
                const section = document.createElement('section');
                section.className = 'pr-section';

                const title = document.createElement('h3');
                title.className = 'ranking-title';
                title.textContent = `${distanceMeters / 1000} km – Top-Abschnitte (PR)`;

                const leaderboard = buildPrLeaderboard(entries, distanceMeters);
                const progression = buildPrProgression(leaderboard);

                section.appendChild(title);
                section.appendChild(createPrLeaderboardTable(leaderboard, distanceMeters));
                section.appendChild(createPrProgressionTable(progression, distanceMeters));
                content.appendChild(section);
            });

            const climbSection = document.createElement('section');
            climbSection.className = 'pr-section';

            const climbTitle = document.createElement('h3');
            climbTitle.className = 'ranking-title';
            climbTitle.textContent = 'Beste Anstiege';

            climbSection.appendChild(climbTitle);
            climbSection.appendChild(createTopClimbTable(buildTopClimbRanking(entries)));
            content.appendChild(climbSection);

            content.appendChild(createSegmentFavoritesSection(entries, favorites));
        }

        return {
            initPrAnalysisModal,
            renderPrAnalysisModal
        };
    }

    globalScope.createPrAnalysisView = createPrAnalysisView;
})(window);
