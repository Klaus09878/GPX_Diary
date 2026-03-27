const fs = require('fs');
const csv = require('csv-parser');

function createHealthRoutes({ upload, metadataStore }) {
    async function handleUploadHealth(req, res) {
        if (!req.file) {
            return res.status(400).json({ error: 'Keine Datei hochgeladen' });
        }

        const filePath = req.file.path;

        try {
            const results = [];

            const buffer = Buffer.alloc(4);
            const fd = fs.openSync(filePath, 'r');
            fs.readSync(fd, buffer, 0, 4, 0);
            fs.closeSync(fd);

            const firstChars = buffer.toString();
            const skipLines = firstChars.startsWith('sep=') ? 1 : 0;

            fs.createReadStream(filePath)
                .pipe(csv({
                    separator: ',',
                    skipLines: skipLines
                }))
                .on('data', (data) => results.push(data))
                .on('end', async () => {
                    try {
                        const stepsByDate = new Map();

                        for (const row of results) {
                            if (!row) continue;

                            if (row.type && row.type !== 'HKQuantityTypeIdentifierStepCount') {
                                continue;
                            }

                            const rawDate = row.startDate || row.start_date || row.date || row.Date || row.Datum || row.endDate || row.end_date;
                            const rawSteps = row.value || row.steps || row.Steps || row.Schritte;

                            if (!rawDate || rawSteps === undefined || rawSteps === null) {
                                continue;
                            }

                            let dateStr = rawDate;
                            if (dateStr.includes(' ')) {
                                dateStr = dateStr.split(' ')[0];
                            }

                            const dateObj = new Date(dateStr);
                            if (isNaN(dateObj.getTime())) {
                                continue;
                            }

                            const dateKey = dateObj.toISOString().split('T')[0];
                            const steps = Number.parseFloat(rawSteps);

                            if (!Number.isFinite(steps)) {
                                continue;
                            }

                            const stepCount = Math.max(0, Math.round(steps));
                            stepsByDate.set(dateKey, (stepsByDate.get(dateKey) || 0) + stepCount);
                        }

                        for (const [dateKey, steps] of stepsByDate.entries()) {
                            await metadataStore.upsertHealthSteps(dateKey, steps);
                        }

                        fs.unlinkSync(filePath);
                        return res.json({ success: true, count: stepsByDate.size });
                    } catch (error) {
                        console.error('Health upload inner error:', error);
                        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
                        return res.status(500).json({ error: 'Fehler beim Verarbeiten der Gesundheitsdaten' });
                    }
                })
                .on('error', (error) => {
                    console.error('CSV parse error:', error);
                    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
                    return res.status(500).json({ error: 'Fehler beim Lesen der CSV-Datei' });
                });
        } catch (error) {
            console.error('Health upload outer error:', error);
            if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
            return res.status(500).json({ error: 'Fehler beim Vorbereiten des Imports' });
        }
    }

    async function handleHealthStats(req, res) {
        try {
            const stats = await metadataStore.getHealthStats();
            return res.json(stats);
        } catch (error) {
            return res.status(500).json({ error: 'Fehler beim Laden der Gesundheits-Stats' });
        }
    }

    async function handleHealthSteps(req, res) {
        try {
            const limit = parseInt(req.query.limit, 10) || 30;
            const steps = await metadataStore.getHealthSteps(limit);
            return res.json(steps);
        } catch (error) {
            return res.status(500).json({ error: 'Fehler beim Laden der Schrittdaten' });
        }
    }

    async function handleAllHealthSteps(req, res) {
        try {
            const steps = await metadataStore.listAllHealthSteps();
            return res.json(steps);
        } catch (error) {
            return res.status(500).json({ error: 'Fehler beim Laden aller Schrittdaten' });
        }
    }

    function registerRoutes(app) {
        app.post('/api/upload/health', upload.single('file'), handleUploadHealth);
        app.get('/api/health/steps/stats', handleHealthStats);
        app.get('/api/health/steps', handleHealthSteps);
        app.get('/api/health/steps/all', handleAllHealthSteps);
    }

    return {
        registerRoutes
    };
}

module.exports = {
    createHealthRoutes
};
