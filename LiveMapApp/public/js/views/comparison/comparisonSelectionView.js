(function attachComparisonSelectionViewFactory(globalScope) {
    function createComparisonSelectionView({
        getCurrentProfile,
        getTracksByProfile,
        getCompareSelection,
        setCompareSelection
    }) {
        function ensureComparisonSelection() {
            const currentProfile = getCurrentProfile();
            const files = getTracksByProfile()?.[currentProfile] || [];
            const compareSelection = getCompareSelection();

            if (compareSelection.profile !== currentProfile) {
                setCompareSelection({
                    profile: currentProfile,
                    leftFilename: files[0] || null,
                    rightFilename: files[1] || files[0] || null
                });
                return files;
            }

            if (!files.includes(compareSelection.leftFilename)) {
                compareSelection.leftFilename = files[0] || null;
            }
            if (!files.includes(compareSelection.rightFilename) || compareSelection.rightFilename === compareSelection.leftFilename) {
                compareSelection.rightFilename = files.find(file => file !== compareSelection.leftFilename) || files[0] || null;
            }

            return files;
        }

        return {
            ensureComparisonSelection
        };
    }

    globalScope.createComparisonSelectionView = createComparisonSelectionView;
})(window);
