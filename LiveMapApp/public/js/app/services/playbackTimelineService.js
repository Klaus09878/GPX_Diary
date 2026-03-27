(function attachPlaybackTimelineServiceFactory(globalScope) {
    function createPlaybackTimelineService({ calculateSegmentDistanceMeters }) {
        function resolvePointSpeedKmh(point, previousPoint) {
            const explicitSpeed = Number(point?.meta?.speedKmh);
            if (Number.isFinite(explicitSpeed) && explicitSpeed >= 0) {
                return Math.min(explicitSpeed, 200);
            }

            const currentTimeMs = Number(point?.meta?.timeMs || Date.parse(point?.meta?.time || ''));
            const previousTimeMs = Number(previousPoint?.meta?.timeMs || Date.parse(previousPoint?.meta?.time || ''));

            if (previousPoint && Number.isFinite(currentTimeMs) && Number.isFinite(previousTimeMs)) {
                const deltaSeconds = (currentTimeMs - previousTimeMs) / 1000;
                if (deltaSeconds > 0 && deltaSeconds < 600) {
                    const deltaMeters = calculateSegmentDistanceMeters(previousPoint, point);
                    return Math.min((deltaMeters / deltaSeconds) * 3.6, 200);
                }
            }

            return 0;
        }

        function buildPlaybackTimeline(points) {
            if (!Array.isArray(points) || points.length === 0) {
                return [];
            }

            const timeline = [0];
            let elapsedSeconds = 0;

            for (let index = 1; index < points.length; index += 1) {
                const previousPoint = points[index - 1];
                const currentPoint = points[index];
                let deltaSeconds = null;

                const currentTimeMs = Number(currentPoint?.meta?.timeMs);
                const previousTimeMs = Number(previousPoint?.meta?.timeMs);
                if (Number.isFinite(currentTimeMs) && Number.isFinite(previousTimeMs)) {
                    const timeDelta = (currentTimeMs - previousTimeMs) / 1000;
                    if (timeDelta > 0 && timeDelta < 600) {
                        deltaSeconds = timeDelta;
                    }
                }

                const distanceMeters = calculateSegmentDistanceMeters(previousPoint, currentPoint);

                if (!Number.isFinite(deltaSeconds)) {
                    const speedKmh = resolvePointSpeedKmh(currentPoint, previousPoint);
                    if (Number.isFinite(speedKmh) && speedKmh > 0.25 && Number.isFinite(distanceMeters) && distanceMeters >= 0) {
                        deltaSeconds = (distanceMeters / speedKmh) * 3.6;
                    }
                }

                if (!Number.isFinite(deltaSeconds) || deltaSeconds <= 0) {
                    if (Number.isFinite(distanceMeters) && distanceMeters > 0) {
                        deltaSeconds = Math.max(0.4, Math.min(12, distanceMeters / 2.5));
                    } else {
                        deltaSeconds = 0.4;
                    }
                }

                elapsedSeconds += Math.min(Math.max(deltaSeconds, 0.1), 90);
                timeline.push(elapsedSeconds);
            }

            return timeline;
        }

        return {
            resolvePointSpeedKmh,
            buildPlaybackTimeline
        };
    }

    globalScope.createPlaybackTimelineService = createPlaybackTimelineService;
})(window);
