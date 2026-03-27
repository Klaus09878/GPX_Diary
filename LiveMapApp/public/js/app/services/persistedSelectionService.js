(function attachPersistedSelectionServiceFactory(globalScope) {
    function createPersistedSelectionService({
        viewHome,
        getCurrentProfile,
        getCurrentSearchTerm,
        getActiveFilters,
        getHeatmapTimeFilters,
        syncAnalysisToggleButtons,
        updateAnalysisControlAvailability,
        updateDashboardScopeButtons,
        setCurrentView,
        setActiveView,
        getLastSelectedTrackByProfile,
        setLastSelectedTrackByProfile,
        persistUiState,
        getTracksByProfile,
        getActiveTrackName,
        ensureMapViewportReady,
        selectTrack
    }) {
        function applyPersistedUiStateToControls() {
            const searchInput = document.getElementById('search-input');
            if (searchInput) {
                searchInput.value = getCurrentSearchTerm();
            }

            const activeFilters = getActiveFilters();
            document.querySelectorAll('.filter-chip').forEach(chip => {
                const filterKey = chip.getAttribute('data-filter');
                chip.classList.toggle('active', Boolean(filterKey) && activeFilters.has(filterKey));
            });

            const heatmapTimeFilters = getHeatmapTimeFilters();

            const daytimeFilter = document.getElementById('heatmap-filter-daytime');
            if (daytimeFilter) {
                daytimeFilter.value = heatmapTimeFilters.daytime;
            }

            const weekdayFilter = document.getElementById('heatmap-filter-weekday');
            if (weekdayFilter) {
                weekdayFilter.value = heatmapTimeFilters.weekday;
            }

            const seasonFilter = document.getElementById('heatmap-filter-season');
            if (seasonFilter) {
                seasonFilter.value = heatmapTimeFilters.season;
            }

            syncAnalysisToggleButtons();
            updateAnalysisControlAvailability();
            updateDashboardScopeButtons();
            setCurrentView(viewHome);
            setActiveView(viewHome, { skipPersist: true });
        }

        function getPersistedTrackSelection(profile = getCurrentProfile()) {
            const byProfile = getLastSelectedTrackByProfile();
            const savedTrack = byProfile[profile];
            return typeof savedTrack === 'string' && savedTrack ? savedTrack : null;
        }

        function setPersistedTrackSelection(profile, filename) {
            if (!profile) {
                return;
            }

            const byProfile = { ...getLastSelectedTrackByProfile() };

            if (typeof filename === 'string' && filename) {
                byProfile[profile] = filename;
            } else {
                delete byProfile[profile];
            }

            setLastSelectedTrackByProfile(byProfile);
            persistUiState();
        }

        async function restorePersistedTrackSelection(profile = getCurrentProfile()) {
            const currentProfile = getCurrentProfile();
            if (!profile || profile !== currentProfile) {
                return;
            }

            const savedTrack = getPersistedTrackSelection(profile);
            if (!savedTrack) {
                persistUiState();
                return;
            }

            const files = getTracksByProfile(profile) || [];
            if (!files.includes(savedTrack)) {
                setPersistedTrackSelection(profile, null);
                return;
            }

            if (getActiveTrackName() === savedTrack) {
                persistUiState();
                return;
            }

            await ensureMapViewportReady();
            await selectTrack(savedTrack);
        }

        return {
            applyPersistedUiStateToControls,
            getPersistedTrackSelection,
            setPersistedTrackSelection,
            restorePersistedTrackSelection
        };
    }

    globalScope.createPersistedSelectionService = createPersistedSelectionService;
})(window);
