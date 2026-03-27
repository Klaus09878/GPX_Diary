(function attachUploadViewFactory(globalScope) {
    function createUploadView({
        apiBase,
        getCurrentProfile,
        showToast,
        loadAllTracks,
        closeModalWithA11y,
        openModalWithA11y
    }) {
        function initDragAndDrop() {
            const zone = document.getElementById('drop-zone');
            if (!zone) return;
            zone.ondragover = (e) => { e.preventDefault(); zone.classList.add('dragover'); };
            zone.ondragleave = () => zone.classList.remove('dragover');
            zone.ondrop = (e) => { e.preventDefault(); zone.classList.remove('dragover'); handleFileUpload(e.dataTransfer.files); };
            zone.onclick = () => {
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = '.gpx,.fit,.fir';
                input.multiple = true;
                input.onchange = (e) => handleFileUpload(e.target.files);
                input.click();
            };
        }

        async function handleFileUpload(files) {
            const filtered = Array.from(files).filter(f => f.name.match(/\.(gpx|fit|fir)$/i));
            if (!filtered.length) {
                showToast('Bitte GPX, FIT oder FIR Dateien wählen.', 'warning');
                return;
            }

            const profile = getCurrentProfile();
            const fd = new FormData();
            filtered.forEach(f => fd.append('gpxFiles', f));

            try {
                const res = await fetch(`${apiBase}/upload/${profile}`, { method: 'POST', body: fd });
                const data = await res.json().catch(() => ({}));

                if (res.status === 409) {
                    const uploadedCount = Array.isArray(data.uploaded) ? data.uploaded.length : 0;
                    const discardedCount = Array.isArray(data.discarded) ? data.discarded.length : 0;
                    const conflicts = Array.isArray(data.conflicts) ? data.conflicts : [];

                    if (uploadedCount > 0) {
                        showToast(`${uploadedCount} Dateien hochgeladen.`, 'success');
                    }

                    for (const conflict of conflicts) {
                        const action = await showDuplicateModal(conflict);
                        await resolveDuplicateConflict(profile, conflict.pendingId, action || 'keep_existing');
                    }

                    if (discardedCount > 0) {
                        const firstDiscard = Array.isArray(data.discarded) ? data.discarded[0] : null;
                        const detail = firstDiscard?.name && firstDiscard?.reason
                            ? ` (${firstDiscard.name}: ${firstDiscard.reason})`
                            : '';
                        showToast(`${discardedCount} Dateien verworfen.${detail}`, 'warning');
                    }

                    await loadAllTracks();
                    return;
                }

                if (!res.ok) {
                    showToast(data.error || 'Upload fehlgeschlagen.', 'error');
                    return;
                }

                const uploadedCount = Array.isArray(data.uploaded) ? data.uploaded.length : 0;
                const discardedCount = Array.isArray(data.discarded) ? data.discarded.length : 0;
                if (uploadedCount > 0) {
                    showToast(`${uploadedCount} Dateien hochgeladen.`, 'success');
                }
                if (discardedCount > 0) {
                    const firstDiscard = Array.isArray(data.discarded) ? data.discarded[0] : null;
                    const detail = firstDiscard?.name && firstDiscard?.reason
                        ? ` (${firstDiscard.name}: ${firstDiscard.reason})`
                        : '';
                    showToast(`${discardedCount} Dateien verworfen.${detail}`, 'warning');
                }
                await loadAllTracks();
            } catch (e) {
                console.error(e);
                showToast('Upload fehlgeschlagen.', 'error');
            }
        }

        async function resolveDuplicateConflict(profile, pendingId, action) {
            if (!pendingId) {
                showToast('Duplikat-Konflikt ohne pendingId erhalten.', 'error');
                return false;
            }

            try {
                const res = await fetch(`${apiBase}/resolve-duplicate/${profile}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ pendingId, action })
                });

                const data = await res.json().catch(() => ({}));

                if (!res.ok) {
                    showToast(data.error || 'Duplikat konnte nicht aufgelöst werden.', 'error');
                    return false;
                }

                showToast(data.message || 'Duplikat aufgelöst.', 'success');
                return true;
            } catch (err) {
                console.error(err);
                showToast('Duplikat-Auflösung fehlgeschlagen.', 'error');
                return false;
            }
        }

        function showDuplicateModal(conflict) {
            return new Promise((resolve) => {
                const modal = document.getElementById('duplicate-modal');
                const content = document.getElementById('duplicate-content');
                const closeBtn = document.getElementById('close-duplicate');

                if (!modal || !content) {
                    resolve('keep_existing');
                    return;
                }

                const existingFile = conflict?.existingFile || 'Unbekannt';
                const incomingFile = conflict?.incomingFile || 'Neue Datei';

                let isFinished = false;

                const onKeydown = (event) => {
                    if (event.key === 'Escape') {
                        event.preventDefault();
                        event.stopPropagation();
                        finish('keep_existing');
                    }
                };

                const cleanup = () => {
                    if (isFinished) {
                        return;
                    }

                    isFinished = true;
                    document.removeEventListener('keydown', onKeydown, true);
                    closeModalWithA11y(modal);
                    content.innerHTML = '';
                    if (closeBtn) closeBtn.onclick = null;
                    modal.onclick = null;
                };

                const finish = (action) => {
                    if (isFinished) {
                        return;
                    }

                    cleanup();
                    resolve(action);
                };

                if (closeBtn) {
                    closeBtn.onclick = () => finish('keep_existing');
                }

                modal.onclick = (event) => {
                    if (event.target === modal) {
                        finish('keep_existing');
                    }
                };

                const intro = document.createElement('p');
                const confidenceText = conflict?.confidence ? ` (${conflict.confidence})` : '';
                intro.textContent = conflict?.reason
                    ? `Mögliche Dublette erkannt${confidenceText}: ${conflict.reason}.`
                    : 'Es wurde ein möglicher Duplikat-Track erkannt.';

                const existingInfo = document.createElement('p');
                existingInfo.textContent = `Bestehend: ${existingFile}`;

                const incomingInfo = document.createElement('p');
                incomingInfo.textContent = `Neu: ${incomingFile}`;

                const metricParts = [];
                const metrics = conflict?.metrics || {};
                if (Number.isFinite(Number(metrics.startTimeDiffSec))) {
                    metricParts.push(`Startzeit Δ ${Math.round(Number(metrics.startTimeDiffSec))} s`);
                }
                if (Number.isFinite(Number(metrics.distanceDiffPercent))) {
                    metricParts.push(`Distanz Δ ${Number(metrics.distanceDiffPercent).toFixed(2)} %`);
                }
                if (Number.isFinite(Number(metrics.durationDiffPercent))) {
                    metricParts.push(`Dauer Δ ${Number(metrics.durationDiffPercent).toFixed(2)} %`);
                }
                if (Number.isFinite(Number(metrics.startDistanceM))) {
                    metricParts.push(`Startpunkt Δ ${Math.round(Number(metrics.startDistanceM))} m`);
                }
                if (Number.isFinite(Number(metrics.endDistanceM))) {
                    metricParts.push(`Endpunkt Δ ${Math.round(Number(metrics.endDistanceM))} m`);
                }

                const metricInfo = document.createElement('p');
                metricInfo.className = 'mini-label';
                metricInfo.textContent = metricParts.length
                    ? metricParts.join(' · ')
                    : 'Keine Detailmetriken verfügbar.';

                const statRow = document.createElement('div');
                statRow.className = 'detail-actions';

                const existingMeta = document.createElement('span');
                existingMeta.className = 'mini-label';
                existingMeta.textContent = `Bestehend: ${conflict?.existing?.distanceKm || '-'} km, ${conflict?.existing?.pointCount || '-'} Punkte`;

                const incomingMeta = document.createElement('span');
                incomingMeta.className = 'mini-label';
                incomingMeta.textContent = `Neu: ${conflict?.incoming?.distanceKm || '-'} km, ${conflict?.incoming?.pointCount || '-'} Punkte`;

                statRow.appendChild(existingMeta);
                statRow.appendChild(incomingMeta);

                const actionRow = document.createElement('div');
                actionRow.className = 'detail-actions';

                const keepExistingBtn = document.createElement('button');
                keepExistingBtn.className = 'action-btn-secondary';
                keepExistingBtn.textContent = 'Bestehende behalten';
                keepExistingBtn.onclick = () => finish('keep_existing');

                const replaceBtn = document.createElement('button');
                replaceBtn.className = 'detail-delete-btn';
                replaceBtn.textContent = 'Ersetzen';
                replaceBtn.onclick = () => finish('replace');

                const keepBothBtn = document.createElement('button');
                keepBothBtn.className = 'action-btn-secondary';
                keepBothBtn.textContent = 'Beide behalten';
                keepBothBtn.onclick = () => finish('keep_both');

                actionRow.appendChild(keepExistingBtn);
                actionRow.appendChild(replaceBtn);
                actionRow.appendChild(keepBothBtn);

                content.appendChild(intro);
                content.appendChild(existingInfo);
                content.appendChild(incomingInfo);
                content.appendChild(metricInfo);
                content.appendChild(statRow);
                content.appendChild(actionRow);

                document.addEventListener('keydown', onKeydown, true);
                openModalWithA11y(modal, {
                    initialFocusSelector: '#close-duplicate'
                });
            });
        }

        return {
            initDragAndDrop,
            handleFileUpload,
            resolveDuplicateConflict,
            showDuplicateModal
        };
    }

    globalScope.createUploadView = createUploadView;
})(window);
