(function attachNavigationViewFactory(globalScope) {
    function createNavigationView({ setActiveView, viewMap }) {
        function initAppNavigation() {
            document.querySelectorAll('.app-nav-btn[data-view]').forEach(button => {
                button.onclick = () => setActiveView(button.getAttribute('data-view'));
            });

            document.getElementById('home-open-dashboard')?.addEventListener('click', () => {
                setActiveView(viewMap);
                document.getElementById('dashboard-btn')?.click();
            });

            document.getElementById('home-open-compare')?.addEventListener('click', () => {
                setActiveView(viewMap);
                document.getElementById('compare-btn')?.click();
            });

            document.getElementById('home-open-pr')?.addEventListener('click', () => {
                setActiveView(viewMap);
                document.getElementById('pr-analysis-btn')?.click();
            });

            document.getElementById('home-open-equipment')?.addEventListener('click', () => {
                setActiveView(viewMap);
                document.getElementById('equipment-btn')?.click();
            });
        }

        return {
            initAppNavigation
        };
    }

    globalScope.createNavigationView = createNavigationView;
})(window);
