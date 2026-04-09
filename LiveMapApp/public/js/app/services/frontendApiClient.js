/**
 * Central Frontend API Client
 * 
 * Centralizes all fetch() calls to backend, provides:
 * - Unified error handling and normalization
 * - Request/response logging for debugging
 * - Retry logic (future)
 * - API versioning support (future)
 * 
 * Replaces scattered fetch() calls across app.js and services.
 * 
 * Usage:
 *   const profiles = await frontendApiClient.getProfiles();
 *   const tracks = await frontendApiClient.getTracks('rennrad');
 *   await frontendApiClient.updateNote(profile, filename, { noteText: '...' });
 */

const frontendApiClient = (() => {
    const API_BASE = '/api';
    const REQUEST_TIMEOUT_MS = 30000;

    /**
     * Normalized error response for all failures
     */
    class ApiError extends Error {
        constructor(message, statusCode = 500, originalError = null) {
            super(message);
            this.name = 'ApiError';
            this.statusCode = statusCode;
            this.originalError = originalError;
        }
    }

    /**
     * Send an HTTP request and normalize response
     */
    async function request(method, path, options = {}) {
        const url = `${API_BASE}${path}`;
        const abortController = new AbortController();
        const timeoutId = setTimeout(() => abortController.abort(), REQUEST_TIMEOUT_MS);

        try {
            const response = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    ...options.headers
                },
                body: options.body ? JSON.stringify(options.body) : undefined,
                signal: abortController.signal
            });

            const contentType = response.headers.get('content-type');
            let data = null;

            if (contentType && contentType.includes('application/json')) {
                data = await response.json();
            } else if (response.ok) {
                data = await response.text();
            }

            if (!response.ok) {
                const errorMessage = data?.error || data?.message || `HTTP ${response.status}`;
                console.error(`[ApiClient] ${method} ${path}: ${response.status} ${errorMessage}`);
                throw new ApiError(errorMessage, response.status);
            }

            return data;
        } catch (error) {
            if (error instanceof ApiError) {
                throw error;
            }
            if (error.name === 'AbortError') {
                console.warn(`[ApiClient] ${method} ${path}: timeout (${REQUEST_TIMEOUT_MS}ms)`);
                throw new ApiError('Request timeout', 408, error);
            }
            console.error(`[ApiClient] ${method} ${path}: ${error.message}`);
            throw new ApiError(error.message || 'Network request failed', 0, error);
        } finally {
            clearTimeout(timeoutId);
        }
    }

    // ========== CORE API METHODS ==========

    async function getProfiles() {
        return request('GET', '/profiles');
    }

    async function getPublicConfig() {
        return request('GET', '/public-config');
    }

    async function getWeatherHistory(lat, lon, timeMs) {
        if (!Number.isFinite(lat) || !Number.isFinite(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
            throw new ApiError('Invalid weather coordinates', 400);
        }
        return request('GET', `/weather/history?lat=${lat}&lon=${lon}&timeMs=${timeMs}`);
    }

    // ========== TRACK API METHODS ==========

    async function getTracks(profile) {
        return request('GET', `/tracks/${profile}`);
    }

    async function getTrack(profile, filename) {
        return request('GET', `/tracks/${profile}/${encodeURIComponent(filename)}`);
    }

    async function trimTrack(profile, filename, startIndex, endIndex) {
        return request('POST', `/tracks/${profile}/${encodeURIComponent(filename)}/trim`, {
            body: { startIndex, endIndex }
        });
    }

    async function applyOutliers(profile, filename, ranges) {
        return request('POST', `/tracks/${profile}/${encodeURIComponent(filename)}/outliers/apply`, {
            body: { ranges }
        });
    }

    async function deleteTrack(profile, filename) {
        return request('DELETE', `/tracks/${profile}/${encodeURIComponent(filename)}`);
    }

    async function deleteAllTracks(profile) {
        return request('DELETE', `/tracks/${profile}`);
    }

    // ========== UPLOAD API METHODS ==========

    async function uploadTracks(profile, files) {
        const formData = new FormData();
        for (const file of files) {
            formData.append('gpxFiles', file);
        }

        const abortController = new AbortController();
        const timeoutId = setTimeout(() => abortController.abort(), REQUEST_TIMEOUT_MS);

        try {
            const response = await fetch(`${API_BASE}/upload/${profile}`, {
                method: 'POST',
                body: formData,
                signal: abortController.signal
            });

            const data = await response.json();

            if (!response.ok) {
                const errorMessage = data?.error || `HTTP ${response.status}`;
                console.error(`[ApiClient] POST /upload/${profile}: ${response.status} ${errorMessage}`);
                throw new ApiError(errorMessage, response.status);
            }

            return data;
        } catch (error) {
            if (error instanceof ApiError) throw error;
            if (error.name === 'AbortError') {
                throw new ApiError('Upload timeout', 408, error);
            }
            throw new ApiError(error.message || 'Upload failed', 0, error);
        } finally {
            clearTimeout(timeoutId);
        }
    }

    async function resolveDuplicate(profile, action, pendingId) {
        return request('POST', `/resolve-duplicate/${profile}`, {
            body: { action, pendingId }
        });
    }

    // ========== ACTIVITY METADATA API ==========

    async function getActivityNotes(profile) {
        return request('GET', `/activities/${profile}/notes`);
    }

    async function getActivityNote(profile, filename) {
        return request('GET', `/activities/${profile}/${encodeURIComponent(filename)}/note`);
    }

    async function saveActivityNote(profile, filename, notePayload) {
        return request('PUT', `/activities/${profile}/${encodeURIComponent(filename)}/note`, {
            body: notePayload
        });
    }

    async function getSegmentFavorites(profile) {
        return request('GET', `/segments/${profile}/favorites`);
    }

    async function saveSegmentFavorite(profile, favoriteData) {
        return request('POST', `/segments/${profile}/favorites`, {
            body: favoriteData
        });
    }

    async function updateSegmentFavorite(profile, favoriteId, favoriteData) {
        return request('PUT', `/segments/${profile}/favorites/${favoriteId}`, {
            body: favoriteData
        });
    }

    async function deleteSegmentFavorite(profile, favoriteId) {
        return request('DELETE', `/segments/${profile}/favorites/${favoriteId}`);
    }

    // ========== EQUIPMENT API ==========

    async function getEquipment(profile) {
        return request('GET', `/equipment/${profile}`);
    }

    async function createEquipment(profile, equipmentData) {
        return request('POST', `/equipment/${profile}`, {
            body: equipmentData
        });
    }

    async function updateEquipment(profile, equipmentId, equipmentData) {
        return request('PUT', `/equipment/${profile}/${equipmentId}`, {
            body: equipmentData
        });
    }

    async function deleteEquipment(profile, equipmentId) {
        return request('DELETE', `/equipment/${profile}/${equipmentId}`);
    }

    async function getEquipmentAssignments(profile) {
        return request('GET', `/equipment/${profile}/assignments`);
    }

    async function getEquipmentAssignment(profile, filename) {
        return request('GET', `/equipment/${profile}/${encodeURIComponent(filename)}/assignment`);
    }

    async function saveEquipmentAssignment(profile, filename, equipmentId) {
        return request('PUT', `/equipment/${profile}/${encodeURIComponent(filename)}/assignment`, {
            body: { equipmentId }
        });
    }

    // ========== HEALTH API ==========

    async function uploadHealthCsv(csvFile) {
        const formData = new FormData();
        formData.append('file', csvFile);

        const abortController = new AbortController();
        const timeoutId = setTimeout(() => abortController.abort(), REQUEST_TIMEOUT_MS);

        try {
            const response = await fetch(`${API_BASE}/upload/health`, {
                method: 'POST',
                body: formData,
                signal: abortController.signal
            });

            const data = await response.json();

            if (!response.ok) {
                const errorMessage = data?.error || `HTTP ${response.status}`;
                console.error(`[ApiClient] POST /upload/health: ${response.status} ${errorMessage}`);
                throw new ApiError(errorMessage, response.status);
            }

            return data;
        } catch (error) {
            if (error instanceof ApiError) throw error;
            if (error.name === 'AbortError') {
                throw new ApiError('Health upload timeout', 408, error);
            }
            throw new ApiError(error.message || 'Health upload failed', 0, error);
        } finally {
            clearTimeout(timeoutId);
        }
    }

    async function getHealthStats() {
        return request('GET', '/health/steps/stats');
    }

    async function getHealthSteps(limit = 30) {
        return request('GET', `/health/steps?limit=${limit}`);
    }

    async function getAllHealthSteps() {
        return request('GET', '/health/steps/all');
    }

    // ========== PUBLIC API ==========

    return {
        ApiError,
        getProfiles,
        getPublicConfig,
        getWeatherHistory,
        getTracks,
        getTrack,
        trimTrack,
        applyOutliers,
        deleteTrack,
        deleteAllTracks,
        uploadTracks,
        resolveDuplicate,
        getActivityNotes,
        getActivityNote,
        saveActivityNote,
        getSegmentFavorites,
        saveSegmentFavorite,
        updateSegmentFavorite,
        deleteSegmentFavorite,
        getEquipment,
        createEquipment,
        updateEquipment,
        deleteEquipment,
        getEquipmentAssignments,
        getEquipmentAssignment,
        saveEquipmentAssignment,
        uploadHealthCsv,
        getHealthStats,
        getHealthSteps,
        getAllHealthSteps
    };
})();

// Expose to window for legacy compatibility during migration
window.frontendApiClient = frontendApiClient;
