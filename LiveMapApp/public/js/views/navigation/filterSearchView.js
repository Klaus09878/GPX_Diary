(function attachFilterSearchViewFactory(globalScope) {
    function createFilterSearchView({
        getCurrentProfile,
        getTrackDataCache,
        getTrackLayers,
        getMap,
        getCurrentSearchTerm,
        setCurrentSearchTerm,
        getActiveFilters,
        getSpeedThresholdsForProfile,
        getActivityNoteSummary,
        persistUiState,
        getSearchDebounceTimer,
        setSearchDebounceTimer,
        searchInputDebounceMs,
        createTrackListItem,
        getActiveTrackName,
        resetActiveTrackSelection,
        syncTrackListActiveState,
        getIsHeatmapActive,
        updateHeatmap
    }) {
        function initFiltersAndSort() {
            const sort = document.getElementById('sort-select');
            if (sort) sort.onchange = applyFiltersAndSort;
        }

        function initSearch() {
            const input = document.getElementById('search-input');
            if (input) input.oninput = (e) => {
                setCurrentSearchTerm(e.target.value);
                persistUiState();

                const existingTimer = getSearchDebounceTimer();
                if (existingTimer) {
                    window.clearTimeout(existingTimer);
                }

                setSearchDebounceTimer(window.setTimeout(() => {
                    setSearchDebounceTimer(null);
                    applyFiltersAndSort();
                }, searchInputDebounceMs));
            };
        }

        function initMapFilters() {
            document.querySelectorAll('.filter-chip').forEach(chip => {
                chip.onclick = () => {
                    const group = chip.getAttribute('data-group');
                    const activeFilters = getActiveFilters();
                    const isActive = chip.classList.contains('active');
                    document.querySelectorAll(`.filter-chip[data-group="${group}"]`).forEach(c => c.classList.remove('active'));
                    if (!isActive) {
                        chip.classList.add('active');
                        activeFilters.add(chip.getAttribute('data-filter'));
                    } else {
                        activeFilters.delete(chip.getAttribute('data-filter'));
                    }
                    document.querySelectorAll(`.filter-chip[data-group="${group}"]:not(.active)`).forEach(c => activeFilters.delete(c.getAttribute('data-filter')));
                    persistUiState();
                    applyFiltersAndSort();
                };
            });
        }

        function applyFiltersAndSort() {
            const list = document.getElementById('track-list');
            if (!list) return;

            const sortVal = document.getElementById('sort-select')?.value || 'date-desc';
            const trackDataCache = getTrackDataCache();
            const sortedTracks = [...trackDataCache].sort((a, b) => {
                if (sortVal === 'date-desc') return b.date - a.date;
                if (sortVal === 'date-asc') return a.date - b.date;
                if (sortVal === 'dist-desc') return b.distance - a.distance;
                if (sortVal === 'speed-desc') return (b.speed || 0) - (a.speed || 0);
                if (sortVal === 'elev-desc') return b.elevation - a.elevation;
                return 0;
            });

            const listFragment = document.createDocumentFragment();
            const visibleTracks = new Set();
            const visibleTrackStats = [];
            const speedThresholds = getSpeedThresholdsForProfile();
            const currentProfile = getCurrentProfile();
            const currentSearchTerm = getCurrentSearchTerm();
            const activeFilters = getActiveFilters();
            const trackLayers = getTrackLayers();
            const map = getMap();

            sortedTracks.forEach(stats => {
                const noteSummary = getActivityNoteSummary(currentProfile, stats.filename);
                const noteHaystack = `${noteSummary?.noteText || ''} ${noteSummary?.notePreview || ''}`.toLowerCase();
                const matchesSearch = stats.filename.toLowerCase().includes(currentSearchTerm)
                    || noteHaystack.includes(currentSearchTerm);
                let matchesFilters = true;

                activeFilters.forEach(f => {
                    if (f.startsWith('dist-')) {
                        const d = stats.distance / 1000;
                        if (f === 'dist-short' && d >= 20) matchesFilters = false;
                        if (f === 'dist-medium' && (d < 20 || d > 60)) matchesFilters = false;
                        if (f === 'dist-long' && d <= 60) matchesFilters = false;
                    }
                    if (f.startsWith('elev-')) {
                        const e = stats.elevation;
                        if (f === 'elev-flat' && e >= 200) matchesFilters = false;
                        if (f === 'elev-hilly' && (e < 200 || e > 800)) matchesFilters = false;
                        if (f === 'elev-mountain' && e <= 800) matchesFilters = false;
                    }
                    if (f.startsWith('speed-')) {
                        const s = stats.speed || 0;
                        if (f === 'speed-slow' && s >= speedThresholds.normalMin) matchesFilters = false;
                        if (f === 'speed-normal' && (s < speedThresholds.normalMin || s > speedThresholds.normalMax)) matchesFilters = false;
                        if (f === 'speed-fast' && s <= speedThresholds.normalMax) matchesFilters = false;
                    }
                });

                const layer = trackLayers[stats.filename];
                if (matchesSearch && matchesFilters) {
                    visibleTracks.add(stats.filename);
                    visibleTrackStats.push(stats);
                    if (map && layer && !map.hasLayer(layer)) layer.addTo(map);
                } else {
                    if (map && layer) map.removeLayer(layer);
                }
            });

            visibleTrackStats.forEach(stats => {
                listFragment.appendChild(createTrackListItem(stats.filename, stats.distance));
            });
            list.replaceChildren(listFragment);

            const activeTrackName = getActiveTrackName();
            if (activeTrackName && !visibleTracks.has(activeTrackName)) {
                resetActiveTrackSelection();
            }

            syncTrackListActiveState(getActiveTrackName());

            if (getIsHeatmapActive()) updateHeatmap();
        }

        return {
            initFiltersAndSort,
            initSearch,
            initMapFilters,
            applyFiltersAndSort
        };
    }

    globalScope.createFilterSearchView = createFilterSearchView;
})(window);
