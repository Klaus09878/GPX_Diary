(function attachWeatherCardViewFactory(globalScope) {
    function createWeatherCardView({
        getCurrentProfile,
        getTrackWeatherState,
        describeWeatherCode,
        formatWeatherNumber,
        formatWindDirection,
        loadWeatherForTrack
    }) {
        function buildWeatherCard(filename, gpxLayer) {
            const weatherState = getTrackWeatherState(getCurrentProfile(), filename);

            const card = document.createElement('div');
            card.className = 'stat-mini-card weather-card';

            const title = document.createElement('span');
            title.className = 'mini-label';
            title.textContent = 'Wetter & Wind';

            const summary = document.createElement('strong');
            summary.className = 'mini-value weather-card__summary';

            const meta = document.createElement('span');
            meta.className = 'weather-card__meta';

            const hint = document.createElement('span');
            hint.className = 'weather-card__hint';

            const actionBtn = document.createElement('button');
            actionBtn.type = 'button';
            actionBtn.className = 'action-btn-secondary weather-load-btn';

            if (weatherState.status === 'loading') {
                summary.textContent = 'Wetterdaten werden geladen…';
                meta.textContent = 'Bitte kurz warten.';
                hint.textContent = 'Quelle: Open-Meteo';
                actionBtn.textContent = 'Lädt…';
                actionBtn.disabled = true;
            } else if (weatherState.status === 'ready' && weatherState.data) {
                const weatherData = weatherState.data;
                const weatherLabel = describeWeatherCode(weatherData.weatherCode);
                const temperatureText = `${formatWeatherNumber(weatherData.temperatureC, 1)} °C`;
                const windSpeedText = Number.isFinite(Number(weatherData.windSpeedKmh))
                    ? `${formatWeatherNumber(weatherData.windSpeedKmh, 1)} km/h`
                    : '—';
                const windDirectionText = formatWindDirection(weatherData.windDirectionDeg);
                const precipitationText = `${formatWeatherNumber(weatherData.precipitationMm, 1)} mm`;
                const apparentTempText = Number.isFinite(Number(weatherData.apparentTemperatureC))
                    ? `Gefühlt ${formatWeatherNumber(weatherData.apparentTemperatureC, 1)} °C`
                    : 'Gefühlt —';
                const sampleTimeMs = Number(weatherData.sampleTimeMs);
                const sampleText = Number.isFinite(sampleTimeMs)
                    ? new Date(sampleTimeMs).toLocaleString('de-DE', { dateStyle: 'short', timeStyle: 'short' })
                    : 'Zeitpunkt unbekannt';

                summary.textContent = `${temperatureText} · ${weatherLabel}`;
                meta.textContent = `Wind ${windSpeedText} ${windDirectionText} · Niederschlag ${precipitationText}`;
                hint.textContent = `${apparentTempText} · ${sampleText} · ${weatherData.cached ? 'Cache' : 'Live'}`;
                actionBtn.textContent = 'Neu laden';
                actionBtn.onclick = () => {
                    loadWeatherForTrack(filename, gpxLayer, { force: true });
                };
            } else {
                const message = weatherState.message || 'Optional: historisches Wetter und Wind zum Startzeitpunkt laden.';

                summary.textContent = weatherState.status === 'error'
                    ? 'Wetterdaten konnten nicht geladen werden'
                    : weatherState.status === 'unavailable'
                        ? 'Keine Wetterdaten verfügbar'
                        : 'Wetterdaten noch nicht geladen';
                meta.textContent = message;
                hint.textContent = 'Quelle: Open-Meteo (kostenlos)';
                actionBtn.textContent = weatherState.status === 'idle' ? 'Wetter laden' : 'Erneut versuchen';
                actionBtn.onclick = () => {
                    loadWeatherForTrack(filename, gpxLayer, { force: true });
                };
            }

            card.appendChild(title);
            card.appendChild(summary);
            card.appendChild(meta);
            card.appendChild(hint);
            card.appendChild(actionBtn);

            return card;
        }

        return {
            buildWeatherCard
        };
    }

    globalScope.createWeatherCardView = createWeatherCardView;
})(window);
