(function attachSpeedThresholdServiceFactory(globalScope) {
    function createSpeedThresholdService({ getCurrentProfile }) {
        function getSpeedThresholdsForProfile(profile = getCurrentProfile()) {
            if (profile === 'spazieren') {
                return { normalMin: 4, normalMax: 6 };
            }
            if (profile === 'laufen') {
                return { normalMin: 8, normalMax: 12 };
            }
            if (profile === 'motorrad') {
                return { normalMin: 40, normalMax: 80 };
            }
            return { normalMin: 20, normalMax: 30 };
        }

        function updateSpeedLabels() {
            const thresholds = getSpeedThresholdsForProfile();
            const slow = document.getElementById('label-slow');
            const normal = document.getElementById('label-normal');
            const fast = document.getElementById('label-fast');

            if (slow) slow.textContent = `(< ${thresholds.normalMin} km/h)`;
            if (normal) normal.textContent = `(${thresholds.normalMin}-${thresholds.normalMax} km/h)`;
            if (fast) fast.textContent = `(> ${thresholds.normalMax} km/h)`;
        }

        function updateElevationLabels() {
            const l1 = document.getElementById('label-elev-flat');
            const l2 = document.getElementById('label-elev-hilly');
            const l3 = document.getElementById('label-elev-mountain');
            if (l1) l1.textContent = '(< 200m)';
            if (l2) l2.textContent = '(200-800m)';
            if (l3) l3.textContent = '(> 800m)';
        }

        return {
            getSpeedThresholdsForProfile,
            updateSpeedLabels,
            updateElevationLabels
        };
    }

    globalScope.createSpeedThresholdService = createSpeedThresholdService;
})(window);
