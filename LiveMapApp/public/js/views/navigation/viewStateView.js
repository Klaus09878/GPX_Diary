(function attachViewStateViewFactory(globalScope) {
    function createViewStateView({
        viewHome,
        viewMap,
        viewAnalyses,
        viewStatistics,
        viewHealth,
        getCurrentView,
        setCurrentView,
        renderHomeView,
        renderAnalysesView,
        renderStatisticsView,
        renderHealthView,
        onMapViewActivated,
        persistUiState
    }) {
        const allowedViews = [viewHome, viewMap, viewAnalyses, viewStatistics, viewHealth];

        function setActiveView(nextView, { skipPersist = false } = {}) {
            const normalizedView = allowedViews.includes(nextView)
                ? nextView
                : viewHome;
            setCurrentView(normalizedView);
            const currentView = getCurrentView();

            document.querySelectorAll('.app-nav-btn[data-view]').forEach(button => {
                button.classList.toggle('active', button.getAttribute('data-view') === currentView);
            });

            document.getElementById('home-view')?.classList.toggle('active', currentView === viewHome);
            document.getElementById('map-view')?.classList.toggle('view-hidden', currentView !== viewMap);
            document.getElementById('analyses-view')?.classList.toggle('active', currentView === viewAnalyses);
            document.getElementById('statistics-view')?.classList.toggle('active', currentView === viewStatistics);
            document.getElementById('health-dashboard-view')?.classList.toggle('active', currentView === viewHealth);

            const mapElement = document.getElementById('map');
            const healthElement = document.getElementById('health-dashboard');

            if (mapElement) {
                mapElement.style.display = currentView === viewHealth ? 'none' : 'block';
            }

            if (healthElement) {
                healthElement.style.display = currentView === viewHealth ? 'block' : 'none';
            }

            if (currentView === viewHome) {
                renderHomeView();
            } else if (currentView === viewAnalyses) {
                renderAnalysesView();
            } else if (currentView === viewStatistics) {
                renderStatisticsView();
            } else if (currentView === viewHealth) {
                renderHealthView();
            }

            if (currentView === viewMap && typeof onMapViewActivated === 'function') {
                Promise.resolve(onMapViewActivated()).catch(error => {
                    console.warn('Map view activation hook failed', error);
                });
            }

            if (!skipPersist) {
                persistUiState();
            }
        }

        return {
            setActiveView
        };
    }

    globalScope.createViewStateView = createViewStateView;
})(window);
