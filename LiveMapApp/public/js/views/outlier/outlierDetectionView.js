(function attachOutlierDetectionViewFactory(globalScope) {
    function createOutlierDetectionView({
        getOutlierDetectionRules,
        buildTrackSegments,
        mergeOutlierBases,
        finalizeOutlierCandidates
    }) {
        function detectOutlierCandidates(points, profile) {
            if (!Array.isArray(points) || points.length < 3) {
                return [];
            }

            const rules = getOutlierDetectionRules(profile);
            const segments = buildTrackSegments(points);
            const bases = [];

            let jumpRun = null;
            segments.forEach(segment => {
                const hasFiniteSpeed = Number.isFinite(segment.speedKmh) && segment.speedKmh > 0;
                const isJump = segment.distanceMeters >= rules.jumpDistanceM && (
                    (segment.deltaSeconds !== null && segment.deltaSeconds <= rules.jumpWindowS && hasFiniteSpeed && segment.speedKmh >= Math.max(rules.hardMaxSpeedKmh * 1.15, rules.sustainedSpeedKmh * 1.35)) ||
                    (segment.deltaSeconds === null && segment.distanceMeters >= rules.jumpDistanceM * 4)
                );

                if (isJump) {
                    if (!jumpRun) {
                        jumpRun = {
                            startIndex: segment.startIndex,
                            endIndex: segment.endIndex,
                            typeKeys: ['gps_jump'],
                            maxSpeedKmh: hasFiniteSpeed ? segment.speedKmh : 0,
                            maxDistanceMeters: segment.distanceMeters,
                            durationSeconds: segment.deltaSeconds || 0,
                            distanceMeters: segment.distanceMeters
                        };
                        return;
                    }

                    jumpRun.endIndex = segment.endIndex;
                    jumpRun.maxSpeedKmh = Math.max(jumpRun.maxSpeedKmh, hasFiniteSpeed ? segment.speedKmh : 0);
                    jumpRun.maxDistanceMeters = Math.max(jumpRun.maxDistanceMeters, segment.distanceMeters);
                    jumpRun.durationSeconds += segment.deltaSeconds || 0;
                    jumpRun.distanceMeters += segment.distanceMeters;
                    return;
                }

                if (jumpRun) {
                    bases.push(jumpRun);
                    jumpRun = null;
                }
            });
            if (jumpRun) {
                bases.push(jumpRun);
            }

            if (rules.enableVehicleLike) {
                let speedRun = null;

                segments.forEach(segment => {
                    const isVehicleLike = Number.isFinite(segment.speedKmh) && segment.speedKmh >= rules.sustainedSpeedKmh;
                    if (isVehicleLike) {
                        if (!speedRun) {
                            speedRun = {
                                startIndex: segment.startIndex,
                                endIndex: segment.endIndex,
                                typeKeys: ['vehicle_speed'],
                                maxSpeedKmh: segment.speedKmh,
                                maxDistanceMeters: segment.distanceMeters,
                                durationSeconds: segment.deltaSeconds || 0,
                                distanceMeters: segment.distanceMeters
                            };
                            return;
                        }

                        speedRun.endIndex = segment.endIndex;
                        speedRun.maxSpeedKmh = Math.max(speedRun.maxSpeedKmh, segment.speedKmh);
                        speedRun.maxDistanceMeters = Math.max(speedRun.maxDistanceMeters, segment.distanceMeters);
                        speedRun.durationSeconds += segment.deltaSeconds || 0;
                        speedRun.distanceMeters += segment.distanceMeters;
                        return;
                    }

                    if (speedRun) {
                        if (speedRun.durationSeconds >= rules.sustainedMinDurationS || speedRun.distanceMeters >= rules.sustainedMinDistanceM) {
                            bases.push(speedRun);
                        }
                        speedRun = null;
                    }
                });

                if (speedRun && (speedRun.durationSeconds >= rules.sustainedMinDurationS || speedRun.distanceMeters >= rules.sustainedMinDistanceM)) {
                    bases.push(speedRun);
                }
            }

            const preliminary = mergeOutlierBases(bases);

            segments.forEach(segment => {
                const hasFiniteSpeed = Number.isFinite(segment.speedKmh) && segment.speedKmh > rules.hardMaxSpeedKmh;
                const isCovered = preliminary.some(candidate => segment.startIndex >= candidate.startIndex && segment.endIndex <= candidate.endIndex);

                if (isCovered || !hasFiniteSpeed || segment.distanceMeters < rules.hardMinSegmentDistanceM) {
                    return;
                }

                preliminary.push({
                    startIndex: segment.startIndex,
                    endIndex: segment.endIndex,
                    typeKeys: ['unrealistic_speed'],
                    maxSpeedKmh: segment.speedKmh,
                    maxDistanceMeters: segment.distanceMeters,
                    durationSeconds: segment.deltaSeconds || 0,
                    distanceMeters: segment.distanceMeters
                });
            });

            const merged = mergeOutlierBases(preliminary).filter(candidate => candidate.endIndex > candidate.startIndex);
            return finalizeOutlierCandidates(merged, points);
        }

        return {
            detectOutlierCandidates
        };
    }

    globalScope.createOutlierDetectionView = createOutlierDetectionView;
})(window);
