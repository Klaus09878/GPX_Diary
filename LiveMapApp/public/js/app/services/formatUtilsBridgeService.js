(function(global) {
    function createFormatUtilsBridgeService(deps) {
        const {
            formatUtilsService,
            htmlEscapeService,
            getDisplayFormatViewApi
        } = deps;

        function escapeHtml(value) {
            return htmlEscapeService.escapeHtml(value);
        }

        function formatNumericInputValue(value, fractionDigits = 1) {
            return formatUtilsService.formatNumericInputValue(value, fractionDigits);
        }

        function formatThresholdLabel(value, unit) {
            return formatUtilsService.formatThresholdLabel(value, unit);
        }

        function formatDistanceLabel(distanceMeters) {
            return formatUtilsService.formatDistanceLabel(distanceMeters);
        }

        function toPercentShare(value, total) {
            return formatUtilsService.toPercentShare(value, total);
        }

        function formatDistanceKm(distanceM, fractionDigits = 2) {
            return formatUtilsService.formatDistanceKm(distanceM, fractionDigits);
        }

        function formatDashboardNumber(value, digits = 1) {
            return formatUtilsService.formatDashboardNumber(value, digits);
        }

        function formatDashboardDate(dateMs) {
            return formatUtilsService.formatDashboardDate(dateMs);
        }

        function getCompareAccentColor(columnKey) {
            return getDisplayFormatViewApi()?.getCompareAccentColor(columnKey);
        }

        function formatDurationMinutes(durationMinutes) {
            return getDisplayFormatViewApi()?.formatDurationMinutes(durationMinutes);
        }

        function formatPace(paceMinPerKm) {
            return getDisplayFormatViewApi()?.formatPace(paceMinPerKm);
        }

        function formatMetricValue(value, unit = '', digits = 1) {
            return getDisplayFormatViewApi()?.formatMetricValue(value, unit, digits);
        }

        function formatWeatherNumber(value, digits = 1) {
            return getDisplayFormatViewApi()?.formatWeatherNumber(value, digits);
        }

        function describeWeatherCode(code) {
            return getDisplayFormatViewApi()?.describeWeatherCode(code);
        }

        function formatWindDirection(directionDeg) {
            return getDisplayFormatViewApi()?.formatWindDirection(directionDeg);
        }

        return {
            escapeHtml,
            formatNumericInputValue,
            formatThresholdLabel,
            formatDistanceLabel,
            toPercentShare,
            formatDistanceKm,
            formatDashboardNumber,
            formatDashboardDate,
            getCompareAccentColor,
            formatDurationMinutes,
            formatPace,
            formatMetricValue,
            formatWeatherNumber,
            describeWeatherCode,
            formatWindDirection
        };
    }

    global.createFormatUtilsBridgeService = createFormatUtilsBridgeService;
})(window);
