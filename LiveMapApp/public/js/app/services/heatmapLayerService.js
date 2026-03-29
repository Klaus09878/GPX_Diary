(function attachHeatmapLayerServiceFactory(globalScope) {
    function createHeatmapLayerService({
        getLeaflet,
        getMap,
        getCurrentProfile,
        getCachedTracks,
        getTrackLayers,
        getCachedTrack,
        extractPointsSafely,
        getIsGlobalHeatmapActive,
        getIsHeatmapActive,
        canRenderMapOverlays,
        isValidMapCoordinatePair,
        isFiniteTrackPoint,
        isHeatmapPointMatchingTimeFilters,
        buildHeatmapGradientForProfile,
        heatmapSampleDistanceM,
        heatmapGridFactor,
        getHeatmapLayers,
        setHeatmapLayers
    }) {
        const GLOW_HEATMAP_GRADIENT = {
            // Niedrige Dichte (Dunst/Tiefe): Tiefes Blau/Lila
            0.10: '#000033', // Deep Blue
            0.30: '#003399', // Strong Blue

            // Mittlere Dichte (Sichtbare Wege): Cyan/Grün (Übergang)
            0.45: '#00ffff', // Cyan
            0.60: '#33ff00', // Vibrant Green

            // Hohe Dichte (Glow-Zone): Gelb/Orange
            0.75: '#ffff00', // Bright Yellow
            0.85: '#ff9900', // Vibrant Orange

            // Maximale Dichte (Kern): Red-Hot zu Weiß
            0.95: '#cc3300', // Deep Red (Heat)
            1.00: '#ffffff'  // Pure White (Glow core)
        };

        function getHeatmapSourceEntries() {
            // Only current profile, all loaded tracks
            return Object.keys(getTrackLayers())
                .map(filename => getCachedTrack(getCurrentProfile(), filename))
                .filter(Boolean);
        }

        function getHeatmapPointsForEntry(entry) {
            if (Array.isArray(entry?.points) && entry.points.length > 0) {
                return entry.points;
            }
            if (entry?.layer) {
                return extractPointsSafely(entry.layer);
            }
            return [];
        }

        function toBucketKey(lat, lng) {
            const latKey = Math.round(lat * heatmapGridFactor);
            const lngKey = Math.round(lng * heatmapGridFactor);
            return `${latKey}:${lngKey}`;
        }

        function decodeBucketKey(key) {
            const [latKeyRaw, lngKeyRaw] = String(key).split(':');
            const latKey = Number(latKeyRaw);
            const lngKey = Number(lngKeyRaw);

            if (!Number.isFinite(latKey) || !Number.isFinite(lngKey)) {
                return null;
            }

            return {
                lat: latKey / heatmapGridFactor,
                lng: lngKey / heatmapGridFactor
            };
        }

        function collectHeatmapPointBuckets(sourceEntries) {
            const buckets = new Map();
            let maxBucketCount = 1;

            sourceEntries.forEach((entry) => {
                const points = getHeatmapPointsForEntry(entry);
                if (!Array.isArray(points) || !points.length) {
                    return;
                }

                points.forEach((point) => {
                    if (!isFiniteTrackPoint(point)) {
                        return;
                    }
                    if (!isHeatmapPointMatchingTimeFilters(point)) {
                        return;
                    }

                    const lat = Number(point.lat);
                    const lng = Number(point.lng);
                    if (!isValidMapCoordinatePair(lat, lng)) {
                        return;
                    }

                    const key = toBucketKey(lat, lng);
                    const existing = buckets.get(key) || {
                        latLng: decodeBucketKey(key),
                        count: 0
                    };

                    if (!existing.latLng) {
                        return;
                    }

                    existing.count += 1;
                    buckets.set(key, existing);

                    if (existing.count > maxBucketCount) {
                        maxBucketCount = existing.count;
                    }
                });
            });

            return { buckets, maxBucketCount };
        }

        function toHeatmapIntensity(count, maxBucketCount) {
            if (!Number.isFinite(count) || count <= 0) {
                return 0.2;
            }

            const safeMax = Math.max(1, maxBucketCount);
            const logNormalized = Math.log1p(count) / Math.log1p(safeMax);
            const curved = Math.pow(Math.max(0, Math.min(1, logNormalized)), 0.55);

            let boosted = curved;
            if (count >= 2) boosted = Math.max(boosted, 0.38);
            if (count >= 4) boosted = Math.max(boosted, 0.56);
            if (count >= 8) boosted = Math.max(boosted, 0.74);
            if (count >= 16) boosted = Math.max(boosted, 0.9);

            return Math.max(0.2, Math.min(1, boosted));
        }

        function resolveRadiusForZoom(map) {
            if (!map || typeof map.getZoom !== 'function') {
                return 15;
            }

            const zoom = Number(map.getZoom());
            if (!Number.isFinite(zoom)) {
                return 15;
            }

            if (zoom < 10) {
                return 2;
            }

            if (zoom > 15) {
                return 20;
            }

            const ratio = (zoom - 10) / 5;
            return 2 + (18 * ratio);
        }

        function clearHeatmapLayers() {
            const map = getMap();
            const heatmapLayers = getHeatmapLayers();
            if (!Array.isArray(heatmapLayers) || !heatmapLayers.length) {
                setHeatmapLayers([]);
                return;
            }

            heatmapLayers.forEach(layer => {
                if (layer && map.hasLayer(layer)) {
                    map.removeLayer(layer);
                }
            });

            setHeatmapLayers([]);
        }

        let heatLayer = null;
        function updateHeatmap() {
            const L = getLeaflet();
            if (typeof L === 'undefined' || typeof L.heatLayer !== 'function') {
                return;
            }

            clearHeatmapLayers();
            heatLayer = null;

            if (!getIsHeatmapActive()) {
                return;
            }
            if (!canRenderMapOverlays()) {
                return;
            }

           // Collect ALL points from ALL tracks in current profile
            const sourceEntries = getHeatmapSourceEntries();
            const allPoints = [];
            
            sourceEntries.forEach(entry => {
                const points = getHeatmapPointsForEntry(entry);
                if (Array.isArray(points)) {
                    points.forEach(pt => {
                        if (pt && typeof pt.lat === 'number' && typeof pt.lng === 'number') {
                            // DER FIX: Intensität auf 0.1 setzen!
                            // Nur so addieren sich Strecken auf.
                            allPoints.push([pt.lat, pt.lng, 0.03]); // 0.03 sweetspot
                        }
                    });
                }
            });

            const map = getMap();
            if (!allPoints.length) {
                setHeatmapLayers([]);
                return;
            }

            // DIE PERFEKTEN GLOW-PARAMETER
            heatLayer = L.heatLayer(allPoints, {
                radius: 18,         // Etwas kleiner für präzisere Straßen
                blur: 15,           // Erzeugt den Neon-Glow am Rand
                max: 1.0,           // Ab wann es Weiß wird (1.0 = 10 Läufe auf der gleichen Strecke)
                minOpacity: 0.1,    // Damit man Strecken, die man nur 1x gelaufen ist, leicht blau sieht
                gradient: GLOW_HEATMAP_GRADIENT
            }).addTo(map);

            setHeatmapLayers([heatLayer]);

            // Attach dynamic zoom event for radius/blur
            if (map && typeof map.on === 'function') {
                map.off('zoomend', handleHeatmapZoom);
                map.on('zoomend', handleHeatmapZoom);
            }
        }

        function handleHeatmapZoom() {
            const map = getMap();
            if (!heatLayer || !map) return;
            const z = map.getZoom();
            if (z < 10) {
                heatLayer.setOptions({ radius: 2, blur: 1 });
            } else if (z < 13) {
                heatLayer.setOptions({ radius: 10, blur: 15 });
            } else {
                heatLayer.setOptions({ radius: 25, blur: 15 });
            }
        }

        return {
            getHeatmapSourceEntries,
            getHeatmapPointsForEntry,
            clearHeatmapLayers,
            collectHeatmapPointBuckets,
            updateHeatmap
        };
    }

    globalScope.createHeatmapLayerService = createHeatmapLayerService;
})(window);
