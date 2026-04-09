const path = require('node:path');

const { createTrackFileHelpers } = require('../src/server/core/trackFileHelpers');

describe('Track file helpers', () => {
    const helpers = createTrackFileHelpers({
        profiles: ['motorrad', 'rennrad', 'laufen', 'spazieren'],
        dataDir: path.join(__dirname, '..', 'data'),
        allowedUploadExtensions: new Set(['.gpx', '.fit', '.fir'])
    });

    it('sanitizes upload filenames and keeps allowed extensions', () => {
        expect(helpers.sanitizeFilename('  Tour 01.FIT  ')).toBe('Tour 01.fit');
        expect(helpers.sanitizeFilename('../../../escape.gpx')).toBe('escape.gpx');
        expect(helpers.sanitizeFilename('bad.exe')).toBeNull();
    });

    it('accepts only safe track filenames', () => {
        expect(helpers.isSafeTrackFilename('2026-03-04_ride.gpx')).toBe(true);
        expect(helpers.isSafeTrackFilename('..\\escape.gpx')).toBe(false);
        expect(helpers.isSafeTrackFilename('../escape.gpx')).toBe(false);
        expect(helpers.isSafeTrackFilename('track.fit')).toBe(false);
    });

    it('maps filenames into the selected profile directory', () => {
        const target = helpers.toProfileFilePath('rennrad', 'tour.gpx');

        expect(target).toBe(path.join(__dirname, '..', 'data', 'rennrad', 'tour.gpx'));
        expect(helpers.toProfileFilePath('unknown', 'tour.gpx')).toBeNull();
        expect(helpers.toProfileFilePath('rennrad', '../tour.gpx')).toBeNull();
    });

    it('converts FIT upload names to GPX names', () => {
        expect(helpers.toGpxFilename('Tour 01.FIT')).toBe('Tour 01.gpx');
        expect(helpers.toGpxFilename('Tour 02.fir')).toBe('Tour 02.gpx');
    });
});