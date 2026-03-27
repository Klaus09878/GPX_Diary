(function(global) {
    function createEquipmentDataBridgeService(deps) {
        const {
            activityDataService,
            getEquipmentViewApi,
            segmentFavoriteHelperService,
            equipmentMaintenanceService
        } = deps;

        function getActivityNoteSummary(profile, filename) {
            return activityDataService.getActivityNoteSummary(profile, filename);
        }

        function updateActivityNoteSummary(profile, note) {
            return activityDataService.updateActivityNoteSummary(profile, note);
        }

        function setActivityNoteSummaries(profile, notes) {
            return activityDataService.setActivityNoteSummaries(profile, notes);
        }

        async function loadActivityNoteSummaries(profile, { force = false } = {}) {
            return activityDataService.loadActivityNoteSummaries(profile, { force });
        }

        async function fetchActivityNote(profile, filename) {
            return activityDataService.fetchActivityNote(profile, filename);
        }

        async function saveActivityNote(filename, payload) {
            return activityDataService.saveActivityNote(filename, payload);
        }

        function getSegmentFavorites(profile) {
            return activityDataService.getSegmentFavorites(profile);
        }

        function setSegmentFavorites(profile, favorites) {
            return activityDataService.setSegmentFavorites(profile, favorites);
        }

        function upsertSegmentFavoriteInCache(profile, favorite) {
            return activityDataService.upsertSegmentFavoriteInCache(profile, favorite);
        }

        function removeSegmentFavoriteFromCache(profile, favoriteId) {
            return activityDataService.removeSegmentFavoriteFromCache(profile, favoriteId);
        }

        function getSegmentFavoriteDraft(profile) {
            return activityDataService.getSegmentFavoriteDraft(profile);
        }

        function setSegmentFavoriteDraft(profile, draft) {
            return activityDataService.setSegmentFavoriteDraft(profile, draft);
        }

        function clearSegmentFavoriteDraft(profile) {
            return activityDataService.clearSegmentFavoriteDraft(profile);
        }

        async function loadSegmentFavorites(profile, { force = false } = {}) {
            return activityDataService.loadSegmentFavorites(profile, { force });
        }

        async function createSegmentFavorite(profile, payload) {
            return activityDataService.createSegmentFavorite(profile, payload);
        }

        async function updateSegmentFavorite(profile, favoriteId, payload) {
            return activityDataService.updateSegmentFavorite(profile, favoriteId, payload);
        }

        async function deleteSegmentFavorite(profile, favoriteId) {
            return activityDataService.deleteSegmentFavorite(profile, favoriteId);
        }

        function buildSegmentFavoriteKey(filename, startIndex, endIndex) {
            return segmentFavoriteHelperService.buildSegmentFavoriteKey(filename, startIndex, endIndex);
        }

        function getSegmentFavoriteLabel(favorite, fallbackIndex) {
            return segmentFavoriteHelperService.getSegmentFavoriteLabel(favorite, fallbackIndex);
        }

        function formatSegmentPointRange(startIndex, endIndex) {
            return segmentFavoriteHelperService.formatSegmentPointRange(startIndex, endIndex);
        }

        function getSegmentFavoriteRangeInfo(entry, favorite) {
            return segmentFavoriteHelperService.getSegmentFavoriteRangeInfo(entry, favorite);
        }

        function getTrackDistanceKm(profile, filename) {
            return equipmentMaintenanceService.getTrackDistanceKm(profile, filename);
        }

        function buildEquipmentUsageMap(profile) {
            return equipmentMaintenanceService.buildEquipmentUsageMap(profile);
        }

        function getEquipmentMaintenanceStatus(equipment, usageKm) {
            return equipmentMaintenanceService.getEquipmentMaintenanceStatus(equipment, usageKm);
        }

        function getEquipmentStatusClass(statusState) {
            return equipmentMaintenanceService.getEquipmentStatusClass(statusState);
        }

        function getEquipmentReminderSummary(profile) {
            return equipmentMaintenanceService.getEquipmentReminderSummary(profile);
        }

        function getEquipmentItems(profile) {
            return activityDataService.getEquipmentItems(profile);
        }

        function setEquipmentItems(profile, items) {
            return activityDataService.setEquipmentItems(profile, items);
        }

        function getEquipmentEditorDraft(profile) {
            return activityDataService.getEquipmentEditorDraft(profile);
        }

        function setEquipmentEditorDraft(profile, draft) {
            return activityDataService.setEquipmentEditorDraft(profile, draft);
        }

        function clearEquipmentEditorDraft(profile) {
            return activityDataService.clearEquipmentEditorDraft(profile);
        }

        function getEquipmentAssignmentMap(profile) {
            return activityDataService.getEquipmentAssignmentMap(profile);
        }

        function setEquipmentAssignments(profile, assignments) {
            return activityDataService.setEquipmentAssignments(profile, assignments);
        }

        function upsertEquipmentAssignment(profile, assignment) {
            return activityDataService.upsertEquipmentAssignment(profile, assignment);
        }

        function getTrackEquipmentAssignment(profile, filename) {
            return activityDataService.getTrackEquipmentAssignment(profile, filename);
        }

        async function loadEquipment(profile, { force = false } = {}) {
            return activityDataService.loadEquipment(profile, { force });
        }

        async function loadEquipmentAssignments(profile, { force = false } = {}) {
            return activityDataService.loadEquipmentAssignments(profile, { force });
        }

        async function createEquipment(profile, payload) {
            return activityDataService.createEquipment(profile, payload);
        }

        async function updateEquipment(profile, equipmentId, payload) {
            return activityDataService.updateEquipment(profile, equipmentId, payload);
        }

        async function deleteEquipment(profile, equipmentId) {
            return activityDataService.deleteEquipment(profile, equipmentId);
        }

        async function saveTrackEquipmentAssignment(profile, filename, equipmentId) {
            return activityDataService.saveTrackEquipmentAssignment(profile, filename, equipmentId);
        }

        async function renderEquipmentModal(options) {
            return getEquipmentViewApi()?.renderEquipmentModal(options);
        }

        function initEquipmentModal() {
            return getEquipmentViewApi()?.initEquipmentModal();
        }

        return {
            getActivityNoteSummary,
            updateActivityNoteSummary,
            setActivityNoteSummaries,
            loadActivityNoteSummaries,
            fetchActivityNote,
            saveActivityNote,
            getSegmentFavorites,
            setSegmentFavorites,
            upsertSegmentFavoriteInCache,
            removeSegmentFavoriteFromCache,
            getSegmentFavoriteDraft,
            setSegmentFavoriteDraft,
            clearSegmentFavoriteDraft,
            loadSegmentFavorites,
            createSegmentFavorite,
            updateSegmentFavorite,
            deleteSegmentFavorite,
            buildSegmentFavoriteKey,
            getSegmentFavoriteLabel,
            formatSegmentPointRange,
            getSegmentFavoriteRangeInfo,
            getEquipmentItems,
            setEquipmentItems,
            getEquipmentEditorDraft,
            setEquipmentEditorDraft,
            clearEquipmentEditorDraft,
            getEquipmentAssignmentMap,
            setEquipmentAssignments,
            upsertEquipmentAssignment,
            getTrackEquipmentAssignment,
            loadEquipment,
            loadEquipmentAssignments,
            createEquipment,
            updateEquipment,
            deleteEquipment,
            saveTrackEquipmentAssignment,
            getTrackDistanceKm,
            buildEquipmentUsageMap,
            getEquipmentMaintenanceStatus,
            getEquipmentStatusClass,
            getEquipmentReminderSummary,
            renderEquipmentModal,
            initEquipmentModal
        };
    }

    global.createEquipmentDataBridgeService = createEquipmentDataBridgeService;
})(window);
