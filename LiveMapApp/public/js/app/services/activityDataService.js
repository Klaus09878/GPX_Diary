(function attachActivityDataServiceFactory(globalScope) {
    function createActivityDataService({
        apiBase,
        getCurrentProfile,
        getState,
        onCurrentProfileNotesLoaded
    }) {
        function getActivityNoteSummary(profile, filename) {
            return getState().activityNoteSummariesByProfile[profile]?.[filename] || null;
        }

        function updateActivityNoteSummary(profile, note) {
            if (!profile || !note?.filename) {
                return;
            }

            const state = getState();
            if (!state.activityNoteSummariesByProfile[profile]) {
                state.activityNoteSummariesByProfile[profile] = {};
            }

            state.activityNoteSummariesByProfile[profile][note.filename] = note;
        }

        function setActivityNoteSummaries(profile, notes) {
            const next = {};
            (Array.isArray(notes) ? notes : []).forEach(note => {
                if (note?.filename) {
                    next[note.filename] = note;
                }
            });

            getState().activityNoteSummariesByProfile[profile] = next;
        }

        async function loadActivityNoteSummaries(profile = getCurrentProfile(), { force = false } = {}) {
            if (!profile) {
                return {};
            }

            const state = getState();
            if (!force && state.activityNoteSummariesByProfile[profile]) {
                return state.activityNoteSummariesByProfile[profile];
            }

            if (!force && state.activityNoteLoadPromises[profile]) {
                return state.activityNoteLoadPromises[profile];
            }

            const request = fetch(`${apiBase}/activities/${encodeURIComponent(profile)}/notes`)
                .then(async response => {
                    const data = await response.json().catch(() => ([]));
                    if (!response.ok) {
                        throw new Error(data.error || 'Aktivitäts-Notizen konnten nicht geladen werden.');
                    }

                    setActivityNoteSummaries(profile, data);
                    if (typeof onCurrentProfileNotesLoaded === 'function') {
                        onCurrentProfileNotesLoaded(profile);
                    }

                    return getState().activityNoteSummariesByProfile[profile];
                })
                .finally(() => {
                    delete getState().activityNoteLoadPromises[profile];
                });

            state.activityNoteLoadPromises[profile] = request;
            return request;
        }

        async function fetchActivityNote(profile, filename) {
            const requestKey = `${profile}::${filename}`;
            const state = getState();
            if (state.activityNoteByTrackPromises[requestKey]) {
                return state.activityNoteByTrackPromises[requestKey];
            }

            const request = fetch(`${apiBase}/activities/${encodeURIComponent(profile)}/${encodeURIComponent(filename)}/note`)
                .then(async response => {
                    const data = await response.json().catch(() => ({}));
                    if (!response.ok) {
                        throw new Error(data.error || 'Aktivitäts-Notiz konnte nicht geladen werden.');
                    }

                    updateActivityNoteSummary(profile, data);
                    return data;
                })
                .finally(() => {
                    delete getState().activityNoteByTrackPromises[requestKey];
                });

            state.activityNoteByTrackPromises[requestKey] = request;
            return request;
        }

        async function saveActivityNote(filename, payload) {
            const profile = getCurrentProfile();
            const response = await fetch(`${apiBase}/activities/${encodeURIComponent(profile)}/${encodeURIComponent(filename)}/note`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const data = await response.json().catch(() => ({}));
            if (!response.ok) {
                throw new Error(data.error || 'Aktivitäts-Notiz konnte nicht gespeichert werden.');
            }

            updateActivityNoteSummary(profile, data);
            return data;
        }

        function getSegmentFavorites(profile = getCurrentProfile()) {
            const favorites = getState().segmentFavoritesByProfile[profile];
            return Array.isArray(favorites) ? favorites : [];
        }

        function setSegmentFavorites(profile, favorites) {
            const state = getState();
            state.segmentFavoritesByProfile[profile] = Array.isArray(favorites) ? [...favorites] : [];
            return state.segmentFavoritesByProfile[profile];
        }

        function upsertSegmentFavoriteInCache(profile, favorite) {
            if (!profile || !favorite || !Number.isFinite(Number(favorite.favoriteId))) {
                return getSegmentFavorites(profile);
            }

            const current = [...getSegmentFavorites(profile)];
            const favoriteId = Number(favorite.favoriteId);
            const existingIndex = current.findIndex(item => Number(item.favoriteId) === favoriteId);

            if (existingIndex >= 0) {
                current[existingIndex] = favorite;
            } else {
                current.unshift(favorite);
            }

            setSegmentFavorites(profile, current);
            return getState().segmentFavoritesByProfile[profile];
        }

        function removeSegmentFavoriteFromCache(profile, favoriteId) {
            const normalizedId = Number(favoriteId);
            if (!Number.isFinite(normalizedId)) {
                return getSegmentFavorites(profile);
            }

            const next = getSegmentFavorites(profile).filter(item => Number(item.favoriteId) !== normalizedId);
            setSegmentFavorites(profile, next);
            return next;
        }

        function getSegmentFavoriteDraft(profile = getCurrentProfile()) {
            const draft = getState().segmentFavoriteDraftByProfile[profile];
            return draft && typeof draft === 'object' ? { ...draft } : null;
        }

        function setSegmentFavoriteDraft(profile, draft) {
            if (!profile) {
                return;
            }

            const state = getState();
            if (!draft || typeof draft !== 'object') {
                delete state.segmentFavoriteDraftByProfile[profile];
                return;
            }

            state.segmentFavoriteDraftByProfile[profile] = { ...draft };
        }

        function clearSegmentFavoriteDraft(profile = getCurrentProfile()) {
            if (!profile) {
                return;
            }

            delete getState().segmentFavoriteDraftByProfile[profile];
        }

        async function loadSegmentFavorites(profile = getCurrentProfile(), { force = false } = {}) {
            if (!profile) {
                return [];
            }

            const state = getState();
            if (!force && Array.isArray(state.segmentFavoritesByProfile[profile])) {
                return getSegmentFavorites(profile);
            }

            if (!force && state.segmentFavoriteLoadPromises[profile]) {
                return state.segmentFavoriteLoadPromises[profile];
            }

            const request = fetch(`${apiBase}/segments/${encodeURIComponent(profile)}/favorites`)
                .then(async response => {
                    const data = await response.json().catch(() => ([]));
                    if (!response.ok) {
                        throw new Error(data.error || 'Segment-Favoriten konnten nicht geladen werden.');
                    }

                    return setSegmentFavorites(profile, data);
                })
                .finally(() => {
                    delete getState().segmentFavoriteLoadPromises[profile];
                });

            state.segmentFavoriteLoadPromises[profile] = request;
            return request;
        }

        async function createSegmentFavorite(profile, payload) {
            const response = await fetch(`${apiBase}/segments/${encodeURIComponent(profile)}/favorites`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload || {})
            });

            const data = await response.json().catch(() => ({}));
            if (!response.ok) {
                throw new Error(data.error || 'Segment-Favorit konnte nicht gespeichert werden.');
            }

            upsertSegmentFavoriteInCache(profile, data);
            return data;
        }

        async function updateSegmentFavorite(profile, favoriteId, payload) {
            const response = await fetch(`${apiBase}/segments/${encodeURIComponent(profile)}/favorites/${encodeURIComponent(String(favoriteId))}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload || {})
            });

            const data = await response.json().catch(() => ({}));
            if (!response.ok) {
                throw new Error(data.error || 'Segment-Favorit konnte nicht aktualisiert werden.');
            }

            upsertSegmentFavoriteInCache(profile, data);
            return data;
        }

        async function deleteSegmentFavorite(profile, favoriteId) {
            const response = await fetch(`${apiBase}/segments/${encodeURIComponent(profile)}/favorites/${encodeURIComponent(String(favoriteId))}`, {
                method: 'DELETE'
            });

            const data = await response.json().catch(() => ({}));
            if (!response.ok) {
                throw new Error(data.error || 'Segment-Favorit konnte nicht gelöscht werden.');
            }

            removeSegmentFavoriteFromCache(profile, favoriteId);
            return data;
        }

        function getEquipmentItems(profile = getCurrentProfile()) {
            const equipment = getState().equipmentByProfile[profile];
            return Array.isArray(equipment) ? equipment : [];
        }

        function setEquipmentItems(profile, items) {
            const state = getState();
            state.equipmentByProfile[profile] = Array.isArray(items) ? [...items] : [];
            return state.equipmentByProfile[profile];
        }

        function getEquipmentEditorDraft(profile = getCurrentProfile()) {
            const draft = getState().equipmentEditorDraftByProfile[profile];
            return draft && typeof draft === 'object' ? { ...draft } : null;
        }

        function setEquipmentEditorDraft(profile, draft) {
            if (!profile) {
                return;
            }

            const state = getState();
            if (!draft || typeof draft !== 'object') {
                delete state.equipmentEditorDraftByProfile[profile];
                return;
            }

            state.equipmentEditorDraftByProfile[profile] = { ...draft };
        }

        function clearEquipmentEditorDraft(profile = getCurrentProfile()) {
            if (!profile) {
                return;
            }

            delete getState().equipmentEditorDraftByProfile[profile];
        }

        function getEquipmentAssignmentMap(profile = getCurrentProfile()) {
            const mapByProfile = getState().equipmentAssignmentsByProfile[profile];
            return mapByProfile && typeof mapByProfile === 'object' ? mapByProfile : {};
        }

        function setEquipmentAssignments(profile, assignments) {
            const next = {};
            (Array.isArray(assignments) ? assignments : []).forEach(assignment => {
                if (!assignment?.filename) {
                    return;
                }

                if (Number.isFinite(Number(assignment.equipmentId))) {
                    next[assignment.filename] = {
                        filename: assignment.filename,
                        equipmentId: Number(assignment.equipmentId),
                        equipmentName: typeof assignment.equipmentName === 'string' ? assignment.equipmentName : '',
                        assignedAt: Number(assignment.assignedAt || 0) || 0
                    };
                }
            });

            const state = getState();
            state.equipmentAssignmentsByProfile[profile] = next;
            return state.equipmentAssignmentsByProfile[profile];
        }

        function upsertEquipmentAssignment(profile, assignment) {
            if (!profile || !assignment?.filename) {
                return getEquipmentAssignmentMap(profile);
            }

            const next = { ...getEquipmentAssignmentMap(profile) };
            if (!Number.isFinite(Number(assignment.equipmentId))) {
                delete next[assignment.filename];
            } else {
                next[assignment.filename] = {
                    filename: assignment.filename,
                    equipmentId: Number(assignment.equipmentId),
                    equipmentName: typeof assignment.equipmentName === 'string' ? assignment.equipmentName : '',
                    assignedAt: Number(assignment.assignedAt || 0) || 0
                };
            }

            getState().equipmentAssignmentsByProfile[profile] = next;
            return next;
        }

        function getTrackEquipmentAssignment(profile, filename) {
            return getEquipmentAssignmentMap(profile)[filename] || null;
        }

        async function loadEquipment(profile = getCurrentProfile(), { force = false } = {}) {
            if (!profile) {
                return [];
            }

            const state = getState();
            if (!force && Array.isArray(state.equipmentByProfile[profile])) {
                return getEquipmentItems(profile);
            }

            if (!force && state.equipmentLoadPromises[profile]) {
                return state.equipmentLoadPromises[profile];
            }

            const request = fetch(`${apiBase}/equipment/${encodeURIComponent(profile)}`)
                .then(async response => {
                    const data = await response.json().catch(() => ([]));
                    if (!response.ok) {
                        throw new Error(data.error || 'Equipment konnte nicht geladen werden.');
                    }

                    return setEquipmentItems(profile, data);
                })
                .finally(() => {
                    delete getState().equipmentLoadPromises[profile];
                });

            state.equipmentLoadPromises[profile] = request;
            return request;
        }

        async function loadEquipmentAssignments(profile = getCurrentProfile(), { force = false } = {}) {
            if (!profile) {
                return {};
            }

            const state = getState();
            if (!force && state.equipmentAssignmentsByProfile[profile]) {
                return getEquipmentAssignmentMap(profile);
            }

            if (!force && state.equipmentAssignmentsLoadPromises[profile]) {
                return state.equipmentAssignmentsLoadPromises[profile];
            }

            const request = fetch(`${apiBase}/equipment/${encodeURIComponent(profile)}/assignments`)
                .then(async response => {
                    const data = await response.json().catch(() => ([]));
                    if (!response.ok) {
                        throw new Error(data.error || 'Equipment-Zuweisungen konnten nicht geladen werden.');
                    }

                    return setEquipmentAssignments(profile, data);
                })
                .finally(() => {
                    delete getState().equipmentAssignmentsLoadPromises[profile];
                });

            state.equipmentAssignmentsLoadPromises[profile] = request;
            return request;
        }

        async function createEquipment(profile, payload) {
            const response = await fetch(`${apiBase}/equipment/${encodeURIComponent(profile)}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload || {})
            });

            const data = await response.json().catch(() => ({}));
            if (!response.ok) {
                throw new Error(data.error || 'Equipment konnte nicht gespeichert werden.');
            }

            const current = getEquipmentItems(profile);
            setEquipmentItems(profile, [data, ...current.filter(item => Number(item.equipmentId) !== Number(data.equipmentId))]);
            return data;
        }

        async function updateEquipment(profile, equipmentId, payload) {
            const response = await fetch(`${apiBase}/equipment/${encodeURIComponent(profile)}/${encodeURIComponent(String(equipmentId))}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload || {})
            });

            const data = await response.json().catch(() => ({}));
            if (!response.ok) {
                throw new Error(data.error || 'Equipment konnte nicht aktualisiert werden.');
            }

            const next = getEquipmentItems(profile).map(item => (
                Number(item.equipmentId) === Number(data.equipmentId) ? data : item
            ));
            setEquipmentItems(profile, next);
            return data;
        }

        async function deleteEquipment(profile, equipmentId) {
            const response = await fetch(`${apiBase}/equipment/${encodeURIComponent(profile)}/${encodeURIComponent(String(equipmentId))}`, {
                method: 'DELETE'
            });

            const data = await response.json().catch(() => ({}));
            if (!response.ok) {
                throw new Error(data.error || 'Equipment konnte nicht gelöscht werden.');
            }

            setEquipmentItems(profile, getEquipmentItems(profile).filter(item => Number(item.equipmentId) !== Number(equipmentId)));
            const nextAssignments = { ...getEquipmentAssignmentMap(profile) };
            Object.keys(nextAssignments).forEach(filename => {
                if (Number(nextAssignments[filename]?.equipmentId) === Number(equipmentId)) {
                    delete nextAssignments[filename];
                }
            });
            getState().equipmentAssignmentsByProfile[profile] = nextAssignments;

            return data;
        }

        async function saveTrackEquipmentAssignment(profile, filename, equipmentId) {
            const response = await fetch(`${apiBase}/equipment/${encodeURIComponent(profile)}/${encodeURIComponent(filename)}/assignment`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ equipmentId })
            });

            const data = await response.json().catch(() => ({}));
            if (!response.ok) {
                throw new Error(data.error || 'Equipment-Zuweisung konnte nicht gespeichert werden.');
            }

            upsertEquipmentAssignment(profile, data);
            return data;
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
            saveTrackEquipmentAssignment
        };
    }

    globalScope.createActivityDataService = createActivityDataService;
})(window);
