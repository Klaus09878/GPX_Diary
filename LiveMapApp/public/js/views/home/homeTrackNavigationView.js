(function attachHomeTrackNavigationViewFactory(globalScope) {
    function createHomeTrackNavigationView({
        getActiveFilters,
        setCurrentSearchTerm,
        persistUiState,
        applyFiltersAndSort,
        setActiveView,
        viewMap,
        selectTrack
    }) {
        function clearTrackFilters() {
            const activeFilters = getActiveFilters();
            activeFilters.clear();
            setCurrentSearchTerm('');

            const searchInput = document.getElementById('search-input');
            if (searchInput) {
                searchInput.value = '';
            }

            document.querySelectorAll('.filter-chip.active').forEach(chip => chip.classList.remove('active'));
            persistUiState();
            applyFiltersAndSort();
        }

        async function openTrackFromHome(filename) {
            if (!filename) {
                return;
            }

            setActiveView(viewMap);
            clearTrackFilters();
            await selectTrack(filename);
        }

        return {
            clearTrackFilters,
            openTrackFromHome
        };
    }

    globalScope.createHomeTrackNavigationView = createHomeTrackNavigationView;
})(window);
