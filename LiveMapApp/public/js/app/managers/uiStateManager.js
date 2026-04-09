(function attachUiStateManagerFactory(globalScope) {
    function createUiStateManager({
        initialCurrentView = 'home',
        initialStartupIntroDismissed = false,
        initialDashboardScope = 'profile',
        initialSearchTerm = '',
        initialActiveFilters = []
    } = {}) {
        let currentView = typeof initialCurrentView === 'string' && initialCurrentView ? initialCurrentView : 'home';
        let startupIntroDismissed = initialStartupIntroDismissed === true;
        let dashboardScope = initialDashboardScope === 'all' ? 'all' : 'profile';
        let currentSearchTerm = typeof initialSearchTerm === 'string' ? initialSearchTerm : '';
        let activeFilters = new Set(Array.isArray(initialActiveFilters) ? initialActiveFilters : []);

        function getCurrentView() {
            return currentView;
        }

        function setCurrentView(nextView) {
            if (typeof nextView === 'string' && nextView) {
                currentView = nextView;
            }
            return currentView;
        }

        function getStartupIntroDismissed() {
            return startupIntroDismissed;
        }

        function setStartupIntroDismissed(nextValue) {
            startupIntroDismissed = nextValue === true;
            return startupIntroDismissed;
        }

        function getDashboardScope() {
            return dashboardScope;
        }

        function setDashboardScope(nextScope) {
            dashboardScope = nextScope === 'all' ? 'all' : 'profile';
            return dashboardScope;
        }

        function getCurrentSearchTerm() {
            return currentSearchTerm;
        }

        function setCurrentSearchTerm(nextTerm) {
            currentSearchTerm = String(nextTerm || '').toLowerCase();
            return currentSearchTerm;
        }

        function getActiveFilters() {
            return activeFilters;
        }

        function replaceActiveFilters(nextFilters) {
            activeFilters = new Set(Array.isArray(nextFilters) ? nextFilters : []);
            return activeFilters;
        }

        return {
            getCurrentView,
            setCurrentView,
            getStartupIntroDismissed,
            setStartupIntroDismissed,
            getDashboardScope,
            setDashboardScope,
            getCurrentSearchTerm,
            setCurrentSearchTerm,
            getActiveFilters,
            replaceActiveFilters
        };
    }

    globalScope.createUiStateManager = createUiStateManager;
})(window);
