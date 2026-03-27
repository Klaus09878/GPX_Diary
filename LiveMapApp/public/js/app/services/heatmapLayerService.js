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
        function getHeatmapSourceEntries() {
            const map = getMap();
            if (getIsGlobalHeatmapActive()) {
                return Object.values(getCachedTracks()).filter(entry => entry?.layer);
            }

            return Object.entries(getTrackLayers())
                .filter(([, layer]) => map.hasLayer(layer))
                .map(([filename]) => getCachedTrack(getCurrentProfile(), filename))
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

        function sampleTrackPointsForHeatmap(points) {
            if (!Array.isArray(points) || points.length === 0) {
                return [];
            }

            const samples = [];
            let lastDistance = null;

            points.forEach((point, index) => {
                if (!isFiniteTrackPoint(point)) {
                    return;
                }

                if (!isHeatmapPointMatchingTimeFilters(point)) {
                    return;
                }

                const currentDistance = Number.isFinite(point.dist) ? point.dist : index * heatmapSampleDistanceM;
                if (lastDistance === null || currentDistance - lastDistance >= heatmapSampleDistanceM || index === points.length - 1) {
                    samples.push(point);
                    lastDistance = currentDistance;
                }
            });

            return samples;
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

        function buildHeatmapBucketsByProfile(sourceEntries) {
            const profileBuckets = new Map();
            let maxBucketCount = 1;

            sourceEntries.forEach(entry => {
                const profile = entry?.profile || getCurrentProfile();
                if (!profileBuckets.has(profile)) {
                    profileBuckets.set(profile, new Map());
                }

                const profileMap = profileBuckets.get(profile);
                const samples = sampleTrackPointsForHeatmap(getHeatmapPointsForEntry(entry));

                samples.forEach(point => {
                    const lat = Number(point.lat);
                    const lng = Number(point.lng);
                    if (!isValidMapCoordinatePair(lat, lng)) {
                        return;
                    }

                    const latKey = Math.round(lat * heatmapGridFactor);
                    const lngKey = Math.round(lng * heatmapGridFactor);
                    const key = `${latKey}:${lngKey}`;
                    const bucket = profileMap.get(key) || { latSum: 0, lngSum: 0, count: 0 };

                    bucket.latSum += lat;
                    bucket.lngSum += lng;
                    bucket.count += 1;

                    if (bucket.count > maxBucketCount) {
                        maxBucketCount = bucket.count;
                    }

                    profileMap.set(key, bucket);
                });
            });

            return { profileBuckets, maxBucketCount };
        }

        function updateHeatmap() {
            const L = getLeaflet();
            if (typeof L === 'undefined' || typeof L.heatLayer !== 'function') {
                return;
            }

            clearHeatmapLayers();

            if (!getIsHeatmapActive()) {
                return;
            }
            if (!canRenderMapOverlays()) {
                return;
            }

            const sourceEntries = getHeatmapSourceEntries();
            const { profileBuckets, maxBucketCount } = buildHeatmapBucketsByProfile(sourceEntries);
            const map = getMap();
            const nextLayers = [...getHeatmapLayers()];

            profileBuckets.forEach((buckets, profile) => {
                const points = Array.from(buckets.values())
                    .map(bucket => {
                        if (!bucket || !Number.isFinite(bucket.count) || bucket.count <= 0) {
                            return null;
                        }

                        const avgLat = bucket.latSum / bucket.count;
                        const avgLng = bucket.lngSum / bucket.count;
                        if (!isValidMapCoordinatePair(avgLat, avgLng)) {
                            return null;
                        }

                        const rawRatio = bucket.count / maxBucketCount;
                        const weighted = 0.08 + Math.pow(rawRatio, 0.72) * 0.92;
                        return [avgLat, avgLng, Math.max(0.08, Math.min(1, weighted))];
                    })
                    .filter(Boolean);

                if (!points.length) {
                    return;
                }

                const heatLayer = L.heatLayer(points, {
                    radius: getIsGlobalHeatmapActive() ? 22 : 20,
                    blur: getIsGlobalHeatmapActive() ? 20 : 18,
                    maxZoom: 13,
                    minOpacity: getIsGlobalHeatmapActive() ? 0.26 : 0.34,
                    gradient: buildHeatmapGradientForProfile(profile)
                }).addTo(map);

                nextLayers.push(heatLayer);
            });

            setHeatmapLayers(nextLayers);
        }

        return {
            getHeatmapSourceEntries,
            getHeatmapPointsForEntry,
            sampleTrackPointsForHeatmap,
            clearHeatmapLayers,
            buildHeatmapBucketsByProfile,
            updateHeatmap
        };
    }

    globalScope.createHeatmapLayerService = createHeatmapLayerService;
})(window);
