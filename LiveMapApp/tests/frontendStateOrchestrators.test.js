const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function buildStore(initialState = {}) {
    const state = {
        ui: { currentProfile: 'motorrad' },
        selectedTrack: { profile: 'motorrad', filename: 'track.gpx' },
        playback: { isPlaying: true, currentIndex: 12 },
        editModes: {
            trimSelection: { profile: 'motorrad' },
            outlierSelection: { profile: 'motorrad' }
        },
        features: { profileSwitchRequestId: 3 },
        dataCaches: { equipment: {}, activityNotes: {} },
        ...initialState
    };

    function getNestedValue(obj, dottedPath) {
        return dottedPath.split('.').reduce((acc, part) => (acc == null ? undefined : acc[part]), obj);
    }

    function setNestedValue(obj, dottedPath, value) {
        const parts = dottedPath.split('.');
        let current = obj;
        for (let i = 0; i < parts.length - 1; i += 1) {
            const part = parts[i];
            if (!current[part] || typeof current[part] !== 'object') {
                current[part] = {};
            }
            current = current[part];
        }
        current[parts[parts.length - 1]] = value;
    }

    return {
        state,
        selectStateRaw: jest.fn((pathValue) => getNestedValue(state, pathValue)),
        setState: jest.fn((updates) => {
            Object.entries(updates || {}).forEach(([key, value]) => {
                setNestedValue(state, key, value);
            });
            return true;
        })
    };
}

function loadOrchestrators({ appStore, frontendApiClient }) {
    const orchestratorPath = path.join(__dirname, '..', 'public', 'js', 'app', 'orchestrators', 'stateOrchestrators.js');
    const sourceCode = fs.readFileSync(orchestratorPath, 'utf8');

    const context = {
        appStore,
        frontendApiClient,
        console,
        window: {}
    };

    vm.runInNewContext(sourceCode, context, { filename: 'stateOrchestrators.js' });
    return context.window.frontendOrchestrators;
}

describe('frontend state orchestrators', () => {
    it('keeps request id stable when bumpRequestId is disabled', async () => {
        const store = buildStore();
        const orchestrators = loadOrchestrators({
            appStore: store,
            frontendApiClient: {
                getTracks: jest.fn().mockResolvedValue([]),
                getEquipment: jest.fn().mockResolvedValue([]),
                getActivityNotes: jest.fn().mockResolvedValue([])
            }
        });

        const result = await orchestrators.performProfileSwitch('rennrad', {
            reloadData: false,
            bumpRequestId: false
        });

        expect(result).toBe(true);
        expect(store.state.ui.currentProfile).toBe('rennrad');
        expect(store.state.features.profileSwitchRequestId).toBe(3);
    });

    it('increments request id by default', async () => {
        const store = buildStore();
        const orchestrators = loadOrchestrators({
            appStore: store,
            frontendApiClient: {
                getTracks: jest.fn().mockResolvedValue([]),
                getEquipment: jest.fn().mockResolvedValue([]),
                getActivityNotes: jest.fn().mockResolvedValue([])
            }
        });

        const result = await orchestrators.performProfileSwitch('laufen', { reloadData: false });

        expect(result).toBe(true);
        expect(store.state.ui.currentProfile).toBe('laufen');
        expect(store.state.features.profileSwitchRequestId).toBe(4);
    });

    it('clears selection and playback state on profile changes', async () => {
        const store = buildStore();
        const orchestrators = loadOrchestrators({
            appStore: store,
            frontendApiClient: {
                getTracks: jest.fn().mockResolvedValue([]),
                getEquipment: jest.fn().mockResolvedValue([]),
                getActivityNotes: jest.fn().mockResolvedValue([])
            }
        });

        const result = await orchestrators.performProfileSwitch('spazieren', {
            reloadData: false,
            bumpRequestId: false
        });

        expect(result).toBe(true);
        expect(store.state.selectedTrack.profile).toBeNull();
        expect(store.state.selectedTrack.filename).toBeNull();
        expect(store.state.playback.isPlaying).toBe(false);
        expect(store.state.playback.currentIndex).toBe(0);
    });
});
