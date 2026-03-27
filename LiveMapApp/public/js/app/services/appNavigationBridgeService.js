(function attachAppNavigationBridgeServiceFactory(globalScope) {
    function createAppNavigationBridgeService({
        getViewStateViewApi,
        getNavigationViewApi,
        getModalAccessibilityViewApi,
        getFilterSearchViewApi,
        persistedSelectionService,
        getHomeQuickActionsViewApi,
        getHomeViewApi,
        getHomeTrackNavigationViewApi,
        getActivityNoteViewApi,
        getEquipmentTrackViewApi,
        getUploadViewApi,
        getDeleteAllViewApi
    }) {
        function setActiveView(nextView, { skipPersist = false } = {}) {
            return getViewStateViewApi()?.setActiveView(nextView, { skipPersist });
        }

        function initAppNavigation() {
            return getNavigationViewApi()?.initAppNavigation();
        }

        function openModalWithA11y(modal, { returnFocusEl = null, initialFocusSelector = '.close-btn' } = {}) {
            return getModalAccessibilityViewApi()?.openModalWithA11y(modal, { returnFocusEl, initialFocusSelector });
        }

        function closeModalWithA11y(modal, { skipFocusRestore = false } = {}) {
            return getModalAccessibilityViewApi()?.closeModalWithA11y(modal, { skipFocusRestore });
        }

        function initModalAccessibility() {
            return getModalAccessibilityViewApi()?.initModalAccessibility();
        }

        function initStandardModal({ modalId, triggerId, closeId, initialFocusSelector = '.close-btn', onOpen = null } = {}) {
            return getModalAccessibilityViewApi()?.initStandardModal({
                modalId,
                triggerId,
                closeId,
                initialFocusSelector,
                onOpen
            });
        }

        function initFiltersAndSort() {
            return getFilterSearchViewApi()?.initFiltersAndSort();
        }

        function initSearch() {
            return getFilterSearchViewApi()?.initSearch();
        }

        function initMapFilters() {
            return getFilterSearchViewApi()?.initMapFilters();
        }

        function applyFiltersAndSort() {
            return getFilterSearchViewApi()?.applyFiltersAndSort();
        }

        function applyPersistedUiStateToControls() {
            return persistedSelectionService.applyPersistedUiStateToControls();
        }

        function getPersistedTrackSelection(profile) {
            return persistedSelectionService.getPersistedTrackSelection(profile);
        }

        function setPersistedTrackSelection(profile, filename) {
            return persistedSelectionService.setPersistedTrackSelection(profile, filename);
        }

        async function restorePersistedTrackSelection(profile) {
            return persistedSelectionService.restorePersistedTrackSelection(profile);
        }

        function bindHomeQuickActions(homeView) {
            return getHomeQuickActionsViewApi()?.bindHomeQuickActions(homeView);
        }

        function renderHomeView() {
            return getHomeViewApi()?.renderHomeView();
        }

        async function populateActivityNoteCard(container, filename) {
            return getActivityNoteViewApi()?.populateActivityNoteCard(container, filename);
        }

        async function populateTrackEquipmentCard(container, filename) {
            return getEquipmentTrackViewApi()?.populateTrackEquipmentCard(container, filename);
        }

        function clearTrackFilters() {
            return getHomeTrackNavigationViewApi()?.clearTrackFilters();
        }

        async function openTrackFromHome(filename) {
            return getHomeTrackNavigationViewApi()?.openTrackFromHome(filename);
        }

        function initDragAndDrop() {
            return getUploadViewApi()?.initDragAndDrop();
        }

        async function handleFileUpload(files) {
            return getUploadViewApi()?.handleFileUpload(files);
        }

        async function resolveDuplicateConflict(profile, pendingId, action) {
            return getUploadViewApi()?.resolveDuplicateConflict(profile, pendingId, action);
        }

        function showDuplicateModal(conflict) {
            return getUploadViewApi()?.showDuplicateModal(conflict);
        }

        function initDeleteAll() {
            return getDeleteAllViewApi()?.initDeleteAll();
        }

        function toggleDeleteAllButton(show) {
            return getDeleteAllViewApi()?.toggleDeleteAllButton(show);
        }

        return {
            setActiveView,
            initAppNavigation,
            openModalWithA11y,
            closeModalWithA11y,
            initModalAccessibility,
            initStandardModal,
            initFiltersAndSort,
            initSearch,
            initMapFilters,
            applyFiltersAndSort,
            applyPersistedUiStateToControls,
            getPersistedTrackSelection,
            setPersistedTrackSelection,
            restorePersistedTrackSelection,
            bindHomeQuickActions,
            renderHomeView,
            populateActivityNoteCard,
            populateTrackEquipmentCard,
            clearTrackFilters,
            openTrackFromHome,
            initDragAndDrop,
            handleFileUpload,
            resolveDuplicateConflict,
            showDuplicateModal,
            initDeleteAll,
            toggleDeleteAllButton
        };
    }

    globalScope.createAppNavigationBridgeService = createAppNavigationBridgeService;
})(window);
