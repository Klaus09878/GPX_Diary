const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function loadScriptIntoWindow(scriptPath, windowRef) {
    const sourceCode = fs.readFileSync(scriptPath, 'utf8');
    const context = {
        window: windowRef,
        console
    };

    vm.runInNewContext(sourceCode, context, { filename: path.basename(scriptPath) });
}

describe('frontend manager factories', () => {
    it('profile manager tracks profile list and request id safely', () => {
        const windowRef = {};
        const profileManagerPath = path.join(
            __dirname,
            '..',
            'public',
            'js',
            'app',
            'managers',
            'profileManager.js'
        );

        loadScriptIntoWindow(profileManagerPath, windowRef);

        const profileManager = windowRef.createProfileManager({
            initialProfile: 'rennrad',
            initialAvailableProfiles: ['rennrad', 'laufen', ''],
            initialSwitchRequestId: 2
        });

        expect(profileManager.getCurrentProfile()).toBe('rennrad');
        expect(profileManager.getAvailableProfiles()).toEqual(['rennrad', 'laufen', '']);
        expect(profileManager.getProfileSwitchRequestId()).toBe(2);

        const nextProfiles = profileManager.setAvailableProfiles(['wandern', null, 'spazieren']);
        expect(nextProfiles).toEqual(['wandern', 'spazieren']);

        const externalCopy = profileManager.getAvailableProfiles();
        externalCopy.push('extern');
        expect(profileManager.getAvailableProfiles()).toEqual(['wandern', 'spazieren']);

        expect(profileManager.setCurrentProfile('')).toBe('rennrad');
        expect(profileManager.setCurrentProfile('motorrad')).toBe('motorrad');
        expect(profileManager.nextProfileSwitchRequestId()).toBe(3);
        expect(profileManager.setProfileSwitchRequestId(-1)).toBe(3);
        expect(profileManager.setProfileSwitchRequestId(10)).toBe(10);
    });

    it('ui state manager normalizes ui state transitions', () => {
        const windowRef = {};
        const uiStateManagerPath = path.join(
            __dirname,
            '..',
            'public',
            'js',
            'app',
            'managers',
            'uiStateManager.js'
        );

        loadScriptIntoWindow(uiStateManagerPath, windowRef);

        const uiStateManager = windowRef.createUiStateManager({
            initialCurrentView: 'analyses',
            initialStartupIntroDismissed: true,
            initialDashboardScope: 'all',
            initialSearchTerm: 'BERG',
            initialActiveFilters: ['uphill', 'long']
        });

        expect(uiStateManager.getCurrentView()).toBe('analyses');
        expect(uiStateManager.getStartupIntroDismissed()).toBe(true);
        expect(uiStateManager.getDashboardScope()).toBe('all');
        expect(uiStateManager.getCurrentSearchTerm()).toBe('BERG');
        expect(Array.from(uiStateManager.getActiveFilters())).toEqual(['uphill', 'long']);

        expect(uiStateManager.setCurrentSearchTerm('Tempo')).toBe('tempo');
        expect(uiStateManager.setDashboardScope('other')).toBe('profile');
        expect(uiStateManager.setStartupIntroDismissed(false)).toBe(false);
        expect(uiStateManager.setCurrentView('statistics')).toBe('statistics');

        const replaced = uiStateManager.replaceActiveFilters(['fresh']);
        expect(Array.from(replaced)).toEqual(['fresh']);
        expect(Array.from(uiStateManager.getActiveFilters())).toEqual(['fresh']);
    });

    it('map state manager normalizes map-related flags', () => {
        const windowRef = {};
        const mapStateManagerPath = path.join(
            __dirname,
            '..',
            'public',
            'js',
            'app',
            'managers',
            'mapStateManager.js'
        );

        loadScriptIntoWindow(mapStateManagerPath, windowRef);

        const state = {
            map: null,
            isHeatmapActive: false,
            isGlobalHeatmapActive: false,
            isOverlayActive: true,
            heatmapLayers: []
        };

        const mapStateManager = windowRef.createMapStateManager({
            getMap: () => state.map,
            setMap: (nextMap) => {
                state.map = nextMap;
            },
            getIsHeatmapActive: () => state.isHeatmapActive,
            setIsHeatmapActive: (nextValue) => {
                state.isHeatmapActive = nextValue;
            },
            getIsGlobalHeatmapActive: () => state.isGlobalHeatmapActive,
            setIsGlobalHeatmapActive: (nextValue) => {
                state.isGlobalHeatmapActive = nextValue;
            },
            getIsOverlayActive: () => state.isOverlayActive,
            setIsOverlayActive: (nextValue) => {
                state.isOverlayActive = nextValue;
            },
            getHeatmapLayers: () => state.heatmapLayers,
            setHeatmapLayers: (nextValue) => {
                state.heatmapLayers = nextValue;
            }
        });

        const mapRef = { id: 'map-1' };
        mapStateManager.setMap(mapRef);
        expect(mapStateManager.getMap()).toBe(mapRef);

        expect(mapStateManager.setIsHeatmapActive(1)).toBe(true);
        expect(mapStateManager.getIsHeatmapActive()).toBe(true);

        expect(mapStateManager.setIsGlobalHeatmapActive('yes')).toBe(true);
        expect(mapStateManager.getIsGlobalHeatmapActive()).toBe(true);

        expect(mapStateManager.setIsOverlayActive(0)).toBe(false);
        expect(mapStateManager.getIsOverlayActive()).toBe(false);

        expect(mapStateManager.setHeatmapLayers([1, 2])).toEqual([1, 2]);
        expect(mapStateManager.setHeatmapLayers('invalid')).toEqual([]);
    });

    it('playback state manager normalizes playback values', () => {
        const windowRef = {};
        const playbackStateManagerPath = path.join(
            __dirname,
            '..',
            'public',
            'js',
            'app',
            'managers',
            'playbackStateManager.js'
        );

        loadScriptIntoWindow(playbackStateManagerPath, windowRef);

        const state = {
            initialized: false,
            points: [],
            speed: 5,
            index: 0,
            timeline: [],
            virtualSeconds: 0,
            lastTickMs: 0,
            timer: null,
            marker: null,
            isPlaying: false
        };

        const playbackStateManager = windowRef.createPlaybackStateManager({
            getPlaybackKeybindingsInitialized: () => state.initialized,
            setPlaybackKeybindingsInitialized: (nextValue) => {
                state.initialized = nextValue;
            },
            getPlaybackPoints: () => state.points,
            setPlaybackPoints: (nextValue) => {
                state.points = nextValue;
            },
            getPlaybackSpeed: () => state.speed,
            setPlaybackSpeed: (nextValue) => {
                state.speed = nextValue;
            },
            getPlaybackIndex: () => state.index,
            setPlaybackIndex: (nextValue) => {
                state.index = nextValue;
            },
            getPlaybackTimelineSeconds: () => state.timeline,
            setPlaybackTimelineSeconds: (nextValue) => {
                state.timeline = nextValue;
            },
            getPlaybackVirtualSeconds: () => state.virtualSeconds,
            setPlaybackVirtualSeconds: (nextValue) => {
                state.virtualSeconds = nextValue;
            },
            getPlaybackLastTickMs: () => state.lastTickMs,
            setPlaybackLastTickMs: (nextValue) => {
                state.lastTickMs = nextValue;
            },
            getPlaybackTimer: () => state.timer,
            setPlaybackTimer: (nextValue) => {
                state.timer = nextValue;
            },
            getPlaybackMarker: () => state.marker,
            setPlaybackMarker: (nextValue) => {
                state.marker = nextValue;
            },
            getIsPlaying: () => state.isPlaying,
            setIsPlaying: (nextValue) => {
                state.isPlaying = nextValue;
            }
        });

        expect(playbackStateManager.setPlaybackKeybindingsInitialized('x')).toBe(true);
        expect(playbackStateManager.getPlaybackKeybindingsInitialized()).toBe(true);

        expect(playbackStateManager.setPlaybackPoints([1, 2, 3])).toEqual([1, 2, 3]);
        expect(playbackStateManager.setPlaybackPoints('invalid')).toEqual([]);

        expect(playbackStateManager.setPlaybackSpeed('10')).toBe(10);
        expect(playbackStateManager.setPlaybackSpeed('invalid')).toBe(5);

        expect(playbackStateManager.setPlaybackIndex(9)).toBe(9);
        expect(playbackStateManager.setPlaybackIndex(-1)).toBe(0);

        expect(playbackStateManager.setPlaybackTimelineSeconds([1, 2])).toEqual([1, 2]);
        expect(playbackStateManager.setPlaybackVirtualSeconds('12')).toBe(12);
        expect(playbackStateManager.setPlaybackLastTickMs('18')).toBe(18);

        const timerRef = { id: 'timer-1' };
        const markerRef = { id: 'marker-1' };
        expect(playbackStateManager.setPlaybackTimer(timerRef)).toBe(timerRef);
        expect(playbackStateManager.getPlaybackTimer()).toBe(timerRef);
        expect(playbackStateManager.setPlaybackMarker(markerRef)).toBe(markerRef);
        expect(playbackStateManager.getPlaybackMarker()).toBe(markerRef);

        expect(playbackStateManager.setIsPlaying(1)).toBe(true);
        expect(playbackStateManager.getIsPlaying()).toBe(true);
    });
});
