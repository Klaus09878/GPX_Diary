(function attachComparisonViewFactory(globalScope) {
    function createComparisonView({
        initStandardModal,
        ensureComparisonSelection,
        getCurrentProfile,
        getCurrentProfileLabel,
        getActiveTrackName,
        getCachedTrack,
        getTrackDisplayName,
        formatDashboardDate,
        formatMetricValue,
        formatDurationMinutes,
        formatPace,
        getCompareAccentColor,
        clearComparisonOverlay,
        endTrimMode,
        endOutlierMode,
        getIsHeatmapActive,
        setIsHeatmapActive,
        clearHeatmapLayers,
        getCompareSelection,
        collectComparisonSummary,
        getMap,
        showToast,
        getCompareOverlayLayers,
        setCompareOverlayLayers,
        leaflet
    }) {
        let compareRenderRequestId = 0;

        function initComparisonModal() {
            initStandardModal({
                modalId: 'compare-modal',
                triggerId: 'compare-btn',
                closeId: 'close-compare',
                initialFocusSelector: '#close-compare',
                onOpen: async () => {
                    await renderComparisonModal();
                }
            });
        }

        function getComparisonTrackOptionLabel(filename) {
            const entry = getCachedTrack(getCurrentProfile(), filename);
            const dateLabel = formatDashboardDate(Number(entry?.stats?.date) || 0);
            return `${getTrackDisplayName(filename)} (${dateLabel})`;
        }

        function calculateBoundsRectangleArea(bounds) {
            if (!bounds || !bounds.isValid || !bounds.isValid()) {
                return 0;
            }

            const width = Math.abs(bounds.getEast() - bounds.getWest());
            const height = Math.abs(bounds.getNorth() - bounds.getSouth());
            return width * height;
        }

        function calculateLayerBoundsOverlapRatio(referenceLayer, candidateLayer) {
            const referenceBounds = referenceLayer?.getBounds?.();
            const candidateBounds = candidateLayer?.getBounds?.();
            if (!referenceBounds?.isValid?.() || !candidateBounds?.isValid?.()) {
                return 0;
            }

            const south = Math.max(referenceBounds.getSouth(), candidateBounds.getSouth());
            const north = Math.min(referenceBounds.getNorth(), candidateBounds.getNorth());
            const west = Math.max(referenceBounds.getWest(), candidateBounds.getWest());
            const east = Math.min(referenceBounds.getEast(), candidateBounds.getEast());

            if (north <= south || east <= west) {
                return 0;
            }

            const intersectionArea = Math.abs(east - west) * Math.abs(north - south);
            const baseArea = Math.max(Math.min(calculateBoundsRectangleArea(referenceBounds), calculateBoundsRectangleArea(candidateBounds)), 0.0000001);
            return Math.max(0, Math.min(1, intersectionArea / baseArea));
        }

        function buildSmartComparisonSuggestions(files) {
            if (!Array.isArray(files) || files.length < 2) {
                return { referenceFilename: null, suggestions: [] };
            }

            const currentProfile = getCurrentProfile();
            const activeTrackName = getActiveTrackName();

            const fallbackReference = [...files]
                .sort((left, right) => {
                    const leftDate = Number(getCachedTrack(currentProfile, left)?.stats?.date) || 0;
                    const rightDate = Number(getCachedTrack(currentProfile, right)?.stats?.date) || 0;
                    return rightDate - leftDate;
                })[0] || null;
            const referenceFilename = files.includes(activeTrackName) ? activeTrackName : fallbackReference;
            const referenceEntry = referenceFilename ? getCachedTrack(currentProfile, referenceFilename) : null;
            if (!referenceEntry?.stats?.distance || !referenceEntry?.layer) {
                return { referenceFilename, suggestions: [] };
            }

            const referenceDistanceKm = (Number(referenceEntry.stats.distance) || 0) / 1000;
            const referenceElevationM = Number(referenceEntry.stats.elevation) || 0;

            const suggestions = files
                .filter(filename => filename !== referenceFilename)
                .map(filename => {
                    const entry = getCachedTrack(currentProfile, filename);
                    if (!entry?.stats?.distance || !entry?.layer) {
                        return null;
                    }

                    const distanceKm = (Number(entry.stats.distance) || 0) / 1000;
                    const elevationM = Number(entry.stats.elevation) || 0;
                    const distanceDeltaPct = Math.abs(distanceKm - referenceDistanceKm) / Math.max(referenceDistanceKm, 0.3);
                    const elevationDeltaPct = Math.abs(elevationM - referenceElevationM) / Math.max(referenceElevationM, 120);
                    const overlapRatio = calculateLayerBoundsOverlapRatio(referenceEntry.layer, entry.layer);

                    if (distanceDeltaPct > 0.15 || elevationDeltaPct > 0.20 || overlapRatio < 0.08) {
                        return null;
                    }

                    const distanceScore = 1 - Math.min(distanceDeltaPct / 0.15, 1);
                    const elevationScore = 1 - Math.min(elevationDeltaPct / 0.20, 1);
                    const overlapScore = Math.min(overlapRatio / 0.35, 1);
                    const similarityScore = (distanceScore * 0.35) + (elevationScore * 0.25) + (overlapScore * 0.40);

                    return {
                        filename,
                        displayName: getTrackDisplayName(filename),
                        similarityScore,
                        distanceDeltaPct,
                        elevationDeltaPct,
                        overlapRatio
                    };
                })
                .filter(Boolean)
                .sort((left, right) => right.similarityScore - left.similarityScore)
                .slice(0, 6);

            return {
                referenceFilename,
                suggestions
            };
        }

        function createSmartComparisonSuggestionsSection(files) {
            const section = document.createElement('section');
            section.className = 'compare-smart-section';

            const title = document.createElement('h4');
            title.textContent = 'Smart Vergleich';

            const hint = document.createElement('p');
            hint.className = 'trim-editor-hint';
            hint.textContent = 'Automatisch ähnliche Touren auf Basis Distanz (±15%), Höhenmeter (±20%) und Strecken-Überlappung.';

            section.appendChild(title);
            section.appendChild(hint);

            const { referenceFilename, suggestions } = buildSmartComparisonSuggestions(files);
            if (!referenceFilename) {
                const empty = document.createElement('p');
                empty.className = 'placeholder-text';
                empty.textContent = 'Keine Referenzstrecke für den Smart Vergleich verfügbar.';
                section.appendChild(empty);
                return section;
            }

            const referenceInfo = document.createElement('p');
            referenceInfo.className = 'mini-label';
            referenceInfo.textContent = `Referenz: ${getTrackDisplayName(referenceFilename)}`;
            section.appendChild(referenceInfo);

            if (!suggestions.length) {
                const empty = document.createElement('p');
                empty.className = 'placeholder-text';
                empty.textContent = 'Aktuell wurden keine ähnlichen Touren gefunden.';
                section.appendChild(empty);
                return section;
            }

            const list = document.createElement('div');
            list.className = 'compare-smart-list';

            suggestions.forEach(suggestion => {
                const row = document.createElement('div');
                row.className = 'compare-smart-row';

                const info = document.createElement('div');
                info.className = 'compare-smart-row__info';

                const name = document.createElement('strong');
                name.textContent = suggestion.displayName;

                const meta = document.createElement('span');
                meta.textContent = `Ähnlichkeit ${Math.round(suggestion.similarityScore * 100)}% · Distanz Δ ${(suggestion.distanceDeltaPct * 100).toFixed(1)}% · HM Δ ${(suggestion.elevationDeltaPct * 100).toFixed(1)}% · Overlap ${(suggestion.overlapRatio * 100).toFixed(0)}%`;

                info.appendChild(name);
                info.appendChild(meta);

                const compareButton = document.createElement('button');
                compareButton.className = 'action-btn-secondary';
                compareButton.textContent = 'Vergleichen';
                compareButton.onclick = async () => {
                    const compareSelection = getCompareSelection();
                    compareSelection.leftFilename = referenceFilename;
                    compareSelection.rightFilename = suggestion.filename;
                    await renderComparisonModal();
                };

                row.appendChild(info);
                row.appendChild(compareButton);
                list.appendChild(row);
            });

            section.appendChild(list);
            return section;
        }

        function createComparisonMetricRows(left, right) {
            const rows = [
                {
                    label: 'Distanz',
                    leftValue: left.distanceKm,
                    rightValue: right.distanceKm,
                    formatter: (value) => formatMetricValue(value, 'km', 1),
                    deltaFormatter: (leftValue, rightValue) => formatMetricValue(leftValue - rightValue, 'km', 1)
                },
                {
                    label: 'Dauer',
                    leftValue: left.durationMinutes,
                    rightValue: right.durationMinutes,
                    formatter: (value) => formatDurationMinutes(value),
                    deltaFormatter: (leftValue, rightValue) => formatMetricValue(leftValue - rightValue, 'min', 0)
                },
                {
                    label: 'Ø Geschwindigkeit',
                    leftValue: left.avgSpeedKmh,
                    rightValue: right.avgSpeedKmh,
                    formatter: (value) => formatMetricValue(value, 'km/h', 1),
                    deltaFormatter: (leftValue, rightValue) => formatMetricValue(leftValue - rightValue, 'km/h', 1)
                },
                {
                    label: 'Ø Pace',
                    leftValue: left.paceMinPerKm,
                    rightValue: right.paceMinPerKm,
                    formatter: (value) => formatPace(value),
                    deltaFormatter: (leftValue, rightValue) => formatMetricValue(leftValue - rightValue, 'min/km', 2)
                },
                {
                    label: 'Anstieg',
                    leftValue: left.elevationM,
                    rightValue: right.elevationM,
                    formatter: (value) => formatMetricValue(value, 'm', 0),
                    deltaFormatter: (leftValue, rightValue) => formatMetricValue(leftValue - rightValue, 'm', 0)
                },
                {
                    label: 'Max. Geschwindigkeit',
                    leftValue: left.maxSpeedKmh,
                    rightValue: right.maxSpeedKmh,
                    formatter: (value) => formatMetricValue(value, 'km/h', 1),
                    deltaFormatter: (leftValue, rightValue) => formatMetricValue(leftValue - rightValue, 'km/h', 1)
                },
                {
                    label: 'Ø Herzfrequenz',
                    leftValue: left.avgHeartRate,
                    rightValue: right.avgHeartRate,
                    formatter: (value) => formatMetricValue(value, 'bpm', 0),
                    deltaFormatter: (leftValue, rightValue) => formatMetricValue(leftValue - rightValue, 'bpm', 0),
                    optional: true
                },
                {
                    label: 'Max. Herzfrequenz',
                    leftValue: left.maxHeartRate,
                    rightValue: right.maxHeartRate,
                    formatter: (value) => formatMetricValue(value, 'bpm', 0),
                    deltaFormatter: (leftValue, rightValue) => formatMetricValue(leftValue - rightValue, 'bpm', 0),
                    optional: true
                },
                {
                    label: 'Ø Leistung',
                    leftValue: left.avgPower,
                    rightValue: right.avgPower,
                    formatter: (value) => formatMetricValue(value, 'W', 0),
                    deltaFormatter: (leftValue, rightValue) => formatMetricValue(leftValue - rightValue, 'W', 0),
                    optional: true
                },
                {
                    label: 'Max. Leistung',
                    leftValue: left.maxPower,
                    rightValue: right.maxPower,
                    formatter: (value) => formatMetricValue(value, 'W', 0),
                    deltaFormatter: (leftValue, rightValue) => formatMetricValue(leftValue - rightValue, 'W', 0),
                    optional: true
                },
                {
                    label: 'Trackpunkte',
                    leftValue: left.pointCount,
                    rightValue: right.pointCount,
                    formatter: (value) => formatMetricValue(value, '', 0),
                    deltaFormatter: (leftValue, rightValue) => formatMetricValue(leftValue - rightValue, '', 0)
                }
            ];

            return rows.filter(row => {
                if (!row.optional) {
                    return true;
                }

                return Number.isFinite(row.leftValue) || Number.isFinite(row.rightValue);
            });
        }

        function createComparisonTrackCard(summary, columnKey) {
            const card = document.createElement('article');
            card.className = `compare-track-card compare-track-card--${columnKey}`;

            const title = document.createElement('h4');
            title.textContent = summary.displayName;

            const meta = document.createElement('p');
            meta.className = 'compare-track-card__meta';
            meta.textContent = `${formatDashboardDate(summary.dateMs)} · ${summary.pointCount} Punkte`;

            const accent = document.createElement('span');
            accent.className = 'compare-track-card__accent';
            accent.style.background = getCompareAccentColor(columnKey);

            card.appendChild(accent);
            card.appendChild(title);
            card.appendChild(meta);
            return card;
        }

        function createComparisonMetricTable(left, right) {
            const table = document.createElement('table');
            table.className = 'compare-metric-table';

            const thead = document.createElement('thead');
            const headRow = document.createElement('tr');
            ['Metrik', 'Links', 'Rechts', 'Δ (Links-Rechts)'].forEach(label => {
                const th = document.createElement('th');
                th.textContent = label;
                headRow.appendChild(th);
            });
            thead.appendChild(headRow);

            const tbody = document.createElement('tbody');
            createComparisonMetricRows(left, right).forEach(row => {
                const tr = document.createElement('tr');

                const metricCell = document.createElement('td');
                metricCell.className = 'compare-metric-table__label';
                metricCell.textContent = row.label;

                const leftCell = document.createElement('td');
                leftCell.textContent = row.formatter(row.leftValue);

                const rightCell = document.createElement('td');
                rightCell.textContent = row.formatter(row.rightValue);

                const deltaCell = document.createElement('td');
                if (Number.isFinite(row.leftValue) && Number.isFinite(row.rightValue)) {
                    deltaCell.textContent = row.deltaFormatter(row.leftValue, row.rightValue);
                    if ((row.leftValue - row.rightValue) > 0.001) {
                        deltaCell.className = 'compare-delta-positive';
                    } else if ((row.leftValue - row.rightValue) < -0.001) {
                        deltaCell.className = 'compare-delta-negative';
                    }
                } else {
                    deltaCell.textContent = '—';
                }

                tr.appendChild(metricCell);
                tr.appendChild(leftCell);
                tr.appendChild(rightCell);
                tr.appendChild(deltaCell);
                tbody.appendChild(tr);
            });

            table.appendChild(thead);
            table.appendChild(tbody);
            return table;
        }

        function showComparisonOnMap(leftSummary, rightSummary) {
            if (!leftSummary || !rightSummary) {
                return;
            }

            clearComparisonOverlay();
            endTrimMode({ refreshPanel: false });
            endOutlierMode({ refreshPanel: false });

            if (getIsHeatmapActive()) {
                setIsHeatmapActive(false);
                document.getElementById('heatmap-toggle')?.classList.remove('active');
                document.querySelector('.map-container')?.classList.remove('heatmap-active');
                clearHeatmapLayers();
            }

            const leftCoordinates = leftSummary.points.map(point => [point.lat, point.lng]);
            const rightCoordinates = rightSummary.points.map(point => [point.lat, point.lng]);

            if (leftCoordinates.length < 2 || rightCoordinates.length < 2) {
                showToast('Für den Kartenvergleich fehlen ausreichend Trackpunkte.', 'warning');
                return;
            }

            const map = getMap();
            if (!map || !leaflet) {
                return;
            }

            const leftLayer = leaflet.polyline(leftCoordinates, {
                color: getCompareAccentColor('left'),
                weight: 6,
                opacity: 0.95,
                lineCap: 'round'
            }).addTo(map);

            const rightLayer = leaflet.polyline(rightCoordinates, {
                color: getCompareAccentColor('right'),
                weight: 6,
                opacity: 0.92,
                dashArray: '9 8',
                lineCap: 'round'
            }).addTo(map);

            leftLayer.bindTooltip(`Links: ${leftSummary.displayName}`, { sticky: true });
            rightLayer.bindTooltip(`Rechts: ${rightSummary.displayName}`, { sticky: true });

            setCompareOverlayLayers([leftLayer, rightLayer]);

            const group = leaflet.featureGroup(getCompareOverlayLayers());
            if (group.getBounds().isValid()) {
                map.fitBounds(group.getBounds(), { padding: [55, 55] });
            }

            showToast('Vergleich auf der Karte aktiv.', 'success');
        }

        async function renderComparisonModal() {
            const content = document.getElementById('compare-content');
            const header = document.querySelector('#compare-modal .modal-header h2');
            if (!content) {
                return;
            }

            const files = ensureComparisonSelection();
            if (header) {
                header.textContent = `${getCurrentProfileLabel()} – Trainingsvergleich`;
            }

            content.innerHTML = '';

            if (!files.length) {
                const empty = document.createElement('p');
                empty.className = 'placeholder-text';
                empty.textContent = 'Für dieses Profil sind keine Tracks verfügbar.';
                content.appendChild(empty);
                return;
            }

            if (files.length < 2) {
                const empty = document.createElement('p');
                empty.className = 'placeholder-text';
                empty.textContent = 'Für einen Vergleich werden mindestens zwei Trainings im aktuellen Profil benötigt.';
                content.appendChild(empty);
                return;
            }

            const controls = document.createElement('section');
            controls.className = 'compare-controls';

            const smartSuggestionSection = createSmartComparisonSuggestionsSection(files);

            const leftGroup = document.createElement('div');
            leftGroup.className = 'compare-select-group';
            const leftLabel = document.createElement('label');
            leftLabel.textContent = 'Training links';
            const leftSelect = document.createElement('select');
            leftSelect.className = 'compare-select';

            const rightGroup = document.createElement('div');
            rightGroup.className = 'compare-select-group';
            const rightLabel = document.createElement('label');
            rightLabel.textContent = 'Training rechts';
            const rightSelect = document.createElement('select');
            rightSelect.className = 'compare-select';

            files.forEach(filename => {
                const leftOption = document.createElement('option');
                leftOption.value = filename;
                leftOption.textContent = getComparisonTrackOptionLabel(filename);
                leftSelect.appendChild(leftOption);

                const rightOption = document.createElement('option');
                rightOption.value = filename;
                rightOption.textContent = getComparisonTrackOptionLabel(filename);
                rightSelect.appendChild(rightOption);
            });

            const compareSelection = getCompareSelection();
            leftSelect.value = compareSelection.leftFilename;
            rightSelect.value = compareSelection.rightFilename;

            leftGroup.appendChild(leftLabel);
            leftGroup.appendChild(leftSelect);
            rightGroup.appendChild(rightLabel);
            rightGroup.appendChild(rightSelect);
            controls.appendChild(leftGroup);
            controls.appendChild(rightGroup);

            const actions = document.createElement('div');
            actions.className = 'compare-actions';

            const mapBtn = document.createElement('button');
            mapBtn.className = 'action-btn-secondary';
            mapBtn.textContent = 'Auf Karte vergleichen';

            const swapBtn = document.createElement('button');
            swapBtn.className = 'action-btn-secondary';
            swapBtn.textContent = 'Links/Rechts tauschen';

            actions.appendChild(mapBtn);
            actions.appendChild(swapBtn);

            const results = document.createElement('section');
            results.className = 'compare-results';
            results.innerHTML = '<p class="placeholder-text">Vergleich wird vorbereitet ...</p>';

            content.appendChild(smartSuggestionSection);
            content.appendChild(controls);
            content.appendChild(actions);
            content.appendChild(results);

            const requestId = ++compareRenderRequestId;
            const leftSummary = await collectComparisonSummary(getCurrentProfile(), compareSelection.leftFilename);
            const rightSummary = await collectComparisonSummary(getCurrentProfile(), compareSelection.rightFilename);

            if (requestId !== compareRenderRequestId) {
                return;
            }

            if (!leftSummary || !rightSummary) {
                results.innerHTML = '<p class="placeholder-text">Vergleichsdaten konnten nicht vollständig geladen werden.</p>';
                return;
            }

            mapBtn.onclick = () => showComparisonOnMap(leftSummary, rightSummary);
            swapBtn.onclick = async () => {
                const currentCompareSelection = getCompareSelection();
                const nextLeft = currentCompareSelection.rightFilename;
                const nextRight = currentCompareSelection.leftFilename;
                currentCompareSelection.leftFilename = nextLeft;
                currentCompareSelection.rightFilename = nextRight;
                await renderComparisonModal();
            };

            leftSelect.onchange = async (event) => {
                const currentCompareSelection = getCompareSelection();
                currentCompareSelection.leftFilename = event.target.value;
                if (currentCompareSelection.leftFilename === currentCompareSelection.rightFilename) {
                    const alternative = files.find(file => file !== currentCompareSelection.leftFilename);
                    if (alternative) {
                        currentCompareSelection.rightFilename = alternative;
                    }
                }
                await renderComparisonModal();
            };

            rightSelect.onchange = async (event) => {
                const currentCompareSelection = getCompareSelection();
                currentCompareSelection.rightFilename = event.target.value;
                if (currentCompareSelection.rightFilename === currentCompareSelection.leftFilename) {
                    const alternative = files.find(file => file !== currentCompareSelection.rightFilename);
                    if (alternative) {
                        currentCompareSelection.leftFilename = alternative;
                    }
                }
                await renderComparisonModal();
            };

            results.innerHTML = '';

            const cards = document.createElement('div');
            cards.className = 'compare-cards';
            cards.appendChild(createComparisonTrackCard(leftSummary, 'left'));
            cards.appendChild(createComparisonTrackCard(rightSummary, 'right'));

            results.appendChild(cards);
            results.appendChild(createComparisonMetricTable(leftSummary, rightSummary));
        }

        return {
            initComparisonModal,
            showComparisonOnMap,
            renderComparisonModal
        };
    }

    globalScope.createComparisonView = createComparisonView;
})(window);
