(function attachSegmentFavoriteHelperServiceFactory(globalScope) {
    function createSegmentFavoriteHelperService({ formatMetricValue }) {
        function buildSegmentFavoriteKey(filename, startIndex, endIndex) {
            return `${String(filename || '')}::${Number(startIndex) || 0}::${Number(endIndex) || 0}`;
        }

        function getSegmentFavoriteLabel(favorite, fallbackIndex = 0) {
            const label = typeof favorite?.label === 'string' ? favorite.label.trim() : '';
            if (label) {
                return label;
            }

            return `Segment ${fallbackIndex + 1}`;
        }

        function formatSegmentPointRange(startIndex, endIndex) {
            const start = Math.max(0, Number(startIndex) || 0) + 1;
            const end = Math.max(start, Number(endIndex) || startIndex || 0) + 1;
            return `Punkt ${start} bis ${end}`;
        }

        function getSegmentFavoriteRangeInfo(entry, favorite) {
            const matchingClimb = (entry?.climbs || []).find(climb => (
                Number(climb.startIndex) === Number(favorite.startIndex)
                && Number(climb.endIndex) === Number(favorite.endIndex)
            ));

            if (matchingClimb) {
                return `${formatMetricValue(matchingClimb.distanceKm, 'km', 2)} · +${formatMetricValue(matchingClimb.gainM, 'm', 0)} · ${formatMetricValue(matchingClimb.avgGrade, '%', 1)}`;
            }

            return formatSegmentPointRange(favorite.startIndex, favorite.endIndex);
        }

        return {
            buildSegmentFavoriteKey,
            getSegmentFavoriteLabel,
            formatSegmentPointRange,
            getSegmentFavoriteRangeInfo
        };
    }

    globalScope.createSegmentFavoriteHelperService = createSegmentFavoriteHelperService;
})(window);
