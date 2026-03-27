const path = require('path');

function createTrackFileHelpers({ profiles, dataDir, allowedUploadExtensions }) {
    function sanitizeFilename(filename) {
        if (typeof filename !== 'string') {
            return null;
        }

        const base = path.basename(filename).normalize('NFKC').trim();
        if (!base || base === '.' || base === '..') {
            return null;
        }

        const originalExt = path.extname(base);
        const ext = originalExt.toLowerCase();

        if (!allowedUploadExtensions.has(ext)) {
            return null;
        }

        const rawStem = path.basename(base, originalExt)
            .replace(/[\u0000-\u001f\u007f]/g, '')
            .replace(/[<>:"/\\|?*]/g, '_')
            .replace(/\s+/g, ' ')
            .replace(/\.+$/g, '')
            .trim();

        if (!rawStem) {
            return null;
        }

        const stem = rawStem.slice(0, 120);
        return `${stem}${ext}`;
    }

    function isSafeTrackFilename(filename) {
        if (typeof filename !== 'string') {
            return false;
        }

        if (filename !== path.basename(filename)) {
            return false;
        }

        if (!filename.toLowerCase().endsWith('.gpx')) {
            return false;
        }

        if (filename.length > 180) {
            return false;
        }

        if (/[<>:"/\\|?*\u0000-\u001f]/.test(filename)) {
            return false;
        }

        return true;
    }

    function toProfileFilePath(profile, filename) {
        if (!profiles.includes(profile) || !isSafeTrackFilename(filename)) {
            return null;
        }

        const profilePath = path.resolve(path.join(dataDir, profile));
        const fullPath = path.resolve(path.join(profilePath, filename));

        if (path.dirname(fullPath) !== profilePath) {
            return null;
        }

        return fullPath;
    }

    function toGpxFilename(uploadName) {
        const ext = path.extname(uploadName);
        const base = path.basename(uploadName, ext);
        return `${base}.gpx`;
    }

    return {
        sanitizeFilename,
        isSafeTrackFilename,
        toProfileFilePath,
        toGpxFilename
    };
}

module.exports = {
    createTrackFileHelpers
};
