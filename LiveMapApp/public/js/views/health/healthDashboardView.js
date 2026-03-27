(function attachHealthDashboardViewFactory(globalScope) {
    function createHealthDashboardView({ showToast, formatDashboardNumber }) {
        let healthMainChartInstance = null;
        let healthWeekdayChartInstance = null;

        async function renderHealthView() {
            const view = document.getElementById('health-dashboard-view');
            if (!view) return;

            view.innerHTML = `
                <div id="health-dashboard" class="health-dashboard">
                    <header class="health-header">
                        <div class="health-header__content">
                            <span class="home-section-kicker">Gesundheit & Vitalität</span>
                            <h2>Apple Health Analyse</h2>
                            <p>Importiere deine Apple Health CSV-Exportdaten (Schritte), um Trends und Ziele zu visualisieren.</p>
                        </div>
                        <div class="health-upload-zone" id="health-drop-zone">
                            <input type="file" id="health-csv-input" accept=".csv" style="display: none;">
                            <button class="home-action-btn" onclick="document.getElementById('health-csv-input').click()">
                                CSV Hochladen
                            </button>
                            <p class="upload-hint">Nur .csv Dateien mit Spalten 'date' und 'steps'</p>
                        </div>
                    </header>

                    <div class="health-kpi-grid" id="health-kpi-container">
                        <div class="health-kpi-card loading">Lade Stats...</div>
                    </div>

                    <div class="health-charts-grid">
                        <article class="health-chart-card">
                            <h3>Schritte (Letzte 30 Tage)</h3>
                            <div class="health-chart-container">
                                <canvas id="health-steps-chart"></canvas>
                            </div>
                        </article>
                        <article class="health-chart-card">
                            <h3>Wochentags-Analyse</h3>
                            <div class="health-chart-container">
                                <canvas id="health-weekday-chart"></canvas>
                            </div>
                        </article>
                    </div>
                </div>
            `;

            const healthDashboardElement = document.getElementById('health-dashboard');
            if (healthDashboardElement) {
                healthDashboardElement.style.display = 'block';
            }

            const fileInput = document.getElementById('health-csv-input');
            fileInput?.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (file) handleHealthUpload(file);
            });

            await refreshHealthDashboard();
        }

        async function handleHealthUpload(file) {
            if (!file) return;

            const healthApiClient = globalScope.healthApi;

            try {
                showToast('Gesundheitsdaten werden verarbeitet...', 'info');
                let data;
                if (healthApiClient?.uploadHealthCsv) {
                    data = await healthApiClient.uploadHealthCsv(file);
                } else {
                    const formData = new FormData();
                    formData.append('file', file);
                    const response = await fetch('/api/upload/health', {
                        method: 'POST',
                        body: formData
                    });

                    data = await response.json();
                    if (!response.ok) {
                        throw new Error(data.error || 'Upload fehlgeschlagen');
                    }
                }

                if (data) {
                    showToast(`${data.count} Tage erfolgreich importiert!`, 'success');
                    await refreshHealthDashboard();
                }
            } catch (error) {
                console.error(error);
                showToast('Upload fehlgeschlagen: ' + error.message, 'error');
            }
        }

        async function refreshHealthDashboard() {
            try {
                const healthApiClient = globalScope.healthApi;
                let stats;
                let steps;

                if (healthApiClient?.getHealthDashboardData) {
                    const dashboardData = await healthApiClient.getHealthDashboardData(30);
                    stats = dashboardData.stats;
                    steps = dashboardData.steps;
                } else {
                    [stats, steps] = await Promise.all([
                        fetch('/api/health/steps/stats').then(r => r.json()),
                        fetch('/api/health/steps?limit=30').then(r => r.json())
                    ]);
                }

                renderHealthKPIs(stats);
                renderHealthMainChart(steps);
                renderHealthWeekdayChart();
            } catch (error) {
                console.error('Failed to refresh health dashboard:', error);
            }
        }

        function renderHealthKPIs(stats) {
            const container = document.getElementById('health-kpi-container');
            if (!container) return;

            const recordDate = stats.record ? stats.record.date : '—';
            const recordSteps = stats.record ? formatDashboardNumber(stats.record.steps, 0) : '—';

            container.innerHTML = `
                <article class="home-card">
                    <span class="home-card__label">Schritte Heute</span>
                    <strong class="home-card__value">${formatDashboardNumber(stats.today, 0)}</strong>
                    <span class="home-card__sub">Aktueller Tag</span>
                </article>
                <article class="home-card">
                    <span class="home-card__label">Ø (7 Tage)</span>
                    <strong class="home-card__value">${formatDashboardNumber(stats.avg7Days, 0)}</strong>
                    <span class="home-card__sub">Letzte Woche</span>
                </article>
                <article class="home-card">
                    <span class="home-card__label">Rekord-Tag</span>
                    <strong class="home-card__value">${recordSteps}</strong>
                    <span class="home-card__sub">${recordDate}</span>
                </article>
                <article class="home-card">
                    <span class="home-card__label">Gesamt</span>
                    <strong class="home-card__value">${formatDashboardNumber(stats.total, 0)}</strong>
                    <span class="home-card__sub">Über alle Daten</span>
                </article>
            `;
        }

        function renderHealthMainChart(data) {
            const ctx = document.getElementById('health-steps-chart')?.getContext('2d');
            if (!ctx) return;

            if (healthMainChartInstance) {
                healthMainChartInstance.destroy();
            }

            const labels = data.map(d => {
                const date = new Date(d.date);
                return date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
            });
            const values = data.map(d => d.steps);
            const goal = 10000;

            const backgroundColors = values.map(v => v >= goal ? 'rgba(34, 197, 94, 0.7)' : 'rgba(59, 130, 246, 0.6)');
            const borderColors = values.map(v => v >= goal ? 'rgb(34, 197, 94)' : 'rgb(59, 130, 246)');

            if (typeof Chart !== 'undefined' && typeof chartjsPluginAnnotation !== 'undefined') {
                Chart.register(chartjsPluginAnnotation);
            }

            healthMainChartInstance = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels,
                    datasets: [{
                        label: 'Schritte',
                        data: values,
                        backgroundColor: backgroundColors,
                        borderColor: borderColors,
                        borderWidth: 1,
                        borderRadius: 4
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false },
                        annotation: {
                            annotations: {
                                line1: {
                                    type: 'line',
                                    yMin: goal,
                                    yMax: goal,
                                    borderColor: 'rgba(249, 115, 22, 0.8)',
                                    borderWidth: 2,
                                    borderDash: [6, 6],
                                    label: {
                                        display: true,
                                        content: `Ziel: ${formatDashboardNumber(goal, 0)}`,
                                        position: 'end',
                                        backgroundColor: 'rgba(249, 115, 22, 0.8)',
                                        color: '#fff',
                                        font: { weight: 'bold', size: 10 }
                                    }
                                }
                            }
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            grid: { color: 'rgba(255,255,255,0.05)' },
                            ticks: { color: 'rgba(255,255,255,0.5)' }
                        },
                        x: {
                            grid: { display: false },
                            ticks: { color: 'rgba(255,255,255,0.5)' }
                        }
                    }
                }
            });
        }

        async function renderHealthWeekdayChart() {
            const ctx = document.getElementById('health-weekday-chart')?.getContext('2d');
            if (!ctx) return;

            if (healthWeekdayChartInstance) {
                healthWeekdayChartInstance.destroy();
            }

            try {
                const healthApiClient = globalScope.healthApi;
                const allData = healthApiClient?.getAllHealthSteps
                    ? await healthApiClient.getAllHealthSteps()
                    : await fetch('/api/health/steps/all').then(r => r.json());
                if (!allData.length) return;

                const weekdaySteps = [0, 0, 0, 0, 0, 0, 0];
                const weekdayCounts = [0, 0, 0, 0, 0, 0, 0];

                allData.forEach(d => {
                    const date = new Date(d.date);
                    let day = date.getDay();
                    day = (day + 6) % 7;
                    weekdaySteps[day] += d.steps;
                    weekdayCounts[day] += 1;
                });

                const avgs = weekdaySteps.map((sum, i) => weekdayCounts[i] ? Math.round(sum / weekdayCounts[i]) : 0);
                const labels = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];

                healthWeekdayChartInstance = new Chart(ctx, {
                    type: 'bar',
                    data: {
                        labels,
                        datasets: [{
                            label: 'Durchschnittliche Schritte',
                            data: avgs,
                            backgroundColor: 'rgba(139, 92, 246, 0.6)',
                            borderColor: 'rgb(139, 92, 246)',
                            borderWidth: 1,
                            borderRadius: 4
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: { display: false }
                        },
                        scales: {
                            y: {
                                beginAtZero: true,
                                grid: { color: 'rgba(255,255,255,0.05)' },
                                ticks: { color: 'rgba(255,255,255,0.5)' }
                            },
                            x: {
                                grid: { display: false },
                                ticks: { color: 'rgba(255,255,255,0.5)' }
                            }
                        }
                    }
                });
            } catch (error) {
                console.error('Weekday chart error:', error);
            }
        }

        return {
            renderHealthView,
            handleHealthUpload,
            refreshHealthDashboard,
            renderHealthKPIs,
            renderHealthMainChart,
            renderHealthWeekdayChart
        };
    }

    globalScope.createHealthDashboardView = createHealthDashboardView;
})(window);
