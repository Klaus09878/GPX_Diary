(function attachEquipmentViewFactory(globalScope) {
    function createEquipmentView({
        initStandardModal,
        getCurrentProfile,
        getCurrentProfileLabel,
        getEquipmentEditorDraft,
        clearEquipmentEditorDraft,
        setEquipmentEditorDraft,
        updateEquipment,
        createEquipment,
        deleteEquipment,
        loadEquipment,
        loadEquipmentAssignments,
        renderHomeView,
        showToast,
        buildEquipmentUsageMap,
        getEquipmentAssignmentMap,
        getEquipmentMaintenanceStatus,
        getEquipmentStatusClass,
        formatDashboardNumber,
        getEquipmentReminderSummary,
        getEquipmentItems
    }) {
        let equipmentRenderRequestId = 0;

        function parseEquipmentDistanceInput(value, { allowNull = false, defaultValue = 0, label = 'Wert' } = {}) {
            const raw = String(value ?? '').trim().replace(',', '.');
            if (!raw) {
                return allowNull ? null : defaultValue;
            }

            const parsed = Number(raw);
            if (!Number.isFinite(parsed) || parsed < 0) {
                throw new Error(`${label} ist ungültig.`);
            }

            return parsed;
        }

        function buildEquipmentPayloadFromItem(item, overrides = {}) {
            return {
                name: String(item?.name || ''),
                category: String(item?.category || ''),
                notes: String(item?.notes || ''),
                serviceIntervalKm: item?.serviceIntervalKm === null || item?.serviceIntervalKm === undefined
                    ? null
                    : Number(item.serviceIntervalKm),
                serviceWarnKm: Number(item?.serviceWarnKm || 0) || 0,
                serviceStartKm: Number(item?.serviceStartKm || 0) || 0,
                isActive: Boolean(item?.isActive),
                ...overrides
            };
        }

        function createEquipmentSummaryCard(label, value, hint) {
            const card = document.createElement('article');
            card.className = 'equipment-summary-card';

            const labelNode = document.createElement('span');
            labelNode.className = 'mini-label';
            labelNode.textContent = label;

            const valueNode = document.createElement('strong');
            valueNode.className = 'equipment-summary-card__value';
            valueNode.textContent = value;

            const hintNode = document.createElement('span');
            hintNode.className = 'equipment-summary-card__hint';
            hintNode.textContent = hint;

            card.appendChild(labelNode);
            card.appendChild(valueNode);
            card.appendChild(hintNode);

            return card;
        }

        function createEquipmentActionButton(label, onClick) {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'action-btn-secondary pr-action-btn';
            button.textContent = label;
            button.onclick = onClick;
            return button;
        }

        function createEquipmentEditorCard() {
            const currentProfile = getCurrentProfile();
            const draft = getEquipmentEditorDraft(currentProfile);
            const draftEquipmentId = Number(draft?.equipmentId);
            const isEditing = Number.isFinite(draftEquipmentId) && draftEquipmentId > 0;

            const card = document.createElement('form');
            card.className = 'trim-editor-card equipment-editor-card';

            const title = document.createElement('h4');
            title.className = 'trim-editor-title';
            title.textContent = isEditing ? 'Equipment bearbeiten' : 'Equipment hinzufügen';

            const hint = document.createElement('p');
            hint.className = 'trim-editor-hint';
            hint.textContent = 'Service-Erinnerungen basieren auf der zugewiesenen Trainings-Distanz innerhalb des aktiven Profils.';

            const grid = document.createElement('div');
            grid.className = 'activity-note-grid equipment-editor-grid';

            const nameField = document.createElement('label');
            nameField.className = 'activity-note-field';
            const nameLabel = document.createElement('span');
            nameLabel.className = 'mini-label';
            nameLabel.textContent = 'Name';
            const nameInput = document.createElement('input');
            nameInput.type = 'text';
            nameInput.maxLength = 100;
            nameInput.className = 'activity-note-select';
            nameInput.placeholder = 'z. B. Laufschuhe Daily Trainer';
            nameInput.required = true;
            nameInput.value = typeof draft?.name === 'string' ? draft.name : '';
            nameField.appendChild(nameLabel);
            nameField.appendChild(nameInput);

            const categoryField = document.createElement('label');
            categoryField.className = 'activity-note-field';
            const categoryLabel = document.createElement('span');
            categoryLabel.className = 'mini-label';
            categoryLabel.textContent = 'Kategorie';
            const categoryInput = document.createElement('input');
            categoryInput.type = 'text';
            categoryInput.maxLength = 80;
            categoryInput.className = 'activity-note-select';
            categoryInput.placeholder = 'z. B. Schuhe, Reifen, Kette';
            categoryInput.value = typeof draft?.category === 'string' ? draft.category : '';
            categoryField.appendChild(categoryLabel);
            categoryField.appendChild(categoryInput);

            const intervalField = document.createElement('label');
            intervalField.className = 'activity-note-field';
            const intervalLabel = document.createElement('span');
            intervalLabel.className = 'mini-label';
            intervalLabel.textContent = 'Service-Intervall (km)';
            const intervalInput = document.createElement('input');
            intervalInput.type = 'number';
            intervalInput.min = '0';
            intervalInput.step = '0.1';
            intervalInput.className = 'activity-note-select';
            intervalInput.placeholder = 'Optional';
            intervalInput.value = draft?.serviceIntervalKm === null || draft?.serviceIntervalKm === undefined
                ? ''
                : String(draft.serviceIntervalKm);
            intervalField.appendChild(intervalLabel);
            intervalField.appendChild(intervalInput);

            const warnField = document.createElement('label');
            warnField.className = 'activity-note-field';
            const warnLabel = document.createElement('span');
            warnLabel.className = 'mini-label';
            warnLabel.textContent = 'Warnung vorher (km)';
            const warnInput = document.createElement('input');
            warnInput.type = 'number';
            warnInput.min = '0';
            warnInput.step = '0.1';
            warnInput.className = 'activity-note-select';
            warnInput.value = String(Number(draft?.serviceWarnKm || 0) || 0);
            warnField.appendChild(warnLabel);
            warnField.appendChild(warnInput);

            const startField = document.createElement('label');
            startField.className = 'activity-note-field';
            const startLabel = document.createElement('span');
            startLabel.className = 'mini-label';
            startLabel.textContent = 'Service-Basis (km)';
            const startInput = document.createElement('input');
            startInput.type = 'number';
            startInput.min = '0';
            startInput.step = '0.1';
            startInput.className = 'activity-note-select';
            startInput.value = String(Number(draft?.serviceStartKm || 0) || 0);
            startField.appendChild(startLabel);
            startField.appendChild(startInput);

            const activeField = document.createElement('label');
            activeField.className = 'activity-note-field equipment-checkbox-field';
            const activeLabel = document.createElement('span');
            activeLabel.className = 'mini-label';
            activeLabel.textContent = 'Status';
            const activeToggle = document.createElement('label');
            activeToggle.className = 'equipment-checkbox';
            const activeInput = document.createElement('input');
            activeInput.type = 'checkbox';
            activeInput.checked = draft?.isActive === undefined ? true : Boolean(draft.isActive);
            const activeText = document.createElement('span');
            activeText.textContent = 'Aktiv';
            activeToggle.appendChild(activeInput);
            activeToggle.appendChild(activeText);
            activeField.appendChild(activeLabel);
            activeField.appendChild(activeToggle);

            const notesField = document.createElement('label');
            notesField.className = 'activity-note-field activity-note-field--full';
            const notesLabel = document.createElement('span');
            notesLabel.className = 'mini-label';
            notesLabel.textContent = 'Notizen';
            const notesInput = document.createElement('textarea');
            notesInput.className = 'activity-note-textarea';
            notesInput.maxLength = 2000;
            notesInput.placeholder = 'Optional: Modell, Zustand, letzte Wartung ...';
            notesInput.value = typeof draft?.notes === 'string' ? draft.notes : '';
            notesField.appendChild(notesLabel);
            notesField.appendChild(notesInput);

            grid.appendChild(nameField);
            grid.appendChild(categoryField);
            grid.appendChild(intervalField);
            grid.appendChild(warnField);
            grid.appendChild(startField);
            grid.appendChild(activeField);
            grid.appendChild(notesField);

            const actions = document.createElement('div');
            actions.className = 'trim-editor-actions';

            const saveBtn = document.createElement('button');
            saveBtn.type = 'submit';
            saveBtn.className = 'action-btn-secondary trim-action-btn trim-action-btn--primary';
            saveBtn.textContent = isEditing ? 'Änderungen speichern' : 'Equipment speichern';

            const cancelBtn = document.createElement('button');
            cancelBtn.type = 'button';
            cancelBtn.className = 'action-btn-secondary trim-action-btn';
            cancelBtn.textContent = isEditing ? 'Bearbeitung abbrechen' : 'Eingabe zurücksetzen';
            cancelBtn.onclick = () => {
                clearEquipmentEditorDraft(currentProfile);
                renderEquipmentModal().catch(error => {
                    console.error(error);
                    showToast('Equipment-Editor konnte nicht aktualisiert werden.', 'error');
                });
            };

            actions.appendChild(saveBtn);
            actions.appendChild(cancelBtn);

            card.appendChild(title);
            card.appendChild(hint);
            card.appendChild(grid);
            card.appendChild(actions);

            card.onsubmit = async (event) => {
                event.preventDefault();

                const name = String(nameInput.value || '').trim().slice(0, 100);
                if (!name) {
                    showToast('Bitte einen Equipment-Namen eingeben.', 'warning');
                    return;
                }

                let payload;
                try {
                    payload = {
                        name,
                        category: String(categoryInput.value || '').trim().slice(0, 80),
                        notes: String(notesInput.value || '').trim().slice(0, 2000),
                        serviceIntervalKm: parseEquipmentDistanceInput(intervalInput.value, {
                            allowNull: true,
                            label: 'Service-Intervall'
                        }),
                        serviceWarnKm: parseEquipmentDistanceInput(warnInput.value, {
                            allowNull: false,
                            defaultValue: 0,
                            label: 'Service-Warnwert'
                        }),
                        serviceStartKm: parseEquipmentDistanceInput(startInput.value, {
                            allowNull: false,
                            defaultValue: 0,
                            label: 'Service-Basis'
                        }),
                        isActive: Boolean(activeInput.checked)
                    };
                } catch (error) {
                    showToast(error.message || 'Eingaben sind ungültig.', 'warning');
                    return;
                }

                if (payload.serviceIntervalKm !== null && payload.serviceWarnKm > payload.serviceIntervalKm) {
                    payload.serviceWarnKm = payload.serviceIntervalKm;
                }

                saveBtn.disabled = true;
                cancelBtn.disabled = true;

                try {
                    if (isEditing) {
                        await updateEquipment(currentProfile, draftEquipmentId, payload);
                    } else {
                        await createEquipment(currentProfile, payload);
                    }

                    clearEquipmentEditorDraft(currentProfile);
                    await loadEquipment(currentProfile, { force: true });
                    await renderEquipmentModal();
                    renderHomeView();
                    showToast(isEditing ? 'Equipment aktualisiert.' : 'Equipment gespeichert.', 'success');
                } catch (error) {
                    console.error(error);
                    showToast(error.message || 'Equipment konnte nicht gespeichert werden.', 'error');
                    saveBtn.disabled = false;
                    cancelBtn.disabled = false;
                }
            };

            return card;
        }

        function createEquipmentTableSection(items = []) {
            const section = document.createElement('section');
            section.className = 'pr-section equipment-table-section';

            const title = document.createElement('h3');
            title.className = 'ranking-title';
            title.textContent = 'Gespeichertes Equipment';

            const intro = document.createElement('p');
            intro.className = 'trim-editor-hint';
            intro.textContent = 'Nutzung und Erinnerungen werden aus den zugewiesenen Trainings berechnet.';

            section.appendChild(title);
            section.appendChild(intro);

            if (!Array.isArray(items) || !items.length) {
                const empty = document.createElement('p');
                empty.className = 'placeholder-text';
                empty.textContent = 'Noch kein Equipment vorhanden.';
                section.appendChild(empty);
                return section;
            }

            const currentProfile = getCurrentProfile();
            const usageByEquipmentId = buildEquipmentUsageMap(currentProfile);
            const assignmentCountByEquipmentId = {};

            Object.values(getEquipmentAssignmentMap(currentProfile)).forEach(assignment => {
                const equipmentId = Number(assignment?.equipmentId);
                if (!Number.isFinite(equipmentId)) {
                    return;
                }

                assignmentCountByEquipmentId[equipmentId] = (assignmentCountByEquipmentId[equipmentId] || 0) + 1;
            });

            const table = document.createElement('table');
            table.className = 'compare-metric-table pr-metric-table';

            const thead = document.createElement('thead');
            const headRow = document.createElement('tr');
            ['Name', 'Service', 'Nutzung', 'Status', 'Aktion'].forEach(label => {
                const th = document.createElement('th');
                th.textContent = label;
                headRow.appendChild(th);
            });
            thead.appendChild(headRow);

            const tbody = document.createElement('tbody');

            items.forEach(item => {
                const row = document.createElement('tr');
                const equipmentId = Number(item.equipmentId);
                const usageKm = usageByEquipmentId[equipmentId] || 0;
                const assignmentCount = assignmentCountByEquipmentId[equipmentId] || 0;
                const maintenanceStatus = getEquipmentMaintenanceStatus(item, usageKm);

                const nameCell = document.createElement('td');
                nameCell.className = 'compare-metric-table__label';

                const nameWrap = document.createElement('div');
                nameWrap.className = 'equipment-table__name';
                const nameStrong = document.createElement('strong');
                nameStrong.textContent = item.name;
                const nameMeta = document.createElement('span');
                nameMeta.className = 'equipment-table__meta';
                nameMeta.textContent = item.category || 'Ohne Kategorie';
                nameWrap.appendChild(nameStrong);
                nameWrap.appendChild(nameMeta);
                nameCell.appendChild(nameWrap);

                const serviceCell = document.createElement('td');
                const intervalKm = Number(item.serviceIntervalKm);
                if (Number.isFinite(intervalKm) && intervalKm > 0) {
                    serviceCell.textContent = `${formatDashboardNumber(intervalKm, 1)} km · Warnung ${formatDashboardNumber(Number(item.serviceWarnKm || 0), 1)} km`;
                } else {
                    serviceCell.textContent = 'Kein Service-Intervall gesetzt';
                }

                const usageCell = document.createElement('td');
                usageCell.textContent = `${formatDashboardNumber(usageKm, 1)} km · ${assignmentCount} Training${assignmentCount === 1 ? '' : 's'}`;

                const statusCell = document.createElement('td');
                const statusBadge = document.createElement('span');
                statusBadge.className = getEquipmentStatusClass(maintenanceStatus.state);
                statusBadge.textContent = maintenanceStatus.message;
                statusCell.appendChild(statusBadge);

                const actionCell = document.createElement('td');

                const editBtn = createEquipmentActionButton('Bearbeiten', () => {
                    setEquipmentEditorDraft(currentProfile, {
                        equipmentId,
                        ...buildEquipmentPayloadFromItem(item)
                    });

                    renderEquipmentModal().catch(error => {
                        console.error(error);
                        showToast('Equipment konnte nicht zur Bearbeitung geladen werden.', 'error');
                    });
                });

                const resetServiceBtn = createEquipmentActionButton('Service zurücksetzen', async () => {
                    try {
                        const payload = buildEquipmentPayloadFromItem(item, { serviceStartKm: usageKm });
                        await updateEquipment(currentProfile, equipmentId, payload);
                        await loadEquipment(currentProfile, { force: true });
                        await renderEquipmentModal();
                        renderHomeView();
                        showToast('Service-Basis auf aktuelle Nutzung gesetzt.', 'success');
                    } catch (error) {
                        console.error(error);
                        showToast(error.message || 'Service-Basis konnte nicht aktualisiert werden.', 'error');
                    }
                });

                const toggleActiveBtn = createEquipmentActionButton(item.isActive ? 'Deaktivieren' : 'Aktivieren', async () => {
                    try {
                        const payload = buildEquipmentPayloadFromItem(item, { isActive: !item.isActive });
                        await updateEquipment(currentProfile, equipmentId, payload);
                        await loadEquipment(currentProfile, { force: true });
                        await renderEquipmentModal();
                        renderHomeView();
                        showToast(item.isActive ? 'Equipment deaktiviert.' : 'Equipment aktiviert.', 'success');
                    } catch (error) {
                        console.error(error);
                        showToast(error.message || 'Status konnte nicht geändert werden.', 'error');
                    }
                });

                const deleteBtn = createEquipmentActionButton('Löschen', async () => {
                    if (!confirm(`Equipment „${item.name}“ wirklich löschen?`)) {
                        return;
                    }

                    try {
                        await deleteEquipment(currentProfile, equipmentId);
                        const draft = getEquipmentEditorDraft(currentProfile);
                        if (Number(draft?.equipmentId) === equipmentId) {
                            clearEquipmentEditorDraft(currentProfile);
                        }

                        await Promise.all([
                            loadEquipment(currentProfile, { force: true }),
                            loadEquipmentAssignments(currentProfile, { force: true })
                        ]);
                        await renderEquipmentModal();
                        renderHomeView();
                        showToast('Equipment gelöscht.', 'success');
                    } catch (error) {
                        console.error(error);
                        showToast(error.message || 'Equipment konnte nicht gelöscht werden.', 'error');
                    }
                });

                actionCell.appendChild(editBtn);
                actionCell.appendChild(resetServiceBtn);
                actionCell.appendChild(toggleActiveBtn);
                actionCell.appendChild(deleteBtn);

                row.appendChild(nameCell);
                row.appendChild(serviceCell);
                row.appendChild(usageCell);
                row.appendChild(statusCell);
                row.appendChild(actionCell);
                tbody.appendChild(row);
            });

            table.appendChild(thead);
            table.appendChild(tbody);
            section.appendChild(table);

            return section;
        }

        async function renderEquipmentModal({ force = false } = {}) {
            const content = document.getElementById('equipment-content');
            const header = document.querySelector('#equipment-modal .modal-header h2');
            if (!content) {
                return;
            }

            if (header) {
                header.textContent = `${getCurrentProfileLabel()} – Equipment`;
            }

            content.innerHTML = '<p class="placeholder-text">Equipment wird geladen ...</p>';

            const requestId = ++equipmentRenderRequestId;
            const currentProfile = getCurrentProfile();

            await Promise.all([
                loadEquipment(currentProfile, { force }),
                loadEquipmentAssignments(currentProfile, { force })
            ]);

            if (requestId !== equipmentRenderRequestId) {
                return;
            }

            const summary = getEquipmentReminderSummary(currentProfile);
            const equipmentItems = getEquipmentItems(currentProfile);

            content.innerHTML = '';

            const intro = document.createElement('p');
            intro.className = 'trim-editor-hint';
            intro.textContent = 'Erfasse dein Equipment, pflege Service-Intervalle und ordne Aktivitäten zu. Die Hinweise aktualisieren sich automatisch.';
            content.appendChild(intro);

            const summaryGrid = document.createElement('section');
            summaryGrid.className = 'equipment-summary-grid';
            summaryGrid.appendChild(createEquipmentSummaryCard('Aktiv', String(summary.totalActive), 'Aktive Ausrüstung im Profil'));
            summaryGrid.appendChild(createEquipmentSummaryCard('Bald fällig', String(summary.warningCount), 'Service-Warnbereich erreicht'));
            summaryGrid.appendChild(createEquipmentSummaryCard('Überfällig', String(summary.dueCount), 'Service sofort empfohlen'));
            content.appendChild(summaryGrid);

            content.appendChild(createEquipmentEditorCard());
            content.appendChild(createEquipmentTableSection(equipmentItems));
        }

        function initEquipmentModal() {
            initStandardModal({
                modalId: 'equipment-modal',
                triggerId: 'equipment-btn',
                closeId: 'close-equipment-modal',
                initialFocusSelector: '#close-equipment-modal',
                onOpen: async () => {
                    try {
                        await renderEquipmentModal({ force: true });
                    } catch (error) {
                        console.error(error);
                        const content = document.getElementById('equipment-content');
                        if (content) {
                            content.innerHTML = '<p class="placeholder-text">Equipment konnte nicht geladen werden.</p>';
                        }
                    }
                }
            });
        }

        return {
            renderEquipmentModal,
            initEquipmentModal
        };
    }

    globalScope.createEquipmentView = createEquipmentView;
})(window);
