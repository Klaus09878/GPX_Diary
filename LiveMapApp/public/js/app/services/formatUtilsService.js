(function attachFormatUtilsServiceFactory(globalScope) {
    function createFormatUtilsService() {
        function formatNumericInputValue(value, fractionDigits = 1) {
            const numericValue = Number(value);
            if (!Number.isFinite(numericValue)) {
                return '';
            }

            return Number(numericValue.toFixed(fractionDigits)).toString();
        }

        function formatDashboardNumber(value, digits = 1) {
            const safeValue = Number.isFinite(value) ? value : 0;
            return safeValue.toLocaleString('de-DE', {
                minimumFractionDigits: digits,
                maximumFractionDigits: digits
            });
        }

        function formatDashboardDate(dateMs) {
            if (!dateMs || dateMs <= 0) {
                return 'Unbekannt';
            }

            return new Date(dateMs).toLocaleDateString('de-DE');
        }

        function formatThresholdLabel(value, unit) {
            const numericValue = Number(value);
            if (!Number.isFinite(numericValue)) {
                return `>${unit ? ` 0 ${unit}` : '0'}`;
            }

            const precision = Math.abs(numericValue % 1) < 0.001 ? 0 : 1;
            return `>${formatDashboardNumber(numericValue, precision)}${unit ? ` ${unit}` : ''}`;
        }

        function formatDistanceLabel(distanceMeters) {
            return distanceMeters >= 1000
                ? `${(distanceMeters / 1000).toLocaleString('de-DE')} km`
                : `${distanceMeters} m`;
        }

        function toPercentShare(value, total) {
            if (!Number.isFinite(value) || value <= 0 || !Number.isFinite(total) || total <= 0) {
                return 0;
            }

            return (value / total) * 100;
        }

        function formatDistanceKm(distanceM, fractionDigits = 2) {
            const kilometers = Number.isFinite(distanceM) ? Math.max(0, distanceM) / 1000 : 0;
            return `${formatDashboardNumber(kilometers, fractionDigits)} km`;
        }

        return {
            formatNumericInputValue,
            formatDashboardNumber,
            formatDashboardDate,
            formatThresholdLabel,
            formatDistanceLabel,
            toPercentShare,
            formatDistanceKm
        };
    }

    globalScope.createFormatUtilsService = createFormatUtilsService;
})(window);
