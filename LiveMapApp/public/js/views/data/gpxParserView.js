(function attachGpxParserViewFactory(globalScope) {
    function createGpxParserView({ apiBase, getLoadGeneration, calculateSegmentDistanceMeters }) {
        function parseNumericOrNull(value) {
            const parsed = Number.parseFloat(value);
            return Number.isFinite(parsed) ? parsed : null;
        }

        function findFirstDescendantText(node, localNames) {
            const wanted = new Set((Array.isArray(localNames) ? localNames : [localNames]).map(name => String(name).toLowerCase()));
            const queue = Array.from(node?.childNodes || []);

            while (queue.length > 0) {
                const current = queue.shift();
                if (!current || current.nodeType !== 1) {
                    continue;
                }

                const localName = String(current.localName || current.nodeName || '').toLowerCase();
                if (wanted.has(localName)) {
                    const text = current.textContent?.trim();
                    if (text) {
                        return text;
                    }
                }

                queue.push(...Array.from(current.childNodes || []));
            }

            return null;
        }

        function parseSpeedToKmh(rawSpeed) {
            const numericSpeed = parseNumericOrNull(rawSpeed);
            if (!Number.isFinite(numericSpeed)) {
                return null;
            }

            return numericSpeed <= 25 ? numericSpeed * 3.6 : numericSpeed;
        }

        function toFiniteNumber(value) {
            const numericValue = Number(value);
            return Number.isFinite(numericValue) ? numericValue : null;
        }

        function getHeartRateValue(point) {
            return toFiniteNumber(point?.meta?.hr);
        }

        function getPowerValue(point) {
            const power = toFiniteNumber(point?.meta?.power);
            if (power !== null) {
                return power;
            }

            return toFiniteNumber(point?.meta?.watt);
        }

        function countValidPowerSamples(points) {
            if (!Array.isArray(points) || !points.length) {
                return 0;
            }

            return points.reduce((count, point) => {
                return count + (getPowerValue(point) !== null ? 1 : 0);
            }, 0);
        }

        function parseTrackPointsFromGpxText(xmlText) {
            const parser = new DOMParser();
            const xml = parser.parseFromString(xmlText, 'application/xml');
            if (xml.querySelector('parsererror')) {
                throw new Error('GPX konnte nicht geparst werden.');
            }

            const trackPointNodes = Array.from(xml.getElementsByTagNameNS('*', 'trkpt'));
            const points = [];
            let totalDistance = 0;

            trackPointNodes.forEach((node) => {
                const lat = parseNumericOrNull(node.getAttribute('lat'));
                const lng = parseNumericOrNull(node.getAttribute('lon'));
                if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
                    return;
                }

                const elevation = parseNumericOrNull(findFirstDescendantText(node, 'ele')) ?? 0;
                const timeText = findFirstDescendantText(node, 'time');
                const timeMs = timeText ? Date.parse(timeText) : null;
                const hr = parseNumericOrNull(findFirstDescendantText(node, ['hr', 'heartrate']));
                const power = parseNumericOrNull(findFirstDescendantText(node, ['power', 'watts', 'watt']));
                const speedFromExtension = parseSpeedToKmh(findFirstDescendantText(node, ['speed', 'velocity']));

                const point = {
                    lat,
                    lng,
                    alt: elevation,
                    dist: totalDistance,
                    meta: {
                        time: timeText || null,
                        timeMs: Number.isFinite(timeMs) ? timeMs : null,
                        hr,
                        power,
                        watt: power,
                        speedKmh: speedFromExtension
                    }
                };

                const previousPoint = points[points.length - 1];
                if (previousPoint) {
                    const deltaMeters = calculateSegmentDistanceMeters(previousPoint, point);
                    totalDistance += deltaMeters;
                    point.dist = totalDistance;

                    if (!Number.isFinite(point.meta.speedKmh) && previousPoint.meta?.timeMs && point.meta?.timeMs) {
                        const deltaSeconds = (point.meta.timeMs - previousPoint.meta.timeMs) / 1000;
                        if (deltaSeconds > 0 && deltaSeconds < 600) {
                            point.meta.speedKmh = Math.min((deltaMeters / deltaSeconds) * 3.6, 200);
                        }
                    }
                }

                points.push(point);
            });

            if (points.length > 1 && !Number.isFinite(points[0].meta?.speedKmh)) {
                points[0].meta.speedKmh = points[1].meta?.speedKmh ?? 0;
            }

            return points;
        }

        function wait(ms) {
            return new Promise(resolve => setTimeout(resolve, ms));
        }

        function parseRetryAfterMs(retryAfterHeader) {
            if (!retryAfterHeader) {
                return null;
            }

            const asNumber = Number.parseFloat(String(retryAfterHeader).trim());
            if (Number.isFinite(asNumber) && asNumber >= 0) {
                return Math.round(asNumber * 1000);
            }

            const asDate = Date.parse(String(retryAfterHeader));
            if (Number.isFinite(asDate)) {
                return Math.max(0, asDate - Date.now());
            }

            return null;
        }

        async function fetchTrackPoints(profile, filename) {
            const maxAttempts = 5;
            let lastError = null;

            for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
                let response;
                try {
                    response = await fetch(`${apiBase}/tracks/${profile}/${encodeURIComponent(filename)}?v=${encodeURIComponent(getLoadGeneration())}`);
                } catch (error) {
                    lastError = error;
                    if (attempt < maxAttempts) {
                        const networkBackoffMs = 200 * (2 ** (attempt - 1));
                        await wait(networkBackoffMs);
                        continue;
                    }

                    throw new Error(`Trackdaten konnten nicht geladen werden: ${profile}/${filename}`);
                }

                if (response.ok) {
                    const gpxText = await response.text();
                    return parseTrackPointsFromGpxText(gpxText);
                }

                if ((response.status === 429 || response.status === 503) && attempt < maxAttempts) {
                    const retryAfterMs = parseRetryAfterMs(response.headers?.get('retry-after'));
                    const backoffMs = retryAfterMs ?? (250 * (2 ** (attempt - 1)));
                    const jitterMs = Math.floor(Math.random() * 150);
                    await wait(backoffMs + jitterMs);
                    continue;
                }

                throw new Error(`Trackdaten konnten nicht geladen werden: ${profile}/${filename} (HTTP ${response.status})`);
            }

            throw lastError || new Error(`Trackdaten konnten nicht geladen werden: ${profile}/${filename}`);
        }

        return {
            parseNumericOrNull,
            findFirstDescendantText,
            parseSpeedToKmh,
            toFiniteNumber,
            getHeartRateValue,
            getPowerValue,
            countValidPowerSamples,
            parseTrackPointsFromGpxText,
            fetchTrackPoints
        };
    }

    globalScope.createGpxParserView = createGpxParserView;
})(window);
