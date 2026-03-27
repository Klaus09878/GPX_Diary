(function attachOutlierCleanupViewFactory(globalScope) {
    function createOutlierCleanupView({
        getOutlierSelection,
        getCurrentProfile,
        showToast,
        apiBase,
        getCachedTrack,
        removeMapLayer,
        endOutlierMode,
        removeCachedTrack,
        loadAllTracks,
        getTracksByProfile,
        selectTrack
    }) {
        async function applyOutlierCleanup() {
            const outlierSelection = getOutlierSelection();
            if (!outlierSelection) {
                return;
            }

            const undecidedCount = outlierSelection.candidates.filter(candidate => candidate.decision === null).length;
            if (undecidedCount > 0) {
                showToast('Bitte jeden Fund zuerst mit „Behalten“ oder „Entfernen“ bestätigen.', 'warning');
                return;
            }

            const ranges = outlierSelection.candidates
                .filter(candidate => candidate.decision === 'remove')
                .map(candidate => ({ startIndex: candidate.startIndex, endIndex: candidate.endIndex }));

            if (!ranges.length) {
                showToast('Es wurde kein Ausreißer zum Entfernen ausgewählt.', 'info');
                return;
            }

            if (!confirm(`Sollen ${ranges.length} bestätigte Ausreißer wirklich aus dem Originaltraining entfernt werden?`)) {
                return;
            }

            const currentProfile = getCurrentProfile();
            try {
                const filename = outlierSelection.filename;
                const response = await fetch(`${apiBase}/tracks/${currentProfile}/${encodeURIComponent(filename)}/outliers/apply`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ ranges })
                });

                const data = await response.json().catch(() => ({}));
                if (!response.ok) {
                    showToast(data.error || 'Ausreißer konnten nicht entfernt werden.', 'error');
                    return;
                }

                const existingEntry = getCachedTrack(currentProfile, filename);
                if (existingEntry?.layer) {
                    removeMapLayer(existingEntry.layer);
                }

                endOutlierMode({ refreshPanel: false });
                removeCachedTrack(currentProfile, filename);
                showToast(data.message || 'Ausreißer erfolgreich bereinigt.', 'success');
                await loadAllTracks();

                if ((getTracksByProfile()?.[currentProfile] || []).includes(filename)) {
                    await selectTrack(filename);
                }
            } catch (err) {
                console.error(err);
                showToast('Ausreißer-Bereinigung fehlgeschlagen.', 'error');
            }
        }

        return {
            applyOutlierCleanup
        };
    }

    globalScope.createOutlierCleanupView = createOutlierCleanupView;
})(window);
