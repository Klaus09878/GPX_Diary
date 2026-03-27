(function attachOutlierCandidateAssemblyViewFactory(globalScope) {
    function createOutlierCandidateAssemblyView({
        toFiniteNumber,
        calculateSegmentDistanceMeters,
        formatOutlierPointLabel
    }) {
        function mergeOutlierBases(bases) {
            const merged = [];

            bases
                .filter(base => base && Number.isInteger(base.startIndex) && Number.isInteger(base.endIndex))
                .sort((left, right) => left.startIndex - right.startIndex)
                .forEach(base => {
                    const normalizedBase = {
                        startIndex: base.startIndex,
                        endIndex: base.endIndex,
                        typeKeys: Array.isArray(base.typeKeys) ? [...base.typeKeys] : [base.typeKey || 'unrealistic_speed'],
                        maxSpeedKmh: Number.isFinite(base.maxSpeedKmh) ? base.maxSpeedKmh : 0,
                        maxDistanceMeters: Number.isFinite(base.maxDistanceMeters) ? base.maxDistanceMeters : 0,
                        durationSeconds: Number.isFinite(base.durationSeconds) ? base.durationSeconds : 0,
                        distanceMeters: Number.isFinite(base.distanceMeters) ? base.distanceMeters : 0
                    };

                    const previous = merged[merged.length - 1];
                    if (!previous || normalizedBase.startIndex > previous.endIndex + 1) {
                        merged.push(normalizedBase);
                        return;
                    }

                    previous.endIndex = Math.max(previous.endIndex, normalizedBase.endIndex);
                    previous.typeKeys = Array.from(new Set([...previous.typeKeys, ...normalizedBase.typeKeys]));
                    previous.maxSpeedKmh = Math.max(previous.maxSpeedKmh, normalizedBase.maxSpeedKmh);
                    previous.maxDistanceMeters = Math.max(previous.maxDistanceMeters, normalizedBase.maxDistanceMeters);
                    previous.durationSeconds += normalizedBase.durationSeconds;
                    previous.distanceMeters += normalizedBase.distanceMeters;
                });

            return merged;
        }

        function finalizeOutlierCandidates(candidateBases, points) {
            return candidateBases.map((base, index) => {
                const slice = points.slice(base.startIndex, base.endIndex + 1);
                const firstPoint = slice[0];
                const lastPoint = slice[slice.length - 1];
                const startTimeMs = toFiniteNumber(firstPoint?.meta?.timeMs);
                const endTimeMs = toFiniteNumber(lastPoint?.meta?.timeMs);
                const primaryType = base.typeKeys.includes('gps_jump')
                    ? 'gps_jump'
                    : base.typeKeys.includes('vehicle_speed')
                        ? 'vehicle_speed'
                        : 'unrealistic_speed';

                let distanceMeters = 0;
                for (let pointIndex = 1; pointIndex < slice.length; pointIndex += 1) {
                    distanceMeters += calculateSegmentDistanceMeters(slice[pointIndex - 1], slice[pointIndex]);
                }

                const durationMinutes = Number.isFinite(startTimeMs) && Number.isFinite(endTimeMs) && endTimeMs > startTimeMs
                    ? (endTimeMs - startTimeMs) / 60000
                    : (base.durationSeconds > 0 ? base.durationSeconds / 60 : null);

                const reasonParts = [];
                if (base.typeKeys.includes('gps_jump')) {
                    reasonParts.push(`Sprung bis ${Math.round(base.maxDistanceMeters)} m`);
                }
                if (base.typeKeys.includes('vehicle_speed')) {
                    reasonParts.push(`länger ungewöhnlich schnell`);
                }
                if (base.typeKeys.includes('unrealistic_speed')) {
                    reasonParts.push(`Tempo-Spitze bis ${Math.round(base.maxSpeedKmh)} km/h`);
                }

                return {
                    id: `outlier-${index + 1}`,
                    startIndex: base.startIndex,
                    endIndex: base.endIndex,
                    type: primaryType,
                    typeKeys: base.typeKeys,
                    title: primaryType === 'gps_jump'
                        ? 'GPS-Sprung'
                        : primaryType === 'vehicle_speed'
                            ? 'Fahrzeug-Abschnitt'
                            : 'Unplausible Tempo-Spitze',
                    reasonText: reasonParts.join(' · '),
                    pointCount: slice.length,
                    distanceKm: distanceMeters / 1000,
                    durationMinutes,
                    maxSpeedKmh: base.maxSpeedKmh,
                    startLabel: formatOutlierPointLabel(firstPoint, base.startIndex),
                    endLabel: formatOutlierPointLabel(lastPoint, base.endIndex),
                    decision: null,
                    layer: null
                };
            });
        }

        return {
            mergeOutlierBases,
            finalizeOutlierCandidates
        };
    }

    globalScope.createOutlierCandidateAssemblyView = createOutlierCandidateAssemblyView;
})(window);
