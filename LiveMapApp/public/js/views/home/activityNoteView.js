(function attachActivityNoteViewFactory(globalScope) {
    function createActivityNoteView({
        noteScoreFields,
        getCurrentProfile,
        getActivityNoteSummary,
        fetchActivityNote,
        saveActivityNote,
        showToast,
        applyFiltersAndSort,
        renderHomeView
    }) {
        function formatActivityNoteUpdatedAt(updatedAt) {
            if (!updatedAt || updatedAt <= 0) {
                return 'Noch keine Notiz gespeichert';
            }

            return `Zuletzt gespeichert: ${new Date(updatedAt).toLocaleString('de-DE', {
                dateStyle: 'short',
                timeStyle: 'short'
            })}`;
        }

        function createActivityNoteField(field, note) {
            const wrapper = document.createElement('label');
            wrapper.className = 'activity-note-field';

            const label = document.createElement('span');
            label.className = 'mini-label';
            label.textContent = field.label;

            const select = document.createElement('select');
            select.className = 'activity-note-select';

            field.options.forEach(optionConfig => {
                const option = document.createElement('option');
                option.value = optionConfig.value;
                option.textContent = optionConfig.label;
                if (String(note?.[field.key] ?? '') === optionConfig.value) {
                    option.selected = true;
                }
                select.appendChild(option);
            });

            wrapper.appendChild(label);
            wrapper.appendChild(select);

            return { wrapper, select };
        }

        function renderActivityNoteEditor(container, filename, note) {
            container.innerHTML = '';
            container.dataset.noteFilename = filename;

            const title = document.createElement('div');
            title.className = 'trim-editor-title';
            title.textContent = 'Trainings-Notiz';

            const hint = document.createElement('p');
            hint.className = 'trim-editor-hint';
            hint.textContent = 'Halte Form, Wettergefühl, Schlaf und Belastung fest. Die Notizen werden serverseitig gespeichert und sind über die Suche wieder auffindbar.';

            const grid = document.createElement('div');
            grid.className = 'activity-note-grid';

            const fieldInputs = {};
            noteScoreFields.forEach(field => {
                const { wrapper, select } = createActivityNoteField(field, note);
                fieldInputs[field.key] = select;
                grid.appendChild(wrapper);
            });

            const textWrapper = document.createElement('label');
            textWrapper.className = 'activity-note-field activity-note-field--full';

            const textLabel = document.createElement('span');
            textLabel.className = 'mini-label';
            textLabel.textContent = 'Freitext';

            const textarea = document.createElement('textarea');
            textarea.className = 'activity-note-textarea';
            textarea.placeholder = 'Wie lief die Einheit? Was war auffällig? Ziele, Beine, Wetter, Fokus ...';
            textarea.value = note?.noteText || '';

            textWrapper.appendChild(textLabel);
            textWrapper.appendChild(textarea);

            const footer = document.createElement('div');
            footer.className = 'activity-note-actions';

            const status = document.createElement('span');
            status.className = 'activity-note-status';
            status.textContent = formatActivityNoteUpdatedAt(Number(note?.updatedAt) || 0);

            const saveButton = document.createElement('button');
            saveButton.className = 'action-btn-secondary trim-action-btn trim-action-btn--primary';
            saveButton.textContent = 'Notiz speichern';

            const reloadButton = document.createElement('button');
            reloadButton.className = 'action-btn-secondary trim-action-btn';
            reloadButton.textContent = 'Neu laden';
            reloadButton.onclick = () => populateActivityNoteCard(container, filename);

            saveButton.onclick = async () => {
                saveButton.disabled = true;
                reloadButton.disabled = true;
                status.textContent = 'Speichere Notiz ...';

                try {
                    const payload = {
                        perceivedForm: fieldInputs.perceivedForm.value === '' ? null : Number(fieldInputs.perceivedForm.value),
                        weatherFeeling: fieldInputs.weatherFeeling.value === '' ? null : Number(fieldInputs.weatherFeeling.value),
                        sleepQuality: fieldInputs.sleepQuality.value === '' ? null : Number(fieldInputs.sleepQuality.value),
                        rpe: fieldInputs.rpe.value === '' ? null : Number(fieldInputs.rpe.value),
                        noteText: textarea.value
                    };

                    const savedNote = await saveActivityNote(filename, payload);
                    showToast('Trainings-Notiz gespeichert.', 'success');
                    renderActivityNoteEditor(container, filename, savedNote);
                    applyFiltersAndSort();
                    renderHomeView();
                } catch (error) {
                    console.error(error);
                    status.textContent = 'Speichern fehlgeschlagen';
                    showToast(error.message || 'Trainings-Notiz konnte nicht gespeichert werden.', 'error');
                    saveButton.disabled = false;
                    reloadButton.disabled = false;
                }
            };

            footer.appendChild(status);
            footer.appendChild(reloadButton);
            footer.appendChild(saveButton);

            container.appendChild(title);
            container.appendChild(hint);
            container.appendChild(grid);
            container.appendChild(textWrapper);
            container.appendChild(footer);
        }

        async function populateActivityNoteCard(container, filename) {
            if (!container) {
                return;
            }

            container.dataset.noteFilename = filename;
            container.innerHTML = '<div class="trim-editor-title">Trainings-Notiz</div><p class="trim-editor-hint">Notiz wird geladen ...</p>';

            try {
                const currentProfile = getCurrentProfile();
                const cachedNote = getActivityNoteSummary(currentProfile, filename);
                const note = cachedNote || await fetchActivityNote(currentProfile, filename);

                if (container.dataset.noteFilename !== filename) {
                    return;
                }

                renderActivityNoteEditor(container, filename, note);
            } catch (error) {
                console.error(error);
                if (container.dataset.noteFilename !== filename) {
                    return;
                }

                container.innerHTML = '<div class="trim-editor-title">Trainings-Notiz</div><p class="trim-editor-hint">Die Notiz konnte nicht geladen werden.</p>';
            }
        }

        return {
            populateActivityNoteCard
        };
    }

    globalScope.createActivityNoteView = createActivityNoteView;
})(window);
