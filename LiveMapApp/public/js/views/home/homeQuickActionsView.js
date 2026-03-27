(function attachHomeQuickActionsViewFactory(globalScope) {
    function createHomeQuickActionsView({
        setActiveView,
        viewMap,
        viewAnalyses,
        viewStatistics,
        openTrackFromHome,
        showToast
    }) {
        function bindHomeQuickActions(homeView) {
            document.getElementById('home-quick-map')?.addEventListener('click', () => setActiveView(viewMap));
            document.getElementById('home-quick-analyses')?.addEventListener('click', () => setActiveView(viewAnalyses));
            document.getElementById('home-quick-statistics')?.addEventListener('click', () => setActiveView(viewStatistics));
            document.getElementById('home-quick-dashboard')?.addEventListener('click', () => document.getElementById('home-open-dashboard')?.click());
            document.getElementById('home-quick-compare')?.addEventListener('click', () => document.getElementById('home-open-compare')?.click());
            document.getElementById('home-quick-pr')?.addEventListener('click', () => document.getElementById('home-open-pr')?.click());
            document.getElementById('home-quick-equipment')?.addEventListener('click', () => document.getElementById('home-open-equipment')?.click());

            homeView?.querySelectorAll('[data-open-track]').forEach(button => {
                button.addEventListener('click', () => {
                    const filename = decodeURIComponent(button.getAttribute('data-open-track') || '');
                    openTrackFromHome(filename).catch(error => {
                        console.error(error);
                        showToast('Training konnte nicht geöffnet werden.', 'error');
                    });
                });
            });
        }

        return {
            bindHomeQuickActions
        };
    }

    globalScope.createHomeQuickActionsView = createHomeQuickActionsView;
})(window);
