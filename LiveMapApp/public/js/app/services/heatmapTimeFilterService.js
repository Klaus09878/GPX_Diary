(function attachHeatmapTimeFilterServiceFactory(globalScope) {
    function createHeatmapTimeFilterService({
        toFiniteNumber,
        getHeatmapTimeFilters,
        setHeatmapTimeFilters,
        persistUiState,
        getIsHeatmapActive,
        updateHeatmap
    }) {
        function getHeatmapPointTimestampMs(point) {
            const directTimestamp = toFiniteNumber(point?.meta?.timeMs);
            if (directTimestamp !== null) {
                return directTimestamp;
            }

            const parsed = Date.parse(point?.meta?.time || '');
            return Number.isFinite(parsed) ? parsed : null;
        }

        function getHeatmapSeason(dateValue) {
            const month = dateValue.getMonth();
            if (month === 11 || month <= 1) {
                return 'winter';
            }
            if (month <= 4) {
                return 'spring';
            }
            if (month <= 7) {
                return 'summer';
            }
            return 'autumn';
        }

        function getHeatmapWeekdayToken(dateValue) {
            return ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'][dateValue.getDay()];
        }

        function isHeatmapPointMatchingTimeFilters(point) {
            const heatmapTimeFilters = getHeatmapTimeFilters();
            const daytimeFilter = heatmapTimeFilters.daytime || 'all';
            const weekdayFilter = heatmapTimeFilters.weekday || 'all';
            const seasonFilter = heatmapTimeFilters.season || 'all';

            if (daytimeFilter === 'all' && weekdayFilter === 'all' && seasonFilter === 'all') {
                return true;
            }

            const timestampMs = getHeatmapPointTimestampMs(point);
            if (!Number.isFinite(timestampMs)) {
                return false;
            }

            const dateValue = new Date(timestampMs);
            const hour = dateValue.getHours();
            const isDaytime = hour >= 6 && hour < 18;

            if (daytimeFilter === 'day' && !isDaytime) {
                return false;
            }
            if (daytimeFilter === 'night' && isDaytime) {
                return false;
            }

            const weekdayToken = getHeatmapWeekdayToken(dateValue);
            if (weekdayFilter === 'weekday' && (weekdayToken === 'sat' || weekdayToken === 'sun')) {
                return false;
            }
            if (weekdayFilter === 'weekend' && !(weekdayToken === 'sat' || weekdayToken === 'sun')) {
                return false;
            }

            if (['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'].includes(weekdayFilter) && weekdayFilter !== weekdayToken) {
                return false;
            }

            const seasonToken = getHeatmapSeason(dateValue);
            if (seasonFilter !== 'all' && seasonFilter !== seasonToken) {
                return false;
            }

            return true;
        }

        function initHeatmapTimeFilters() {
            const filterControls = [
                { id: 'heatmap-filter-daytime', key: 'daytime', allowed: ['all', 'day', 'night'] },
                { id: 'heatmap-filter-weekday', key: 'weekday', allowed: ['all', 'weekday', 'weekend', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] },
                { id: 'heatmap-filter-season', key: 'season', allowed: ['all', 'spring', 'summer', 'autumn', 'winter'] }
            ];

            filterControls.forEach(control => {
                const element = document.getElementById(control.id);
                if (!element) {
                    return;
                }

                const heatmapTimeFilters = getHeatmapTimeFilters();
                const currentValue = heatmapTimeFilters[control.key];
                element.value = control.allowed.includes(currentValue) ? currentValue : 'all';

                element.onchange = () => {
                    const value = control.allowed.includes(element.value) ? element.value : 'all';
                    setHeatmapTimeFilters({
                        ...getHeatmapTimeFilters(),
                        [control.key]: value
                    });

                    persistUiState();

                    if (getIsHeatmapActive()) {
                        updateHeatmap();
                    }
                };
            });
        }

        return {
            getHeatmapPointTimestampMs,
            getHeatmapSeason,
            getHeatmapWeekdayToken,
            isHeatmapPointMatchingTimeFilters,
            initHeatmapTimeFilters
        };
    }

    globalScope.createHeatmapTimeFilterService = createHeatmapTimeFilterService;
})(window);
