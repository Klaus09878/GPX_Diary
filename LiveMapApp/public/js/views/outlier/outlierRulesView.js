(function attachOutlierRulesViewFactory(globalScope) {
    function createOutlierRulesView() {
        function getOutlierDetectionRules(profile) {
            if (profile === 'spazieren') {
                return {
                    hardMaxSpeedKmh: 15,
                    sustainedSpeedKmh: 11,
                    sustainedMinDurationS: 45,
                    sustainedMinDistanceM: 180,
                    jumpDistanceM: 120,
                    jumpWindowS: 6,
                    hardMinSegmentDistanceM: 45,
                    enableVehicleLike: true
                };
            }

            if (profile === 'laufen') {
                return {
                    hardMaxSpeedKmh: 28,
                    sustainedSpeedKmh: 21,
                    sustainedMinDurationS: 45,
                    sustainedMinDistanceM: 260,
                    jumpDistanceM: 150,
                    jumpWindowS: 6,
                    hardMinSegmentDistanceM: 60,
                    enableVehicleLike: true
                };
            }

            if (profile === 'motorrad') {
                return {
                    hardMaxSpeedKmh: 220,
                    sustainedSpeedKmh: 170,
                    sustainedMinDurationS: 120,
                    sustainedMinDistanceM: 1200,
                    jumpDistanceM: 350,
                    jumpWindowS: 5,
                    hardMinSegmentDistanceM: 120,
                    enableVehicleLike: false
                };
            }

            return {
                hardMaxSpeedKmh: 90,
                sustainedSpeedKmh: 58,
                sustainedMinDurationS: 80,
                sustainedMinDistanceM: 900,
                jumpDistanceM: 220,
                jumpWindowS: 5,
                hardMinSegmentDistanceM: 80,
                enableVehicleLike: true
            };
        }

        return {
            getOutlierDetectionRules
        };
    }

    globalScope.createOutlierRulesView = createOutlierRulesView;
})(window);
