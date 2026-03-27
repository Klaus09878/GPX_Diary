(function attachEquipmentMaintenanceServiceFactory(globalScope) {
    function createEquipmentMaintenanceService({
        getCurrentProfile,
        getCachedTrack,
        getEquipmentAssignmentMap,
        getEquipmentItems,
        formatDashboardNumber
    }) {
        function getTrackDistanceKm(profile, filename) {
            const cached = getCachedTrack(profile, filename);
            const distanceMeters = Number(cached?.stats?.distance) || 0;
            return distanceMeters > 0 ? distanceMeters / 1000 : 0;
        }

        function buildEquipmentUsageMap(profile = getCurrentProfile()) {
            const usageByEquipmentId = {};
            const assignments = getEquipmentAssignmentMap(profile);

            Object.entries(assignments).forEach(([filename, assignment]) => {
                const equipmentId = Number(assignment?.equipmentId);
                if (!Number.isFinite(equipmentId)) {
                    return;
                }

                const distanceKm = getTrackDistanceKm(profile, filename);
                usageByEquipmentId[equipmentId] = (usageByEquipmentId[equipmentId] || 0) + distanceKm;
            });

            return usageByEquipmentId;
        }

        function getEquipmentMaintenanceStatus(equipment, usageKm) {
            const normalizedUsageKm = Number.isFinite(Number(usageKm)) ? Math.max(0, Number(usageKm)) : 0;
            const intervalKm = Number(equipment?.serviceIntervalKm);
            const warnKm = Math.max(0, Number(equipment?.serviceWarnKm) || 0);
            const serviceStartKm = Math.max(0, Number(equipment?.serviceStartKm) || 0);
            const sinceServiceKm = Math.max(0, normalizedUsageKm - serviceStartKm);

            if (!Number.isFinite(intervalKm) || intervalKm <= 0) {
                return {
                    state: 'none',
                    usageKm: normalizedUsageKm,
                    sinceServiceKm,
                    intervalKm: null,
                    remainingKm: null,
                    message: 'Kein Service-Intervall gesetzt'
                };
            }

            const remainingKm = intervalKm - sinceServiceKm;
            if (remainingKm <= 0) {
                return {
                    state: 'due',
                    usageKm: normalizedUsageKm,
                    sinceServiceKm,
                    intervalKm,
                    remainingKm,
                    message: `Überfällig seit ${formatDashboardNumber(Math.abs(remainingKm), 1)} km`
                };
            }

            if (remainingKm <= warnKm) {
                return {
                    state: 'warning',
                    usageKm: normalizedUsageKm,
                    sinceServiceKm,
                    intervalKm,
                    remainingKm,
                    message: `Service bald fällig (${formatDashboardNumber(remainingKm, 1)} km verbleibend)`
                };
            }

            return {
                state: 'ok',
                usageKm: normalizedUsageKm,
                sinceServiceKm,
                intervalKm,
                remainingKm,
                message: `${formatDashboardNumber(remainingKm, 1)} km bis Service`
            };
        }

        function getEquipmentStatusClass(statusState) {
            if (statusState === 'due') {
                return 'equipment-status equipment-status--due';
            }

            if (statusState === 'warning') {
                return 'equipment-status equipment-status--warning';
            }

            if (statusState === 'ok') {
                return 'equipment-status equipment-status--ok';
            }

            return 'equipment-status';
        }

        function getEquipmentReminderSummary(profile = getCurrentProfile()) {
            const equipment = getEquipmentItems(profile);
            const usageByEquipmentId = buildEquipmentUsageMap(profile);

            let dueCount = 0;
            let warningCount = 0;

            equipment.forEach(item => {
                if (!item?.isActive) {
                    return;
                }

                const usageKm = usageByEquipmentId[Number(item.equipmentId)] || 0;
                const status = getEquipmentMaintenanceStatus(item, usageKm);
                if (status.state === 'due') {
                    dueCount += 1;
                } else if (status.state === 'warning') {
                    warningCount += 1;
                }
            });

            return {
                dueCount,
                warningCount,
                totalActive: equipment.filter(item => item?.isActive).length
            };
        }

        return {
            getTrackDistanceKm,
            buildEquipmentUsageMap,
            getEquipmentMaintenanceStatus,
            getEquipmentStatusClass,
            getEquipmentReminderSummary
        };
    }

    globalScope.createEquipmentMaintenanceService = createEquipmentMaintenanceService;
})(window);
