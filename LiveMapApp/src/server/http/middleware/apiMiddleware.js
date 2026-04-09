function applySecurityHeaders(req, res, next) {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('X-DNS-Prefetch-Control', 'off');
    res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
    next();
}

function getRequestClientKey(req, { trustProxy = false } = {}) {
    const forwardedFor = req.headers['x-forwarded-for'];
    if (trustProxy && typeof forwardedFor === 'string' && forwardedFor.trim()) {
        return forwardedFor.split(',')[0].trim();
    }

    return req.ip || req.socket?.remoteAddress || 'unknown';
}

function createIpRateLimiter({ windowMs, maxRequests, keyPrefix = 'api', trustProxy = false }) {
    const bucket = new Map();

    return (req, res, next) => {
        const nowMs = Date.now();
        const clientKey = `${keyPrefix}:${getRequestClientKey(req, { trustProxy })}`;

        if (bucket.size > 10000) {
            for (const [key, state] of bucket.entries()) {
                if (!state || state.resetAtMs <= nowMs) {
                    bucket.delete(key);
                }
            }
        }

        const existing = bucket.get(clientKey);
        if (!existing || existing.resetAtMs <= nowMs) {
            bucket.set(clientKey, { count: 1, resetAtMs: nowMs + windowMs });
            return next();
        }

        if (existing.count >= maxRequests) {
            const retryAfterSeconds = Math.max(1, Math.ceil((existing.resetAtMs - nowMs) / 1000));
            res.setHeader('Retry-After', String(retryAfterSeconds));
            return res.status(429).json({
                error: 'Zu viele Anfragen. Bitte kurz warten und erneut versuchen.'
            });
        }

        existing.count += 1;
        return next();
    };
}

function createApiMiddlewares({
    trustProxy = false,
    apiRateWindowMs,
    apiRateMaxRequests,
    apiTrackReadRateWindowMs,
    apiTrackReadRateMaxRequests,
    apiWriteRateWindowMs,
    apiWriteRateMaxRequests
}) {
    const apiRateLimiter = createIpRateLimiter({
        windowMs: apiRateWindowMs,
        maxRequests: apiRateMaxRequests,
        keyPrefix: 'api',
        trustProxy
    });

    const apiTrackReadRateLimiter = createIpRateLimiter({
        windowMs: apiTrackReadRateWindowMs,
        maxRequests: apiTrackReadRateMaxRequests,
        keyPrefix: 'api-track-read',
        trustProxy
    });

    const apiWriteRateLimiter = createIpRateLimiter({
        windowMs: apiWriteRateWindowMs,
        maxRequests: apiWriteRateMaxRequests,
        keyPrefix: 'api-write',
        trustProxy
    });

    function applyWriteRateLimit(req, res, next) {
        if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
            return apiWriteRateLimiter(req, res, next);
        }

        return next();
    }

    function isHighVolumeTrackReadRequest(req) {
        if (req.method !== 'GET') {
            return false;
        }

        const path = String(req.path || '');
        return /^\/tracks\/[^/]+\/[^/]+\.gpx$/i.test(path);
    }

    function applyApiRateLimit(req, res, next) {
        if (isHighVolumeTrackReadRequest(req)) {
            return apiTrackReadRateLimiter(req, res, next);
        }

        return apiRateLimiter(req, res, next);
    }

    function setApiNoStoreCache(req, res, next) {
        res.setHeader('Cache-Control', 'no-store');
        next();
    }

    return {
        applySecurityHeaders,
        applyApiRateLimit,
        applyWriteRateLimit,
        setApiNoStoreCache
    };
}

module.exports = {
    createApiMiddlewares
};
