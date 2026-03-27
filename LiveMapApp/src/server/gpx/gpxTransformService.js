const fs = require('fs');
const xml2js = require('xml2js');

const xmlBuilder = new xml2js.Builder({ headless: false, renderOpts: { pretty: true, indent: '  ', newline: '\n' } });

function flattenTrackPointRefs(gpxObject) {
    const tracks = gpxObject?.gpx?.trk;

    if (!Array.isArray(tracks)) {
        return [];
    }

    const refs = [];

    tracks.forEach((track, trackIndex) => {
        const segments = Array.isArray(track?.trkseg) ? track.trkseg : [];

        segments.forEach((segment, segmentIndex) => {
            const points = Array.isArray(segment?.trkpt) ? segment.trkpt : [];

            points.forEach((point, pointIndex) => {
                refs.push({
                    trackIndex,
                    segmentIndex,
                    pointIndex,
                    point
                });
            });
        });
    });

    return refs;
}

function recalculateMetadataBounds(gpxObject, pointRefs) {
    const points = Array.isArray(pointRefs) ? pointRefs.map(ref => ref.point).filter(Boolean) : [];

    if (!points.length) {
        if (Array.isArray(gpxObject?.gpx?.metadata) && gpxObject.gpx.metadata[0]) {
            delete gpxObject.gpx.metadata[0].bounds;
        }

        return;
    }

    let minLat = Infinity;
    let maxLat = -Infinity;
    let minLon = Infinity;
    let maxLon = -Infinity;

    points.forEach(point => {
        const lat = Number(point?.$?.lat);
        const lon = Number(point?.$?.lon);

        if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
            return;
        }

        minLat = Math.min(minLat, lat);
        maxLat = Math.max(maxLat, lat);
        minLon = Math.min(minLon, lon);
        maxLon = Math.max(maxLon, lon);
    });

    if (![minLat, maxLat, minLon, maxLon].every(Number.isFinite)) {
        return;
    }

    if (!Array.isArray(gpxObject.gpx.metadata) || !gpxObject.gpx.metadata.length) {
        gpxObject.gpx.metadata = [{}];
    }

    gpxObject.gpx.metadata[0].bounds = [{
        $: {
            minlat: String(minLat),
            minlon: String(minLon),
            maxlat: String(maxLat),
            maxlon: String(maxLon)
        }
    }];
}

async function trimGpxXml(xmlText, startIndex, endIndex) {
    if (!Number.isInteger(startIndex) || !Number.isInteger(endIndex)) {
        throw new Error('Ungültiger Trim-Bereich.');
    }

    if (startIndex < 0 || endIndex < startIndex) {
        throw new Error('Ungültige Trim-Grenzen.');
    }

    const parsed = await xml2js.parseStringPromise(xmlText, { explicitArray: true });
    const refs = flattenTrackPointRefs(parsed);

    if (!refs.length) {
        throw new Error('Keine Trackpunkte gefunden.');
    }

    if (endIndex >= refs.length) {
        throw new Error('Trim-Ende liegt außerhalb des Tracks.');
    }

    const keptRefs = refs.slice(startIndex, endIndex + 1);

    if (keptRefs.length < 2) {
        throw new Error('Der zugeschnittene Track benötigt mindestens 2 Punkte.');
    }

    const tracks = Array.isArray(parsed?.gpx?.trk) ? parsed.gpx.trk : [];

    tracks.forEach(track => {
        if (!Array.isArray(track?.trkseg)) {
            track.trkseg = [];
            return;
        }

        track.trkseg.forEach(segment => {
            segment.trkpt = [];
        });
    });

    keptRefs.forEach(ref => {
        const track = tracks[ref.trackIndex];
        const segment = track?.trkseg?.[ref.segmentIndex];

        if (!segment) {
            return;
        }

        if (!Array.isArray(segment.trkpt)) {
            segment.trkpt = [];
        }

        segment.trkpt.push(ref.point);
    });

    tracks.forEach(track => {
        if (!Array.isArray(track?.trkseg)) {
            return;
        }

        track.trkseg = track.trkseg.filter(segment => Array.isArray(segment?.trkpt) && segment.trkpt.length > 0);
    });

    parsed.gpx.trk = tracks.filter(track => Array.isArray(track?.trkseg) && track.trkseg.length > 0);

    if (!parsed.gpx.trk.length) {
        throw new Error('Nach dem Zuschneiden blieben keine Segmente übrig.');
    }

    recalculateMetadataBounds(parsed, keptRefs);

    return xmlBuilder.buildObject(parsed);
}

