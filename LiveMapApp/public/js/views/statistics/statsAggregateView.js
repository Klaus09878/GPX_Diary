(function attachStatsAggregateViewFactory(globalScope) {
    function createStatsAggregateView() {
        function collectNumericValues(points, extractor) {
            if (!Array.isArray(points) || !points.length || typeof extractor !== 'function') {
                return [];
            }

            return points
                .map(extractor)
                .filter(value => Number.isFinite(value));
        }

        function calculateAverage(values) {
            if (!Array.isArray(values) || !values.length) {
                return null;
            }

            return values.reduce((sum, value) => sum + value, 0) / values.length;
        }

        function calculateMax(values) {
            if (!Array.isArray(values) || !values.length) {
                return null;
            }

            return Math.max(...values);
        }

        return {
            collectNumericValues,
            calculateAverage,
            calculateMax
        };
    }

    globalScope.createStatsAggregateView = createStatsAggregateView;
})(window);
