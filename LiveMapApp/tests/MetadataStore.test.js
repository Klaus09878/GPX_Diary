const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const { MetadataStore } = require('../src/server/metadata/MetadataStore');

describe('MetadataStore', () => {
    let tempDir;
    let dbFilePath;
    let store;

    beforeEach(() => {
        tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'metadata-store-'));
        dbFilePath = path.join(tempDir, 'metadata.sqlite');
        store = new MetadataStore({
            dbFilePath,
            sqlJsDistDir: path.resolve(__dirname, '..', 'node_modules', 'sql.js', 'dist')
        });
    });

    afterEach(() => {
        if (tempDir && fs.existsSync(tempDir)) {
            fs.rmSync(tempDir, { recursive: true, force: true });
        }
    });

    it('saves and removes activity notes', async () => {
        await store.initialize();

        const saved = await store.saveNote('rennrad', 'tour.gpx', {
            perceivedForm: 4,
            noteText: 'Strong finish'
        });

        expect(saved.filename).toBe('tour.gpx');
        expect(saved.perceivedForm).toBe(4);
        expect(saved.noteText).toBe('Strong finish');

        const notesBeforeDelete = await store.listNotes('rennrad');
        expect(notesBeforeDelete).toHaveLength(1);

        await store.removeActivity('rennrad', 'tour.gpx');

        const notesAfterDelete = await store.listNotes('rennrad');
        expect(notesAfterDelete).toHaveLength(0);
    });

    it('upserts health steps by date', async () => {
        await store.initialize();

        await store.upsertHealthSteps('2026-03-01', 1000);
        await store.upsertHealthSteps('2026-03-01', 2500);
        await store.upsertHealthSteps('2026-03-02', 5000);

        const rows = await store.getHealthSteps(10);

        expect(rows).toEqual([
            { date: '2026-03-01', steps: 2500 },
            { date: '2026-03-02', steps: 5000 }
        ]);
    });
});
