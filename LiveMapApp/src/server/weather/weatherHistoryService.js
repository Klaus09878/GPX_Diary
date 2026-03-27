const https = require('https');

class WeatherHistoryServiceError extends Error {
    constructor(message, statusCode) {
        super(message);
        this.name = 'WeatherHistoryServiceError';
        this.statusCode = statusCode;
    }
}

function parseWeatherCoordinate(value, min, max) {
    const numeric = Number.parseFloat(value);

    if (!Number.isFinite(numeric) || numeric < min || numeric > max) {
        return null;
    }

    return numeric;
}

function parseWeatherTimestampMs(value) {
    if (value === undefined || value === null || value === '') {
        return null;
    }

    const numeric = Number(value);

    if (Number.isFinite(numeric) && numeric > 0) {
        if (numeric > 1e12) {
            return Math.round(numeric);
        }

        if (numeric > 1e9) {
            return Math.round(numeric * 1000);
        }
    }

    const parsed = Date.parse(String(value));
    return Number.isFinite(parsed) ? parsed : null;
}

function toUtcDateString(timeMs) {
    const date = new Date(timeMs);

    if (!Number.isFinite(date.getTime())) {
        return null;
    }

    return date.toISOString().slice(0, 10);
}

function createWeatherCacheKey(latitude, longitude, timeMs) {
    const latBucket = (Math.round(latitude * 100) / 100).toFixed(2);
    const lonBucket = (Math.round(longitude * 100) / 100).toFixed(2);
    const hourBucket = Math.floor(timeMs / (60 * 60 * 1000));

    return `${latBucket}:${lonBucket}:${hourBucket}`;
}

function parseOpenMeteoTimeMs(value) {
    const text = String(value || '').trim();

    if (!text) {
        return null;
    }

    let normalized = text;

    if (/^\d{4}-\d{2}-\d{2}T\d{2}$/.test(text)) {
        normalized = `${text}:00:00Z`;
    } else if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(text)) {
        normalized = `${text}:00Z`;
    } else if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
        normalized = `${text}T00:00:00Z`;
    }

    const parsed = Date.parse(normalized);
    return Number.isFinite(parsed) ? parsed : null;
}

function getNearestWeatherSampleIndex(timeValues, targetTimeMs) {
    let bestIndex = -1;
    let smallestDiffMs = Number.POSITIVE_INFINITY;

    timeValues.forEach((value, index) => {
        const sampleTimeMs = parseOpenMeteoTimeMs(value);

        if (!Number.isFinite(sampleTimeMs)) {
            return;
        }

        const diffMs = Math.abs(sampleTimeMs - targetTimeMs);

        if (diffMs < smallestDiffMs) {
            smallestDiffMs = diffMs;
            bestIndex = index;
        }
    });

    return {
        index: bestIndex,
        diffMs: smallestDiffMs
    };
}

function getHourlyValue(values, index) {
    if (!Array.isArray(values) || index < 0 || index >= values.length) {
        return null;
    }

    const numeric = Number(values[index]);
    return Number.isFinite(numeric) ? numeric : null;
}

function parseOpenMeteoHourlyWeather(payload, targetTimeMs) {
    const hourly = payload?.hourly;
    const timeValues = Array.isArray(hourly?.time) ? hourly.time : [];

    if (!timeValues.length) {
        return null;
    }

    const nearest = getNearestWeatherSampleIndex(timeValues, targetTimeMs);

    if (nearest.index < 0 || !Number.isFinite(nearest.diffMs) || nearest.diffMs > 12 * 60 * 60 * 1000) {
        return null;
    }

    const sampleTimeMs = parseOpenMeteoTimeMs(timeValues[nearest.index]);

    if (!Number.isFinite(sampleTimeMs)) {
        return null;
    }

    return {
        sampleTimeMs,
        temperatureC: getHourlyValue(hourly?.temperature_2m, nearest.index),
        apparentTemperatureC: getHourlyValue(hourly?.apparent_temperature, nearest.index),
        precipitationMm: getHourlyValue(hourly?.precipitation, nearest.index),
        weatherCode: getHourlyValue(hourly?.weather_code, nearest.index),
        windSpeedKmh: getHourlyValue(hourly?.wind_speed_10m, nearest.index) ?? getHourlyValue(hourly?.windspeed_10m, nearest.index),
        windDirectionDeg: getHourlyValue(hourly?.wind_direction_10m, nearest.index) ?? getHourlyValue(hourly?.winddirection_10m, nearest.index)
    };
}

