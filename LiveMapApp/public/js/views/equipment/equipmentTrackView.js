(function attachEquipmentTrackViewFactory(globalScope) {
    function createEquipmentTrackView({
        getCurrentProfile,
        getEquipmentItems,
        buildEquipmentUsageMap,
        getTrackEquipmentAssignment,
        getEquipmentMaintenanceStatus,
        formatDashboardNumber,
        saveTrackEquipmentAssignment,
        loadEquipment,
        loadEquipmentAssignments,
        renderHomeView,
        showToast
    }) {
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

        function renderTrackEquipmentCard(container, filename) {
            const currentProfile = getCurrentProfile();
            const equipmentItems = getEquipmentItems(currentProfile);
            const usageByEquipmentId = buildEquipmentUsageMap(currentProfile);
            const assignment = getTrackEquipmentAssignment(currentProfile, filename);
            const selectedEquipmentId = Number(assignment?.equipmentId);
            const selectedEquipment = Number.isFinite(selectedEquipmentId)
                ? equipmentItems.find(item => Number(item.equipmentId) === selectedEquipmentId) || null
                : null;

            container.innerHTML = '';

            const title = document.createElement('div');
            title.className = 'trim-editor-title';
            title.textContent = 'Equipment';

            const hint = document.createElement('p');
            hint.className = 'trim-editor-hint';
            hint.textContent = 'Ordne dem Training dein eingesetztes Equipment zu. Erinnerungen für Service-Intervalle werden pro Profil berechnet.';

            container.appendChild(title);
            container.appendChild(hint);

            if (!equipmentItems.length) {
                const empty = document.createElement('p');
                empty.className = 'placeholder-text';
                empty.textContent = 'Noch kein Equipment angelegt.';

                const openBtn = document.createElement('button');
                openBtn.className = 'action-btn-secondary trim-action-btn';
                openBtn.textContent = 'Equipment verwalten';
                openBtn.onclick = () => document.getElementById('equipment-btn')?.click();

                container.appendChild(empty);
                container.appendChild(openBtn);
                return;
            }

            const field = document.createElement('label');
            field.className = 'activity-note-field activity-note-field--full';

            const fieldLabel = document.createElement('span');
            fieldLabel.className = 'mini-label';
            fieldLabel.textContent = 'Zuweisung';

            const select = document.createElement('select');
            select.className = 'activity-note-select';

            const noneOption = document.createElement('option');
            noneOption.value = '';
            noneOption.textContent = 'Kein Equipment zugewiesen';
            select.appendChild(noneOption);

            equipmentItems
                .slice()
                .sort((left, right) => {
                    const leftActive = left?.isActive ? 1 : 0;
                    const rightActive = right?.isActive ? 1 : 0;
                    if (rightActive !== leftActive) {
                        return rightActive - leftActive;
                    }

                    return String(left?.name || '').localeCompare(String(right?.name || ''), 'de-DE');
                })
                .forEach(item => {
                    const option = document.createElement('option');
                    option.value = String(item.equipmentId);
                    option.textContent = item.isActive ? item.name : `${item.name} (inaktiv)`;
                    if (Number(item.equipmentId) === selectedEquipmentId) {
                        option.selected = true;
                    }
                    select.appendChild(option);
                });

            field.appendChild(fieldLabel);
            field.appendChild(select);
            container.appendChild(field);

            const status = document.createElement('div');
            status.className = 'equipment-track-status';

            if (selectedEquipment) {
                const usageKm = usageByEquipmentId[Number(selectedEquipment.equipmentId)] || 0;
                const maintenanceStatus = getEquipmentMaintenanceStatus(selectedEquipment, usageKm);

                const headline = document.createElement('div');
                headline.className = 'equipment-track-status__headline';
                headline.textContent = `${selectedEquipment.name} · ${formatDashboardNumber(usageKm, 1)} km genutzt`;

                const badge = document.createElement('span');
                badge.className = getEquipmentStatusClass(maintenanceStatus.state);
                badge.textContent = maintenanceStatus.message;

                status.appendChild(headline);
                status.appendChild(badge);
            } else {
                const noAssignment = document.createElement('span');
                noAssignment.className = 'mini-label';
                noAssignment.textContent = 'Für dieses Training ist aktuell kein Equipment hinterlegt.';
                status.appendChild(noAssignment);
            }

            container.appendChild(status);

            const actions = document.createElement('div');
            actions.className = 'trim-editor-actions';

            const manageBtn = document.createElement('button');
            manageBtn.className = 'action-btn-secondary trim-action-btn';
            manageBtn.textContent = 'Equipment verwalten';
            manageBtn.onclick = () => document.getElementById('equipment-btn')?.click();

            actions.appendChild(manageBtn);
            container.appendChild(actions);

            select.onchange = async () => {
                select.disabled = true;
                const selectedValue = select.value;
                const equipmentId = selectedValue === '' ? null : Number(selectedValue);

                try {
                    await saveTrackEquipmentAssignment(currentProfile, filename, equipmentId);
                    await loadEquipmentAssignments(currentProfile, { force: true });
                    renderTrackEquipmentCard(container, filename);
                    renderHomeView();
                    showToast('Equipment-Zuweisung gespeichert.', 'success');
                } catch (error) {
                    console.error(error);
                    showToast(error.message || 'Equipment-Zuweisung konnte nicht gespeichert werden.', 'error');
                    select.disabled = false;
                }
            };
        }

        async function populateTrackEquipmentCard(container, filename) {
            if (!container) {
                return;
            }

            container.dataset.equipmentFilename = filename;
            container.innerHTML = '<div class="trim-editor-title">Equipment</div><p class="trim-editor-hint">Equipment wird geladen ...</p>';

            try {
                const currentProfile = getCurrentProfile();
                await Promise.all([
                    loadEquipment(currentProfile),
                    loadEquipmentAssignments(currentProfile)
                ]);

                if (container.dataset.equipmentFilename !== filename) {
                    return;
                }

                renderTrackEquipmentCard(container, filename);
            } catch (error) {
                console.error(error);
                if (container.dataset.equipmentFilename !== filename) {
                    return;
                }

                container.innerHTML = '<div class="trim-editor-title">Equipment</div><p class="trim-editor-hint">Equipment konnte nicht geladen werden.</p>';
            }
        }

        return {
            populateTrackEquipmentCard
        };
    }

    globalScope.createEquipmentTrackView = createEquipmentTrackView;
})(window);
