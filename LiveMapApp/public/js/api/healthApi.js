(function initHealthApi(globalScope) {
    async function parseJsonResponse(response) {
        const data = await response.json();
        if (!response.ok) {
            const message = data?.error || 'Unbekannter API-Fehler';
            throw new Error(message);
        }
        return data;
    }

    async function uploadHealthCsv(file) {
        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch('/api/upload/health', {
            method: 'POST',
            body: formData
        });

        return parseJsonResponse(response);
    }

    async function getHealthStats() {
        const response = await fetch('/api/health/steps/stats');
        return parseJsonResponse(response);
    }

    async function getRecentHealthSteps(limit = 30) {
        const response = await fetch(`/api/health/steps?limit=${limit}`);
        return parseJsonResponse(response);
    }

    async function getAllHealthSteps() {
        const response = await fetch('/api/health/steps/all');
        return parseJsonResponse(response);
    }

    async function getHealthDashboardData(limit = 30) {
        const [stats, steps] = await Promise.all([
            getHealthStats(),
            getRecentHealthSteps(limit)
        ]);

        return { stats, steps };
    }

    globalScope.healthApi = {
        uploadHealthCsv,
        getHealthStats,
        getRecentHealthSteps,
        getAllHealthSteps,
        getHealthDashboardData
    };
})(window);
