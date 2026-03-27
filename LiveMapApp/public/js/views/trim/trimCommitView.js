(function attachTrimCommitViewFactory(globalScope) {
    function createTrimCommitView({
        getTrimSelection,
        getCurrentProfile,
        calculateTrimSummary,
        apiBase,
        showToast,
        getCachedTrack,
        removeMapLayer,
        endTrimMode,
        removeCachedTrack,
        loadAllTracks,
        getTracksByProfile,
        selectTrack
    }) {
        async function commitTrimSelection() {
            const trimSelection = getTrimSelection();
            if (!trimSelection) {
                return;
            }

            const { filename, startIndex, endIndex } = trimSelection;
            const summary = calculateTrimSummary(startIndex, endIndex);
            const summaryText = summary
                ? `${summary.distanceKm.toFixed(1)} km, ${summary.pointCount} Punkte`
                : 'den markierten Bereich';

            if (!confirm(`Soll das Originaltraining wirklich überschrieben werden?\n\nEs bleibt dann nur noch ${summaryText}.`)) {
                return;
            }

            const currentProfile = getCurrentProfile();
            try {
                const response = await fetch(`${apiBase}/tracks/${currentProfile}/${encodeURIComponent(filename)}/trim`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ startIndex, endIndex })
                });

                const data = await response.json().catch(() => ({}));
                if (!response.ok) {
                    showToast(data.error || 'Training konnte nicht zugeschnitten werden.', 'error');
                    return;
                }

                const existingEntry = getCachedTrack(currentProfile, filename);
                if (existingEntry?.layer) {
                    removeMapLayer(existingEntry.layer);
                }

                endTrimMode({ refreshPanel: false });
                removeCachedTrack(currentProfile, filename);
                showToast(data.message || 'Training erfolgreich zugeschnitten.', 'success');
                await loadAllTracks();

                if ((getTracksByProfile()?.[currentProfile] || []).includes(filename)) {
                    await selectTrack(filename);
                }
            } catch (err) {
                console.error(err);
                showToast('Zuschneiden fehlgeschlagen.', 'error');
            }
        }

        return {
            commitTrimSelection
        };
    }

    globalScope.createTrimCommitView = createTrimCommitView;
})(window);
