const fs = require('fs');
const path = require('path');
const xml2js = require('xml2js');

function haversineKm(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) ** 2;

    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

async function parseGpxMeta(filePath) {
    const content = fs.readFileSync(filePath, 'utf-8');
    const parsed = await xml2js.parseStringPromise(content, { explicitArray: true });

    const gpx = parsed.gpx;
    if (!gpx || !gpx.trk) {
        throw new Error('Invalid GPX structure');
    }

    const segments = gpx.trk.flatMap(t => t.trkseg || []);
    const points = segments.flatMap(s => s.trkpt || []);

    if (points.length === 0) {
        throw new Error('No trackpoints found');
    }

    let startTime = null;
    let endTime = null;
    let startCoordinate = null;
    let endCoordinate = null;

    const getCoordinate = (point) => {
        const lat = Number.parseFloat(point?.$?.lat);
        const lon = Number.parseFloat(point?.$?.lon);

        if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
            return null;
        }

        return { lat, lon };
    };

    for (const point of points) {
        const coordinate = getCoordinate(point);

        if (coordinate) {
            if (!startCoordinate) {
                startCoordinate = coordinate;
            }

            endCoordinate = coordinate;
        }

        if (point?.time && point.time[0]) {
            const timeMs = Date.parse(point.time[0]);

            if (Number.isFinite(timeMs)) {
                if (startTime === null) {
                    startTime = timeMs;
                }

                endTime = timeMs;
            }
        }
    }

    let distanceKm = 0;

    for (let i = 1; i < points.length; i++) {
        const previousCoordinate = getCoordinate(points[i - 1]);
        const currentCoordinate = getCoordinate(points[i]);

        if (!previousCoordinate || !currentCoordinate) {
            continue;
        }

        distanceKm += haversineKm(
            previousCoordinate.lat,
            previousCoordinate.lon,
            currentCoordinate.lat,
            currentCoordinate.lon
        );
    }

    const hasHR = points.some(pt =>
        JSON.stringify(pt.extensions || {}).includes('hr') ||
        JSON.stringify(pt.extensions || {}).includes('HeartRate')
    );

    const hasPower = points.some(pt =>
        JSON.stringify(pt.extensions || {}).includes('power') ||
        JSON.stringify(pt.extensions || {}).includes('Power')
    );

    return {
        startTime,
        endTime,
        durationSeconds: Number.isFinite(startTime) && Number.isFinite(endTime) && endTime > startTime
            ? (endTime - startTime) / 1000
            : null,
        startLat: startCoordinate?.lat ?? null,
        startLon: startCoordinate?.lon ?? null,
        endLat: endCoordinate?.lat ?? null,
        endLon: endCoordinate?.lon ?? null,
        distanceKm,
        pointCount: points.length,
        hasHR,
        hasPower
    };
}

function toFiniteMetaNumber(value) {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : null;
}

function calculateRelativeDiff(leftValue, rightValue) {
    const left = toFiniteMetaNumber(leftValue);
    const right = toFiniteMetaNumber(rightValue);

    if (left === null || right === null) {
        return null;
    }

    const divisor = Math.max(Math.abs(left), Math.abs(right), 1e-9);
    return Math.abs(left - right) / divisor;
}

function calculateMetaPointDistanceMeters(lat1, lon1, lat2, lon2) {
    const fromLat = toFiniteMetaNumber(lat1);
    const fromLon = toFiniteMetaNumber(lon1);
    const toLat = toFiniteMetaNumber(lat2);
    const toLon = toFiniteMetaNumber(lon2);

    if (fromLat === null || fromLon === null || toLat === null || toLon === null) {
        return null;
    }

    return haversineKm(fromLat, fromLon, toLat, toLon) * 1000;
}

