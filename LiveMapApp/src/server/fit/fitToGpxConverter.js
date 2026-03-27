const fs = require('fs');
const path = require('path');
const FitParser = require('fit-file-parser').default;

function escapeXml(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function createFitToGpxConverter({ sanitizeFilename }) {
    function convertFitToGpx(fitFilePath, originalFilename = '') {
        return new Promise((resolve, reject) => {
            const toFiniteNumber = (value) => {
                const numeric = Number(value);
                return Number.isFinite(numeric) ? numeric : null;
            };

            const normalizeCoordinate = (value, kind) => {
                const numeric = toFiniteNumber(value);
                if (numeric === null) {
                    return null;
                }

                let degrees = numeric;
                if (Math.abs(degrees) > 180) {
                    degrees = degrees * (180 / Math.pow(2, 31));
                }

                const limit = kind === 'lat' ? 90 : 180;
                return Math.abs(degrees) <= limit ? degrees : null;
            };

            const normalizeTimestamp = (value) => {
                if (value instanceof Date && Number.isFinite(value.getTime())) {
                    return value.toISOString();
                }

                const parsed = Date.parse(value);
                if (Number.isFinite(parsed)) {
                    return new Date(parsed).toISOString();
                }

                return null;
            };

            const normalizeSpeedToMetersPerSecond = (value) => {
                const numeric = toFiniteNumber(value);
                if (numeric === null || numeric < 0) {
                    return null;
                }

                if (numeric > 25) {
                    return numeric / 3.6;
                }

                return numeric;
            };

            const round = (value, digits = 0) => {
                if (!Number.isFinite(value)) {
                    return null;
                }

                const factor = 10 ** digits;
                return Math.round(value * factor) / factor;
            };

            const removeFileQuietly = (targetPath) => {
                try {
                    if (targetPath && fs.existsSync(targetPath)) {
                        fs.unlinkSync(targetPath);
                    }
                } catch (_) {}
            };

            const rejectWithCleanup = (message) => {
                removeFileQuietly(fitFilePath);
                reject(new Error(message));
            };

            const fitParser = new FitParser({
                force: true,
                speedUnit: 'm/s',
                lengthUnit: 'km',
                elapsedRecordField: true,
                mode: 'list'
            });

            const fitData = fs.readFileSync(fitFilePath);

            fitParser.parse(fitData, (err, data) => {
                if (err) {
                    return rejectWithCleanup(err.message || 'FIT-Datei konnte nicht geparst werden.');
                }

                const records = (data.records || []).map(record => {
                    const lat = normalizeCoordinate(record?.position_lat ?? record?.positionLatitude, 'lat');
                    const lon = normalizeCoordinate(record?.position_long ?? record?.position_lon ?? record?.positionLongitude, 'lon');

                    if (lat === null || lon === null) {
                        return null;
                    }

                    return {
                        lat,
                        lon,
                        altitude: toFiniteNumber(record?.enhanced_altitude ?? record?.altitude),
                        heartRate: toFiniteNumber(record?.heart_rate ?? record?.heartRate),
                        power: toFiniteNumber(record?.power),
                        cadence: toFiniteNumber(record?.cadence),
                        temperature: toFiniteNumber(record?.temperature ?? record?.temp),
                        speedMs: normalizeSpeedToMetersPerSecond(record?.enhanced_speed ?? record?.speed),
                        timestampIso: normalizeTimestamp(record?.timestamp)
                    };
                }).filter(Boolean);

                if (records.length === 0) {
                    return rejectWithCleanup('No GPS data in FIT file');
                }

                const preferredName = sanitizeFilename(originalFilename || '') || path.basename(fitFilePath);
                const trackName = path.basename(preferredName, path.extname(preferredName));

                let gpxXml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
                gpxXml += `<gpx version="1.1" creator="GPXDiary-FIT-Converter"\n`;
                gpxXml += `  xmlns="http://www.topografix.com/GPX/1/1"\n`;
                gpxXml += `  xmlns:gpxtpx="http://www.garmin.com/xmlschemas/TrackPointExtension/v1">\n`;
                gpxXml += `  <trk>\n`;
                gpxXml += `    <name>${escapeXml(trackName)}</name>\n`;
                gpxXml += `    <trkseg>\n`;

                for (const record of records) {
                    const latitude = round(record.lat, 8);
                    const longitude = round(record.lon, 8);

                    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
                        continue;
                    }

                    gpxXml += `      <trkpt lat="${latitude}" lon="${longitude}">`;

                    if (Number.isFinite(record.altitude)) {
                        gpxXml += `<ele>${round(record.altitude, 1)}</ele>`;
                    }

                    if (record.timestampIso) {
                        gpxXml += `<time>${record.timestampIso}</time>`;
                    }

                    const hasExtensionData = Number.isFinite(record.heartRate) || Number.isFinite(record.power) || Number.isFinite(record.cadence) || Number.isFinite(record.temperature) || Number.isFinite(record.speedMs);

                    if (hasExtensionData) {
                        gpxXml += `<extensions>`;

                        if (Number.isFinite(record.heartRate) || Number.isFinite(record.cadence) || Number.isFinite(record.temperature)) {
                            gpxXml += `<gpxtpx:TrackPointExtension>`;

                            if (Number.isFinite(record.heartRate)) {
                                gpxXml += `<gpxtpx:hr>${Math.round(record.heartRate)}</gpxtpx:hr>`;
                            }

                            if (Number.isFinite(record.cadence)) {
                                gpxXml += `<gpxtpx:cad>${Math.round(record.cadence)}</gpxtpx:cad>`;
                            }

                            if (Number.isFinite(record.temperature)) {
                                gpxXml += `<gpxtpx:atemp>${round(record.temperature, 1)}</gpxtpx:atemp>`;
                            }

                            gpxXml += `</gpxtpx:TrackPointExtension>`;
                        }

                        if (Number.isFinite(record.power)) {
                            gpxXml += `<power>${Math.round(record.power)}</power>`;
                        }

                        if (Number.isFinite(record.speedMs)) {
                            gpxXml += `<speed>${round(record.speedMs, 3)}</speed>`;
                        }

                        gpxXml += `</extensions>`;
                    }

                    gpxXml += `</trkpt>\n`;
                }

                gpxXml += `    </trkseg>\n`;
                gpxXml += `  </trk>\n`;
                gpxXml += `</gpx>\n`;

                const gpxFilePath = /\.(fit|fir)$/i.test(fitFilePath)
                    ? fitFilePath.replace(/\.(fit|fir)$/i, '.gpx')
                    : `${fitFilePath}.gpx`;

                fs.writeFileSync(gpxFilePath, gpxXml, 'utf-8');

                removeFileQuietly(fitFilePath);

                console.log(`Converted: ${path.basename(fitFilePath)} -> ${path.basename(gpxFilePath)} (${records.length} points)`);

                return resolve(gpxFilePath);
            });
        });
    }

    return {
        convertFitToGpx
    };
}

module.exports = {
    createFitToGpxConverter
};