function normalizePointRanges(ranges, totalPoints) {
    if (!Array.isArray(ranges) || !ranges.length) {
        throw new Error('Keine Ausreißer-Bereiche übergeben.');
    }

    const normalized = ranges.map((range, index) => {
        const startIndex = Number(range?.startIndex);
        const endIndex = Number(range?.endIndex);

        if (!Number.isInteger(startIndex) || !Number.isInteger(endIndex)) {
            throw new Error(`Ungültiger Bereich an Position ${index + 1}.`);
        }

        if (startIndex < 0 || endIndex < startIndex || endIndex >= totalPoints) {
            throw new Error(`Bereich ${index + 1} liegt außerhalb des Tracks.`);
        }

        return { startIndex, endIndex };
    }).sort((left, right) => left.startIndex - right.startIndex);

    const merged = [];

    normalized.forEach(range => {
        const previous = merged[merged.length - 1];

        if (!previous || range.startIndex > previous.endIndex + 1) {
            merged.push({ ...range });
            return;
        }

        previous.endIndex = Math.max(previous.endIndex, range.endIndex);
    });

    return merged;
}

async function removeGpxPointRanges(xmlText, ranges) {
    const parsed = await xml2js.parseStringPromise(xmlText, { explicitArray: true });
    const refs = flattenTrackPointRefs(parsed);

    if (!refs.length) {
        throw new Error('Keine Trackpunkte gefunden.');
    }

    const normalizedRanges = normalizePointRanges(ranges, refs.length);

    const keptRefs = refs.filter((_, index) => {
        return !normalizedRanges.some(range => index >= range.startIndex && index <= range.endIndex);
    });

    if (keptRefs.length < 2) {
        throw new Error('Nach der Bereinigung würden zu wenige Trackpunkte übrig bleiben.');
    }

    const tracks = Array.isArray(parsed?.gpx?.trk) ? parsed.gpx.trk : [];

    tracks.forEach(track => {
        if (!Array.isArray(track?.trkseg)) {
            track.trkseg = [];
            return;
        }

        track.trkseg.forEach(segment => {
            segment.trkpt = [];
        });
    });

    keptRefs.forEach(ref => {
        const track = tracks[ref.trackIndex];
        const segment = track?.trkseg?.[ref.segmentIndex];

        if (!segment) {
            return;
        }

        if (!Array.isArray(segment.trkpt)) {
            segment.trkpt = [];
        }

        segment.trkpt.push(ref.point);
    });

    tracks.forEach(track => {
        if (!Array.isArray(track?.trkseg)) {
            return;
        }

        track.trkseg = track.trkseg.filter(segment => Array.isArray(segment?.trkpt) && segment.trkpt.length > 0);
    });

    parsed.gpx.trk = tracks.filter(track => Array.isArray(track?.trkseg) && track.trkseg.length > 0);

    if (!parsed.gpx.trk.length) {
        throw new Error('Nach der Bereinigung blieben keine Segmente übrig.');
    }

    recalculateMetadataBounds(parsed, keptRefs);

    return {
        xml: xmlBuilder.buildObject(parsed),
        normalizedRanges,
        removedPointCount: refs.length - keptRefs.length,
        remainingPointCount: keptRefs.length
    };
}

function replaceFileSafely(sourcePath, targetPath) {
    const backupPath = `${targetPath}.trim-backup-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    fs.renameSync(targetPath, backupPath);

    try {
        fs.renameSync(sourcePath, targetPath);
        fs.unlinkSync(backupPath);
    } catch (err) {
        try {
            if (fs.existsSync(sourcePath)) {
                fs.unlinkSync(sourcePath);
            }
        } catch (_) {}

        try {
            if (fs.existsSync(backupPath) && !fs.existsSync(targetPath)) {
                fs.renameSync(backupPath, targetPath);
            }
        } catch (_) {}

        throw err;
    }
}

function createGpxTransformService() {
    return {
        trimGpxXml,
        removeGpxPointRanges,
        replaceFileSafely
    };
}

module.exports = {
    createGpxTransformService
};
