(function attachPrAlertsServiceFactory(globalScope) {
    function createPrAlertsService({
        alertDistanceMeters,
        buildPrLeaderboard,
        buildTopClimbRanking,
        formatDistanceLabel,
        formatEffortTime,
        getTrackDisplayName,
        getCurrentProfile,
        getTracksByProfile,
        getPrAlertBaselineByProfile,
        setPrAlertBaselineByProfile,
        collectProfileAnalysisEntries,
        persistUiState,
        showToast
    }) {
        function buildPersonalRecordSnapshot(entries) {
            const distances = {};

            alertDistanceMeters.forEach(distanceMeters => {
                const leaderboard = buildPrLeaderboard(entries, distanceMeters).slice(0, 3);
                distances[distanceMeters] = {
                    bestTimeSeconds: Number(leaderboard[0]?.timeSeconds) || null,
                    top3: leaderboard.map(record => ({
                        filename: record.filename,
                        timeSeconds: Number(record.timeSeconds) || 0,
                        signature: `${record.filename}:${(Number(record.timeSeconds) || 0).toFixed(2)}`
                    }))
                };
            });

            const bestClimb = buildTopClimbRanking(entries)[0] || null;

            return {
                distances,
                bestClimb: bestClimb
                    ? {
                        filename: bestClimb.filename,
                        gainM: Number(bestClimb.gainM) || 0,
                        signature: `${bestClimb.filename}:${(Number(bestClimb.gainM) || 0).toFixed(1)}`
                    }
                    : null
            };
        }

        function createPersonalRecordAlertMessages(previousSnapshot, nextSnapshot) {
            const messages = [];

            alertDistanceMeters.forEach(distanceMeters => {
                const previousDistance = previousSnapshot?.distances?.[distanceMeters] || {};
                const nextDistance = nextSnapshot?.distances?.[distanceMeters] || {};

                const previousBest = Number(previousDistance.bestTimeSeconds);
                const nextBest = Number(nextDistance.bestTimeSeconds);
                if (Number.isFinite(previousBest) && Number.isFinite(nextBest) && nextBest < previousBest - 0.35) {
                    messages.push(`Neue Bestzeit über ${formatDistanceLabel(distanceMeters)}: ${formatEffortTime(nextBest)}.`);
                }

                const previousTop3 = new Set((previousDistance.top3 || []).map(entry => entry.signature));
                const newcomer = (nextDistance.top3 || []).find(entry => !previousTop3.has(entry.signature));
                if (newcomer && previousTop3.size > 0) {
                    messages.push(`Top-3 Update über ${formatDistanceLabel(distanceMeters)}: ${getTrackDisplayName(newcomer.filename)} jetzt vorne dabei.`);
                }
            });

            const previousClimbGain = Number(previousSnapshot?.bestClimb?.gainM);
            const nextClimbGain = Number(nextSnapshot?.bestClimb?.gainM);
            if (Number.isFinite(previousClimbGain) && Number.isFinite(nextClimbGain) && nextClimbGain > previousClimbGain + 4) {
                messages.push(`Neuer Top-Anstieg: +${Math.round(nextClimbGain)} m am Stück.`);
            }

            return messages.slice(0, 4);
        }

        async function runPersonalRecordAlertCheck(options = {}) {
            const currentProfile = getCurrentProfile();
            const files = getTracksByProfile(currentProfile) || [];
            if (!files.length || options.startup) {
                return;
            }

            try {
                const entries = await collectProfileAnalysisEntries();
                if (!entries.length) {
                    return;
                }

                const nextSnapshot = buildPersonalRecordSnapshot(entries);
                const baselineByProfile = getPrAlertBaselineByProfile();
                const previousSnapshot = baselineByProfile[currentProfile] || null;

                setPrAlertBaselineByProfile({
                    ...baselineByProfile,
                    [currentProfile]: nextSnapshot
                });
                persistUiState();

                if (!previousSnapshot) {
                    return;
                }

                const alerts = createPersonalRecordAlertMessages(previousSnapshot, nextSnapshot);
                alerts.forEach((message, index) => {
                    globalScope.setTimeout(() => {
                        showToast(message, 'success');
                    }, index * 900);
                });
            } catch (error) {
                console.error('PR-Alert-Prüfung fehlgeschlagen:', error);
            }
        }

        return {
            buildPersonalRecordSnapshot,
            createPersonalRecordAlertMessages,
            runPersonalRecordAlertCheck
        };
    }

    globalScope.createPrAlertsService = createPrAlertsService;
})(window);
