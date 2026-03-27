(function attachDisplayFormatViewFactory(globalScope) {
    function createDisplayFormatView() {
        function getCompareAccentColor(columnKey) {
            const rootStyles = getComputedStyle(document.documentElement);
            if (columnKey === 'left') {
                return rootStyles.getPropertyValue('--rennrad-color').trim() || '#3b82f6';
            }

            return rootStyles.getPropertyValue('--spazieren-color').trim() || '#a855f7';
        }

        function formatDurationMinutes(durationMinutes) {
            if (!Number.isFinite(durationMinutes) || durationMinutes <= 0) {
                return '—';
            }

            if (durationMinutes < 60) {
                return `${durationMinutes.toFixed(0)} min`;
            }

            const hours = Math.floor(durationMinutes / 60);
            const minutes = Math.round(durationMinutes % 60);
            return `${hours}h ${minutes}m`;
        }

        function formatPace(paceMinPerKm) {
            if (!Number.isFinite(paceMinPerKm) || paceMinPerKm <= 0) {
                return '—';
            }

            const totalSeconds = Math.round(paceMinPerKm * 60);
            const minutes = Math.floor(totalSeconds / 60);
            const seconds = totalSeconds % 60;
            return `${minutes}:${String(seconds).padStart(2, '0')} min/km`;
        }

        function formatMetricValue(value, unit = '', digits = 1) {
            if (!Number.isFinite(value)) {
                return '—';
            }

            const formatted = value.toLocaleString('de-DE', {
                minimumFractionDigits: digits,
                maximumFractionDigits: digits
            });

            return unit ? `${formatted} ${unit}` : formatted;
        }

        function formatWeatherNumber(value, digits = 1) {
            const numeric = Number(value);
            if (!Number.isFinite(numeric)) {
                return '—';
            }

            return numeric.toLocaleString('de-DE', {
                minimumFractionDigits: digits,
                maximumFractionDigits: digits
            });
        }

        function describeWeatherCode(code) {
            const numericCode = Number(code);
            if (!Number.isFinite(numericCode)) {
                return 'Unbekannt';
            }

            if (numericCode === 0) return 'Klar';
            if (numericCode === 1) return 'Überwiegend klar';
            if (numericCode === 2) return 'Teilweise bewölkt';
            if (numericCode === 3) return 'Bedeckt';
            if ([45, 48].includes(numericCode)) return 'Nebel';
            if ([51, 53, 55, 56, 57].includes(numericCode)) return 'Niesel';
            if ([61, 63, 65, 66, 67].includes(numericCode)) return 'Regen';
            if ([71, 73, 75, 77].includes(numericCode)) return 'Schnee';
            if ([80, 81, 82].includes(numericCode)) return 'Regenschauer';
            if ([85, 86].includes(numericCode)) return 'Schneeschauer';
            if (numericCode === 95) return 'Gewitter';
            if ([96, 99].includes(numericCode)) return 'Gewitter mit Hagel';

            return `Code ${numericCode}`;
        }

        function formatWindDirection(directionDeg) {
            const numericDirection = Number(directionDeg);
            if (!Number.isFinite(numericDirection)) {
                return '—';
            }

            const directions = ['N', 'NO', 'O', 'SO', 'S', 'SW', 'W', 'NW'];
            const normalized = ((numericDirection % 360) + 360) % 360;
            const index = Math.round(normalized / 45) % directions.length;
            return directions[index];
        }

        return {
            getCompareAccentColor,
            formatDurationMinutes,
            formatPace,
            formatMetricValue,
            formatWeatherNumber,
            describeWeatherCode,
            formatWindDirection
        };
    }

    globalScope.createDisplayFormatView = createDisplayFormatView;
})(window);
