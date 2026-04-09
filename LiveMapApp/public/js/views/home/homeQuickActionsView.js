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
            homeView?.querySelectorAll('[data-home-action]').forEach(button => {
                button.addEventListener('click', () => {
                    const action = button.getAttribute('data-home-action');

                    if (action === 'open-map') {
                        setActiveView(viewMap);
                        return;
                    }

                    if (action === 'open-analyses') {
                        setActiveView(viewAnalyses);
                        return;
                    }

                    if (action === 'open-statistics') {
                        setActiveView(viewStatistics);
                        return;
                    }

                    if (action === 'open-dashboard') {
                        document.getElementById('home-open-dashboard')?.click();
                        return;
                    }

                    if (action === 'open-compare') {
                        document.getElementById('home-open-compare')?.click();
                        return;
                    }

                    if (action === 'open-pr') {
                        document.getElementById('home-open-pr')?.click();
                        return;
                    }

                    if (action === 'open-equipment') {
                        document.getElementById('home-open-equipment')?.click();
                        return;
                    }

                    if (action === 'import-files') {
                        document.getElementById('drop-zone')?.click();
                    }
                });
            });

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