function fetchJsonViaHttps(url, timeoutMs) {
    return new Promise((resolve, reject) => {
        const req = https.get(url, {
            headers: {
                'User-Agent': 'GPX-Map-Diary/1.0'
            }
        }, (response) => {
            const statusCode = response.statusCode || 0;

            if (statusCode >= 300 && statusCode < 400 && response.headers.location) {
                response.resume();
                return resolve(fetchJsonViaHttps(response.headers.location, timeoutMs));
            }

            let raw = '';
            response.setEncoding('utf8');

            response.on('data', chunk => {
                raw += chunk;

                if (raw.length > 2 * 1024 * 1024) {
                    req.destroy(new Error('Wetterdienst-Antwort zu groß.'));
                }
            });

            response.on('end', () => {
                if (statusCode < 200 || statusCode >= 300) {
                    return reject(new Error(`Wetterdienst meldet HTTP ${statusCode}.`));
                }

                try {
                    resolve(JSON.parse(raw));
                } catch (_) {
                    reject(new Error('Wetterdienst-Antwort ist kein gültiges JSON.'));
                }
            });
        });

        req.on('error', reject);

        req.setTimeout(timeoutMs, () => {
            req.destroy(new Error('Zeitüberschreitung beim Wetterdienst.'));
        });
    });
}

function createWeatherHistoryService({ cacheMaxAgeMs, fetchTimeoutMs }) {
    const weatherCache = new Map();

    function cleanupCache() {
        const now = Date.now();

        for (const [cacheKey, entry] of weatherCache.entries()) {
            const isExpired = now - (entry?.cachedAt || 0) > cacheMaxAgeMs;

            if (isExpired) {
                weatherCache.delete(cacheKey);
            }
        }
    }

    async function getWeatherHistory({ lat, lon, timeMs, timestamp }) {
        const latitude = parseWeatherCoordinate(lat, -90, 90);
        const longitude = parseWeatherCoordinate(lon, -180, 180);
        const requestTimeMs = parseWeatherTimestampMs(timeMs ?? timestamp);

        if (latitude === null || longitude === null || requestTimeMs === null) {
            throw new WeatherHistoryServiceError('Ungültige Parameter. Erwartet: lat, lon, timeMs.', 400);
        }

        const requestDate = toUtcDateString(requestTimeMs);

        if (!requestDate) {
            throw new WeatherHistoryServiceError('Ungültiger Zeitstempel.', 400);
        }

        cleanupCache();

        const cacheKey = createWeatherCacheKey(latitude, longitude, requestTimeMs);
        const cached = weatherCache.get(cacheKey);

        if (cached && (Date.now() - (cached.cachedAt || 0) <= cacheMaxAgeMs)) {
            return {
                ...cached.payload,
                cached: true
            };
        }

        const weatherUrl = new URL('https://archive-api.open-meteo.com/v1/archive');
        weatherUrl.searchParams.set('latitude', latitude.toFixed(6));
        weatherUrl.searchParams.set('longitude', longitude.toFixed(6));
        weatherUrl.searchParams.set('start_date', requestDate);
        weatherUrl.searchParams.set('end_date', requestDate);
        weatherUrl.searchParams.set('hourly', 'temperature_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m,wind_direction_10m');
        weatherUrl.searchParams.set('timezone', 'UTC');

        try {
            const providerPayload = await fetchJsonViaHttps(weatherUrl.toString(), fetchTimeoutMs);
            const weather = parseOpenMeteoHourlyWeather(providerPayload, requestTimeMs);

            if (!weather) {
                const unavailablePayload = {
                    available: false,
                    provider: 'open-meteo',
                    latitude,
                    longitude,
                    requestTimeMs,
                    reason: 'Keine historischen Wetterdaten für diesen Zeitpunkt gefunden.'
                };

                weatherCache.set(cacheKey, {
                    cachedAt: Date.now(),
                    payload: unavailablePayload
                });

                return {
                    ...unavailablePayload,
                    cached: false
                };
            }

            const responsePayload = {
                available: true,
                provider: 'open-meteo',
                latitude,
                longitude,
                requestTimeMs,
                ...weather
            };

            weatherCache.set(cacheKey, {
                cachedAt: Date.now(),
                payload: responsePayload
            });

            return {
                ...responsePayload,
                cached: false
            };
        } catch (error) {
            throw new WeatherHistoryServiceError(error?.message || 'Wetterdaten konnten nicht geladen werden.', 502);
        }
    }

    return {
        cleanupCache,
        getWeatherHistory
    };
}

module.exports = {
    createWeatherHistoryService,
    WeatherHistoryServiceError
};