function buildDuplicateMatch(existingMeta, incomingMeta) {
    const existingStartTime = toFiniteMetaNumber(existingMeta?.startTime);
    const incomingStartTime = toFiniteMetaNumber(incomingMeta?.startTime);
    const startTimeDiffSec = existingStartTime !== null && incomingStartTime !== null
        ? Math.abs(existingStartTime - incomingStartTime) / 1000
        : null;

    const distanceRelDiff = calculateRelativeDiff(existingMeta?.distanceKm, incomingMeta?.distanceKm);
    const durationRelDiff = calculateRelativeDiff(existingMeta?.durationSeconds, incomingMeta?.durationSeconds);
    const pointRelDiff = calculateRelativeDiff(existingMeta?.pointCount, incomingMeta?.pointCount);

    const startDistanceM = calculateMetaPointDistanceMeters(
        existingMeta?.startLat,
        existingMeta?.startLon,
        incomingMeta?.startLat,
        incomingMeta?.startLon
    );

    const endDistanceM = calculateMetaPointDistanceMeters(
        existingMeta?.endLat,
        existingMeta?.endLon,
        incomingMeta?.endLat,
        incomingMeta?.endLon
    );

    let score = 0;
    let strongSignals = 0;
    const reasons = [];

    if (startTimeDiffSec !== null) {
        if (startTimeDiffSec <= 120) {
            score += 0.55;
            strongSignals += 1;
            reasons.push('startzeit nahezu identisch');
        } else if (startTimeDiffSec <= 300) {
            score += 0.45;
            strongSignals += 1;
            reasons.push('startzeit sehr ähnlich');
        } else if (startTimeDiffSec <= 600) {
            score += 0.25;
            reasons.push('startzeit ähnlich');
        }
    }

    if (distanceRelDiff !== null) {
        if (distanceRelDiff <= 0.02) {
            score += 0.25;
            strongSignals += 1;
            reasons.push('distanz sehr ähnlich');
        } else if (distanceRelDiff <= 0.05) {
            score += 0.15;
            strongSignals += 1;
            reasons.push('distanz ähnlich');
        }
    }

    if (durationRelDiff !== null) {
        if (durationRelDiff <= 0.05) {
            score += 0.15;
            strongSignals += 1;
            reasons.push('dauer sehr ähnlich');
        } else if (durationRelDiff <= 0.12) {
            score += 0.08;
            reasons.push('dauer ähnlich');
        }
    }

    if (startDistanceM !== null) {
        if (startDistanceM <= 120) {
            score += 0.2;
            strongSignals += 1;
            reasons.push('startpunkt sehr nah');
        } else if (startDistanceM <= 300) {
            score += 0.1;
            reasons.push('startpunkt nah');
        }
    }

    if (endDistanceM !== null) {
        if (endDistanceM <= 180) {
            score += 0.2;
            strongSignals += 1;
            reasons.push('endpunkt sehr nah');
        } else if (endDistanceM <= 400) {
            score += 0.1;
            reasons.push('endpunkt nah');
        }
    }

    if (pointRelDiff !== null && pointRelDiff <= 0.35) {
        score += 0.05;
    }

    const hasTimeSignal = startTimeDiffSec !== null;

    const isDuplicate = hasTimeSignal
        ? (score >= 0.6 && strongSignals >= 2)
        : (score >= 0.82 && strongSignals >= 3);

    const confidence = score >= 0.85 ? 'hoch' : score >= 0.7 ? 'mittel' : 'niedrig';

    const baseReason = reasons.length
        ? reasons.slice(0, 2).join(' + ')
        : 'mehrere metadaten stimmen stark überein';

    const reason = baseReason.charAt(0).toUpperCase() + baseReason.slice(1);

    return {
        isDuplicate,
        confidence,
        score: Number(score.toFixed(2)),
        reason,
        metrics: {
            startTimeDiffSec: startTimeDiffSec !== null ? Math.round(startTimeDiffSec) : null,
            distanceDiffPercent: distanceRelDiff !== null ? Number((distanceRelDiff * 100).toFixed(2)) : null,
            durationDiffPercent: durationRelDiff !== null ? Number((durationRelDiff * 100).toFixed(2)) : null,
            startDistanceM: startDistanceM !== null ? Math.round(startDistanceM) : null,
            endDistanceM: endDistanceM !== null ? Math.round(endDistanceM) : null
        }
    };
}

function createGpxMetaService({ cacheMaxAgeMs }) {
    const gpxMetaCache = new Map();

    function getStatSafe(filePath) {
        try {
            return fs.statSync(filePath);
        } catch (_) {
            return null;
        }
    }

    function invalidateGpxMetaCache(filePath) {
        if (!filePath) {
            return;
        }

        gpxMetaCache.delete(path.resolve(filePath));
    }

    function transferGpxMetaCache(sourcePath, targetPath) {
        if (!sourcePath || !targetPath) {
            return;
        }

        const sourceKey = path.resolve(sourcePath);
        const targetKey = path.resolve(targetPath);
        const entry = gpxMetaCache.get(sourceKey);

        gpxMetaCache.delete(sourceKey);

        if (!entry) {
            return;
        }

        const stat = getStatSafe(targetPath);
        if (!stat) {
            return;
        }

        const nextEntry = {
            mtimeMs: stat.mtimeMs,
            size: stat.size,
            cachedAt: Date.now()
        };

        if (entry.error) {
            nextEntry.error = entry.error;
        } else {
            nextEntry.meta = entry.meta;
        }

        gpxMetaCache.set(targetKey, nextEntry);
    }

    async function getGpxMetaCached(filePath) {
        const resolvedPath = path.resolve(filePath);
        const stat = getStatSafe(resolvedPath);

        if (!stat || !stat.isFile()) {
            throw new Error('File not found');
        }

        const cached = gpxMetaCache.get(resolvedPath);

        if (cached && cached.mtimeMs === stat.mtimeMs && cached.size === stat.size) {
            if (cached.error) {
                throw new Error(cached.error);
            }

            return cached.meta;
        }

        try {
            const meta = await parseGpxMeta(resolvedPath);

            gpxMetaCache.set(resolvedPath, {
                mtimeMs: stat.mtimeMs,
                size: stat.size,
                meta,
                cachedAt: Date.now()
            });

            return meta;
        } catch (err) {
            gpxMetaCache.set(resolvedPath, {
                mtimeMs: stat.mtimeMs,
                size: stat.size,
                error: err.message,
                cachedAt: Date.now()
            });

            throw err;
        }
    }

    function cleanupGpxMetaCache() {
        const now = Date.now();

        for (const [cacheKey, entry] of gpxMetaCache.entries()) {
            const isExpired = now - (entry.cachedAt || 0) > cacheMaxAgeMs;

            if (isExpired || !fs.existsSync(cacheKey)) {
                gpxMetaCache.delete(cacheKey);
            }
        }
    }

    return {
        buildDuplicateMatch,
        invalidateGpxMetaCache,
        transferGpxMetaCache,
        getGpxMetaCached,
        cleanupGpxMetaCache
    };
}

module.exports = {
    createGpxMetaService
};
