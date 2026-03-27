(function attachDeleteAllViewFactory(globalScope) {
    function createDeleteAllView({
        apiBase,
        getCurrentProfile,
        showToast,
        loadAllTracks
    }) {
        function toggleDeleteAllButton(show) {
            const button = document.getElementById('delete-all-btn');
            if (button) button.style.display = show ? 'block' : 'none';
        }

        function initDeleteAll() {
            const btn = document.getElementById('delete-all-btn');
            if (btn) btn.onclick = async () => {
                const currentProfile = getCurrentProfile();
                if (confirm(`Alle Routen im Profil "${currentProfile}" löschen?`)) {
                    try {
                        const res = await fetch(`${apiBase}/tracks/${currentProfile}`, { method: 'DELETE' });
                        const data = await res.json().catch(() => ({}));

                        if (!res.ok) {
                            showToast(data.error || 'Bulk-Löschen fehlgeschlagen.', 'error');
                            return;
                        }

                        const deletedCount = data.count || 0;
                        const clearedPending = data.clearedPending || 0;
                        if (clearedPending > 0) {
                            showToast(`${deletedCount} Routen gelöscht, ${clearedPending} offene Duplikate bereinigt.`, 'success');
                        } else {
                            showToast(`${deletedCount} Routen gelöscht.`, 'success');
                        }
                        await loadAllTracks();
                    } catch (err) {
                        console.error(err);
                        showToast('Bulk-Löschen fehlgeschlagen.', 'error');
                    }
                }
            };
        }

        return {
            initDeleteAll,
            toggleDeleteAllButton
        };
    }

    globalScope.createDeleteAllView = createDeleteAllView;
})(window);
