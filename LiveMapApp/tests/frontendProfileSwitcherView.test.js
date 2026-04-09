const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function createButton(profile) {
    const classes = new Set();
    return {
        style: { display: '' },
        getAttribute: (name) => (name === 'data-profile' ? profile : null),
        classList: {
            add: (value) => classes.add(value),
            remove: (value) => classes.delete(value),
            toggle: (value, force) => {
                if (typeof force === 'boolean') {
                    if (force) classes.add(value);
                    else classes.delete(value);
                    return force;
                }

                if (classes.has(value)) {
                    classes.delete(value);
                    return false;
                }

                classes.add(value);
                return true;
            },
            contains: (value) => classes.has(value)
        }
    };
}

function createDocument(buttons) {
    const styleSetProperty = jest.fn();

    return {
        querySelectorAll: jest.fn((selector) => {
            if (selector === '.profile-btn') {
                return buttons;
            }
            return [];
        }),
        querySelector: jest.fn((selector) => {
            const match = selector.match(/\.profile-btn\[data-profile="([^"]+)"\]/);
            if (!match) {
                return null;
            }
            return buttons.find((button) => button.getAttribute('data-profile') === match[1]) || null;
        }),
        getElementById: jest.fn(() => null),
        documentElement: {
            style: {
                setProperty: styleSetProperty
            }
        },
        _styleSetProperty: styleSetProperty
    };
}

function loadProfileSwitcherFactory(documentMock, fetchMock) {
    const filePath = path.join(__dirname, '..', 'public', 'js', 'views', 'navigation', 'profileSwitcherView.js');
    const sourceCode = fs.readFileSync(filePath, 'utf8');

    const context = {
        window: {},
        document: documentMock,
        fetch: fetchMock,
        console
    };

    vm.runInNewContext(sourceCode, context, { filename: 'profileSwitcherView.js' });
    return context.window.createProfileSwitcherView;
}

function buildCommonDeps(overrides = {}) {
    return {
        apiBase: '/api',
        getCurrentProfile: jest.fn(() => 'motorrad'),
        setCurrentProfile: jest.fn(),
        performProfileSwitch: jest.fn().mockResolvedValue(true),
        getAvailableProfiles: jest.fn(() => []),
        setAvailableProfiles: jest.fn(),
        nextProfileSwitchRequestId: jest.fn(() => 1),
        getProfileSwitchRequestId: jest.fn(() => 1),
        resetCompareSelectionProfile: jest.fn(),
        clearComparisonOverlay: jest.fn(),
        clearPrHighlightLayer: jest.fn(),
        updateSpeedLabels: jest.fn(),
        updateElevationLabels: jest.fn(),
        showProfileTracks: jest.fn(),
        persistUiState: jest.fn(),
        loadActivityNoteSummaries: jest.fn().mockResolvedValue(undefined),
        loadEquipment: jest.fn().mockResolvedValue(undefined),
        loadEquipmentAssignments: jest.fn().mockResolvedValue(undefined),
        renderHomeView: jest.fn(),
        renderAnalysesView: jest.fn(),
        renderStatisticsView: jest.fn(),
        isModalOpen: jest.fn(() => false),
        renderEquipmentModal: jest.fn().mockResolvedValue(undefined),
        isDashboardOpen: jest.fn(() => false),
        renderDashboard: jest.fn(),
        restorePersistedTrackSelection: jest.fn().mockResolvedValue(undefined),
        updateAnalysisControlAvailability: jest.fn(),
        runPersonalRecordAlertCheck: jest.fn(),
        ...overrides
    };
}

describe('profileSwitcherView integration', () => {
    it('initializes profiles with server list and persists active profile', async () => {
        const buttons = [createButton('motorrad'), createButton('rennrad'), createButton('laufen')];
        const documentMock = createDocument(buttons);
        const fetchMock = jest.fn().mockResolvedValue({
            ok: true,
            json: async () => ['rennrad', 'laufen']
        });

        let currentProfile = 'unknown-profile';
        const createProfileSwitcherView = loadProfileSwitcherFactory(documentMock, fetchMock);
        const deps = buildCommonDeps({
            getCurrentProfile: jest.fn(() => currentProfile),
            setCurrentProfile: jest.fn((next) => {
                currentProfile = next;
            })
        });

        const api = createProfileSwitcherView(deps);
        await api.initializeProfiles();

        expect(deps.setCurrentProfile).toHaveBeenCalledWith('rennrad');
        expect(deps.setAvailableProfiles).toHaveBeenCalledWith(['rennrad', 'laufen']);
        expect(documentMock._styleSetProperty).toHaveBeenCalledWith('--active-theme-color', 'var(--rennrad-color)');
        expect(deps.persistUiState).toHaveBeenCalled();
    });

    it('routes profile switch through orchestrator and executes legacy render chain', async () => {
        const rennradButton = createButton('rennrad');
        const laufenButton = createButton('laufen');
        const buttons = [rennradButton, laufenButton];
        const documentMock = createDocument(buttons);
        const fetchMock = jest.fn().mockResolvedValue({ ok: true, json: async () => [] });
        const createProfileSwitcherView = loadProfileSwitcherFactory(documentMock, fetchMock);

        let currentProfile = 'rennrad';
        const deps = buildCommonDeps({
            getCurrentProfile: jest.fn(() => currentProfile),
            setCurrentProfile: jest.fn((next) => {
                currentProfile = next;
            })
        });

        const api = createProfileSwitcherView(deps);
        api.initProfileSwitcher();

        await laufenButton.onclick({ currentTarget: laufenButton });

        expect(deps.performProfileSwitch).toHaveBeenCalledWith('laufen', { reloadData: false, bumpRequestId: false });
        expect(deps.setCurrentProfile).toHaveBeenCalledWith('laufen');
        expect(deps.renderHomeView).toHaveBeenCalled();
        expect(deps.renderAnalysesView).toHaveBeenCalled();
        expect(deps.renderStatisticsView).toHaveBeenCalled();
        expect(deps.restorePersistedTrackSelection).toHaveBeenCalledWith('laufen');
    });

    it('keeps previous active profile when orchestrator fails', async () => {
        const rennradButton = createButton('rennrad');
        const laufenButton = createButton('laufen');
        const buttons = [rennradButton, laufenButton];
        rennradButton.classList.add('active');

        const documentMock = createDocument(buttons);
        const fetchMock = jest.fn().mockResolvedValue({ ok: true, json: async () => [] });
        const createProfileSwitcherView = loadProfileSwitcherFactory(documentMock, fetchMock);

        const deps = buildCommonDeps({
            getCurrentProfile: jest.fn(() => 'rennrad'),
            performProfileSwitch: jest.fn().mockResolvedValue(false)
        });

        const api = createProfileSwitcherView(deps);
        api.initProfileSwitcher();

        await laufenButton.onclick({ currentTarget: laufenButton });

        expect(deps.setCurrentProfile).not.toHaveBeenCalled();
        expect(rennradButton.classList.contains('active')).toBe(true);
        expect(laufenButton.classList.contains('active')).toBe(false);
    });
});
