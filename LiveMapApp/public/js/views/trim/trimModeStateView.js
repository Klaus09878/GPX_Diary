(function attachTrimModeStateViewFactory(globalScope) {
    function createTrimModeStateView({
        getTrimSelection
    }) {
        function isTrimModeFor(profile, filename) {
            const trimSelection = getTrimSelection();
            return Boolean(trimSelection && trimSelection.profile === profile && trimSelection.filename === filename);
        }

        return {
            isTrimModeFor
        };
    }

    globalScope.createTrimModeStateView = createTrimModeStateView;
})(window);
