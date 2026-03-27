function hasFactory(scope, factoryName) {
    return typeof scope?.[factoryName] === 'function';
}

export function createViewApiRegistry(scope = window) {
    return {
        resolve({ cacheKey, factoryName, createDependencies }) {
            if (!cacheKey || !factoryName || typeof createDependencies !== 'function') {
                return null;
            }

            if (!scope[cacheKey] && hasFactory(scope, factoryName)) {
                scope[cacheKey] = scope[factoryName](createDependencies());
            }

            return scope[cacheKey] || null;
        }
    };
}
