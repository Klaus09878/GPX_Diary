// app.js — GPX Map Diary Frontend (100% Functional & Production Ready)

const API_BASE = '/api';
const PUBLIC_CONFIG_ENDPOINT = `${API_BASE}/public-config`;

class PersistedUiStateStore {
    constructor(storageKey) {
        this.storageKey = storageKey;
        this.snapshot = this.read();
    }

    read() {
        if (typeof window === 'undefined' || !window.localStorage) {
            return {};
        }

        try {
            const raw = window.localStorage.getItem(this.storageKey);
            if (!raw) {
                return {};
            }

            const parsed = JSON.parse(raw);
            return parsed && typeof parsed === 'object' ? parsed : {};
        } catch (error) {
            console.warn('Persistenter UI-Zustand konnte nicht gelesen werden.', error);
            return {};
        }
    }

    load() {
        return { ...this.snapshot };
    }

    save(partialState = {}) {
        this.snapshot = {
            ...this.snapshot,
            ...partialState
        };

        if (typeof window === 'undefined' || !window.localStorage) {
            return this.snapshot;
        }

        try {
            window.localStorage.setItem(this.storageKey, JSON.stringify(this.snapshot));
        } catch (error) {
            console.warn('Persistenter UI-Zustand konnte nicht gespeichert werden.', error);
        }

        return this.snapshot;
    }
}

class FrontendAppController {
    constructor(stateStore) {
        this.stateStore = stateStore;
    }

    async bootstrap() {
        const startupExperience = beginStartupExperience();
        await initSupportCta();
        
        try {
            updateStartupProgress({ statusText: 'Karte wird initialisiert...' });
            initMap();
            
            updateStartupProgress({ statusText: 'Profile werden geladen...' });
            await initializeProfiles();
            syncFoundationProfileState();
            
            updateStartupProgress({ statusText: 'Navigation wird vorbereitet...' });
            initAppNavigation();
            initModalAccessibility();
            initProfileSwitcher();
            
            updateStartupProgress({ statusText: 'Systeme werden geladen...' });
            initDragAndDrop();
            initFiltersAndSort();
            initDashboard();
            initComparisonModal();
            initPrAnalysisModal();
            initEquipmentModal();
            initDeleteAll();
            initHeatmapToggle();
            initHeatmapScopeToggle();
            initHeatmapTimeFilters();
            initOverlayToggle();
            initFloatingPanelControls();
            initElevationPanel();
            initChartTabs();
            initView3DToggle();
            initSearch();
            initMapFilters();
            initGradientToggle();
            initPlaybackUI();
            
            updateStartupProgress({ statusText: 'Einstellungen werden angewendet...' });
            updateSpeedLabels();
            updateElevationLabels();
            applyPersistedUiStateToControls();
            
            updateStartupProgress({ statusText: 'Aktivitäten werden synchronisiert...' });
            await loadAllTracks({ startup: true });
            
            updateStartupProgress({ statusText: 'Zusatzdaten werden geladen...' });
            const activeProfile = getEffectiveCurrentProfile();
            await loadActivityNoteSummaries(activeProfile);
            await loadEquipment(activeProfile);
            await loadEquipmentAssignments(activeProfile);
            
            updateStartupProgress({ statusText: 'Interface wird vorbereitet...' });
            renderHomeView();
            renderAnalysesView();
            renderStatisticsView();
            
            updateStartupProgress({ statusText: 'Willkommen!' });
            await startupExperience.finish();
            persistUiState();
        } catch (error) {
            console.error('Bootstrap failed:', error);
            updateStartupProgress({ 
                statusText: `Fehler beim Start: ${error.message || 'Unbekannter Fehler'}`,
                total: 0,
                processed: 0
            });
            // We don't call finish() here to keep the error visible
        }
    }
}

// ===========================================================
// CONSTANTS & HELPERS (Must be defined before state init)
// ===========================================================

const STARTUP_LOADING_MIN_MS = 500;
const ANALYSIS_STEEP_THRESHOLD_DEFAULT = 8;
const ANALYSIS_STEEP_THRESHOLD_MIN = 1;
const ANALYSIS_STEEP_THRESHOLD_MAX = 25;
const ANALYSIS_SPEED_THRESHOLD_MIN = 1;
const ANALYSIS_SPEED_THRESHOLD_MAX = 220;
const speedThresholdService = window.createSpeedThresholdService({
    getCurrentProfile: () => getEffectiveCurrentProfile()
});

function clampNumber(value, min, max, fallback) {
    return analysisNormalizationService.clampNumber(value, min, max, fallback);
}

function normalizeAnalysisThresholdEntry(profile, rawEntry) {
    return analysisNormalizationService.normalizeAnalysisThresholdEntry(profile, rawEntry);
}

function normalizeAnalysisThresholdsByProfile(rawByProfile) {
    return analysisNormalizationService.normalizeAnalysisThresholdsByProfile(rawByProfile);
}

function normalizeHeatmapTimeFilters(rawFilters) {
    return analysisNormalizationService.normalizeHeatmapTimeFilters(rawFilters);
}

const analysisNormalizationService = window.createAnalysisNormalizationService({
    analysisSteepThresholdMin: ANALYSIS_STEEP_THRESHOLD_MIN,
    analysisSteepThresholdMax: ANALYSIS_STEEP_THRESHOLD_MAX,
    analysisSteepThresholdDefault: ANALYSIS_STEEP_THRESHOLD_DEFAULT,
    analysisSpeedThresholdMin: ANALYSIS_SPEED_THRESHOLD_MIN,
    analysisSpeedThresholdMax: ANALYSIS_SPEED_THRESHOLD_MAX,
    getSpeedThresholdsForProfile
});
// ===========================================================
// GLOBAL STATE INITIALIZATION
// ===========================================================

const uiStateStore = new PersistedUiStateStore('gpx-map-diary.ui-state.v1');
const persistedUiState = uiStateStore.load();

let currentProfile = typeof persistedUiState.currentProfile === 'string' && persistedUiState.currentProfile
    ? persistedUiState.currentProfile
    : 'motorrad';
let availableProfiles = [];
let map;
let trackLayers = {};
let activeTrackName = null;
let trackDataCache = [];
let tracksByProfile = {}; 
let cachedTracks = {}; 
let isAppLoaded = false;
let loadGeneration = 0;
let profileSwitchRequestId = 0;
let searchDebounceTimer = null;

// Premium Feature State
let heatmapLayers = [];
let overlayLayer = null; 
let isHeatmapActive = false;
let isGlobalHeatmapActive = false;
let isOverlayActive = true; 
let elevationChart = null;
let speedChart = null;
let hrChart = null;
let powerChart = null;
let elevationMarker = null;
let activeCharts = ['elevation', 'speed']; 
let analysisLayers = []; 
let analysisMode = 'off';

// Playback State
let playbackMarker = null;
let playbackTimer = null;
let playbackIndex = 0;
let playbackSpeed = 5;
let playbackTimelineSeconds = [];
let playbackVirtualSeconds = 0;
let playbackLastTickMs = 0;
let isPlaying = false;
let playbackPoints = []; 
let trimSelection = null;
let outlierSelection = null;
let compareSelection = { profile: null, leftFilename: null, rightFilename: null };
let compareOverlayLayers = [];
let prHighlightLayer = null;
let prAnalysisCacheGeneration = -1;
let prAnalysisEntryCache = {};
let analysisOverviewCacheGeneration = -1;
let analysisOverviewByProfile = {};
let analysisOverviewPromiseByProfile = {};
let trackStatsCacheGeneration = -1;
let trackStatsByScopeCache = {};

// Filter State
let activeFilters = new Set(Array.isArray(persistedUiState.activeFilters) ? persistedUiState.activeFilters : []);
let currentSearchTerm = typeof persistedUiState.currentSearchTerm === 'string' ? persistedUiState.currentSearchTerm : '';
let toastSequence = 0;
let playbackKeybindingsInitialized = false;
let activeSelectionRequestId = 0;
let currentView = 'home';
let startupIntroDismissed = persistedUiState.startupIntroDismissed === true;
let dashboardScope = persistedUiState.dashboardScope === 'all' ? 'all' : 'profile';
let heatmapTimeFilters = normalizeHeatmapTimeFilters(persistedUiState.heatmapTimeFilters);
let whatIfPaceByProfile = persistedUiState.whatIfPaceByProfile && typeof persistedUiState.whatIfPaceByProfile === 'object'
    ? { ...persistedUiState.whatIfPaceByProfile }
    : {};
let analysisThresholdsByProfile = normalizeAnalysisThresholdsByProfile(persistedUiState.analysisThresholdsByProfile);
let lastSelectedTrackByProfile = persistedUiState.lastSelectedTrackByProfile && typeof persistedUiState.lastSelectedTrackByProfile === 'object'
    ? { ...persistedUiState.lastSelectedTrackByProfile }
    : {};
let prAlertBaselineByProfile = persistedUiState.prAlertBaselineByProfile && typeof persistedUiState.prAlertBaselineByProfile === 'object'
    ? { ...persistedUiState.prAlertBaselineByProfile }
    : {};

let activityNoteSummariesByProfile = {};
let activityNoteLoadPromises = {};
let activityNoteByTrackPromises = {};
let segmentFavoritesByProfile = {};
let segmentFavoriteLoadPromises = {};
let segmentFavoriteDraftByProfile = {};
let equipmentByProfile = {};
let equipmentLoadPromises = {};
let equipmentAssignmentsByProfile = {};
let equipmentAssignmentsLoadPromises = {};
let equipmentEditorDraftByProfile = {};

const profileManager = window.createProfileManager({
    initialProfile: currentProfile,
    initialAvailableProfiles: availableProfiles,
    initialSwitchRequestId: profileSwitchRequestId
});

const uiStateManager = window.createUiStateManager({
    initialCurrentView: currentView,
    initialStartupIntroDismissed: startupIntroDismissed,
    initialDashboardScope: dashboardScope,
    initialSearchTerm: currentSearchTerm,
    initialActiveFilters: Array.from(activeFilters)
});

const mapStateManager = window.createMapStateManager({
    getMap: () => map,
    setMap: (nextMap) => {
        map = nextMap;
    },
    getIsHeatmapActive: () => isHeatmapActive,
    setIsHeatmapActive: (nextValue) => {
        isHeatmapActive = Boolean(nextValue);
    },
    getIsGlobalHeatmapActive: () => isGlobalHeatmapActive,
    setIsGlobalHeatmapActive: (nextValue) => {
        isGlobalHeatmapActive = Boolean(nextValue);
    },
    getIsOverlayActive: () => isOverlayActive,
    setIsOverlayActive: (nextValue) => {
        isOverlayActive = Boolean(nextValue);
    },
    getHeatmapLayers: () => heatmapLayers,
    setHeatmapLayers: (nextLayers) => {
        heatmapLayers = Array.isArray(nextLayers) ? nextLayers : [];
    }
});

const playbackStateManager = window.createPlaybackStateManager({
    getPlaybackKeybindingsInitialized: () => playbackKeybindingsInitialized,
    setPlaybackKeybindingsInitialized: (nextValue) => {
        playbackKeybindingsInitialized = Boolean(nextValue);
    },
    getPlaybackPoints: () => playbackPoints,
    setPlaybackPoints: (nextPoints) => {
        playbackPoints = Array.isArray(nextPoints) ? nextPoints : [];
    },
    getPlaybackSpeed: () => playbackSpeed,
    setPlaybackSpeed: (nextSpeed) => {
        playbackSpeed = Number(nextSpeed);
    },
    getPlaybackIndex: () => playbackIndex,
    setPlaybackIndex: (nextIndex) => {
        playbackIndex = Number(nextIndex);
    },
    getPlaybackTimelineSeconds: () => playbackTimelineSeconds,
    setPlaybackTimelineSeconds: (nextTimeline) => {
        playbackTimelineSeconds = Array.isArray(nextTimeline) ? nextTimeline : [];
    },
    getPlaybackVirtualSeconds: () => playbackVirtualSeconds,
    setPlaybackVirtualSeconds: (nextValue) => {
        playbackVirtualSeconds = Number(nextValue);
    },
    getPlaybackLastTickMs: () => playbackLastTickMs,
    setPlaybackLastTickMs: (nextValue) => {
        playbackLastTickMs = Number(nextValue);
    },
    getPlaybackTimer: () => playbackTimer,
    setPlaybackTimer: (nextTimer) => {
        playbackTimer = nextTimer;
    },
    getPlaybackMarker: () => playbackMarker,
    setPlaybackMarker: (nextMarker) => {
        playbackMarker = nextMarker;
    },
    getIsPlaying: () => isPlaying,
    setIsPlaying: (nextValue) => {
        isPlaying = Boolean(nextValue);
    }
});

const trackSelectionManager = window.createTrackSelectionManager({
    getActiveTrackName: () => activeTrackName,
    setActiveTrackName: (nextValue) => {
        activeTrackName = nextValue;
    },
    getSelectionRequestId: () => activeSelectionRequestId,
    setSelectionRequestId: (nextValue) => {
        activeSelectionRequestId = Number(nextValue);
    },
    getLastSelectedTrackByProfile: () => lastSelectedTrackByProfile,
    setLastSelectedTrackByProfile: (nextValue) => {
        lastSelectedTrackByProfile = nextValue && typeof nextValue === 'object' ? nextValue : {};
    }
});

// ===========================================================
const HEATMAP_SAMPLE_DISTANCE_M = 20;
const HEATMAP_GRID_FACTOR = 5000;
const PLAYBACK_SPEED_OPTIONS = [1, 2, 5, 10, 20, 50, 100];
const PR_DISTANCE_METERS = [1000, 5000, 10000];
const ALERT_DISTANCE_METERS = [200, 500, 1000, 5000, 10000];
const ANALYSIS_MODE_OFF = 'off';
const ANALYSIS_MODE_ELEVATION = 'elevation';
const ANALYSIS_MODE_SPEED = 'speed';
const VIEW_HOME = 'home';
const VIEW_MAP = 'map';
const VIEW_ANALYSES = 'analyses';
const VIEW_STATISTICS = 'statistics';
const VIEW_HEALTH = 'health';
const EARTH_CIRCUMFERENCE_KM = 40075;
const EVEREST_HEIGHT_M = 8848;
const SEARCH_INPUT_DEBOUNCE_MS = 140;
const TREND_WINDOW_DAYS = 30;
const MODAL_FOCUSABLE_SELECTOR = 'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

const htmlEscapeService = window.createHtmlEscapeService();
const formatUtilsService = window.createFormatUtilsService();
const prAlertsService = window.createPrAlertsService({
    alertDistanceMeters: ALERT_DISTANCE_METERS,
    buildPrLeaderboard,
    buildTopClimbRanking,
    formatDistanceLabel,
    formatEffortTime,
    getTrackDisplayName,
    getCurrentProfile: () => getEffectiveCurrentProfile(),
    getTracksByProfile: (profile) => tracksByProfile[profile],
    getPrAlertBaselineByProfile: () => prAlertBaselineByProfile,
    setPrAlertBaselineByProfile: (nextValue) => {
        prAlertBaselineByProfile = nextValue && typeof nextValue === 'object' ? nextValue : {};
    },
    collectProfileAnalysisEntries,
    persistUiState,
    showToast
});
const analysisThresholdPresetService = window.createAnalysisThresholdPresetService({
    getCurrentProfile: () => getEffectiveCurrentProfile(),
    normalizeAnalysisThresholdEntry,
    analysisSteepThresholdDefault: ANALYSIS_STEEP_THRESHOLD_DEFAULT,
    getSpeedThresholdsForProfile,
    getAnalysisThresholds,
    escapeHtml
});
const formatUtilsBridgeService = window.createFormatUtilsBridgeService({
    formatUtilsService,
    htmlEscapeService,
    getDisplayFormatViewApi
});
const analysisThresholdPresetBridgeService = window.createAnalysisThresholdPresetBridgeService({
    analysisThresholdPresetService,
    speedThresholdService
});
const equipmentMaintenanceService = window.createEquipmentMaintenanceService({
    getCurrentProfile: () => getEffectiveCurrentProfile(),
    getCachedTrack,
    getEquipmentAssignmentMap,
    getEquipmentItems,
    formatDashboardNumber
});
const persistedSelectionService = window.createPersistedSelectionService({
    viewHome: VIEW_HOME,
    getCurrentProfile: () => getEffectiveCurrentProfile(),
    getCurrentSearchTerm: () => uiStateManager.getCurrentSearchTerm(),
    getActiveFilters: () => uiStateManager.getActiveFilters(),
    getHeatmapTimeFilters: () => heatmapTimeFilters,
    syncAnalysisToggleButtons,
    updateAnalysisControlAvailability,
    updateDashboardScopeButtons,
    setCurrentView: (nextView) => {
        currentView = uiStateManager.setCurrentView(nextView);
    },
    setActiveView,
    getLastSelectedTrackByProfile: () => trackSelectionManager.getLastSelectedTrackByProfile(),
    setLastSelectedTrackByProfile: (nextValue) => trackSelectionManager.setLastSelectedTrackByProfile(nextValue),
    persistUiState,
    getTracksByProfile: (profile) => tracksByProfile[profile],
    getActiveTrackName: () => getEffectiveActiveTrackName(),
    ensureMapViewportReady,
    selectTrack
});
const mapCoordinateValidationService = window.createMapCoordinateValidationService();
const mapViewportSafetyService = window.createMapViewportSafetyService({
    getMap: () => map,
    getCurrentView: () => uiStateManager.getCurrentView(),
    mapView: VIEW_MAP,
    isValidMapCoordinatePair,
    warn: (...args) => console.warn(...args)
});
const mapSafetyBridgeService = window.createMapSafetyBridgeService({
    mapCoordinateValidationService,
    mapViewportSafetyService
});
const chartPanelService = window.createChartPanelService({
    getActiveCharts: () => activeCharts,
    setActiveCharts: (nextCharts) => {
        activeCharts = Array.isArray(nextCharts) ? nextCharts : [];
    },
    getCharts: () => [elevationChart, speedChart, hrChart, powerChart]
});
const overlayHeatmapToggleService = window.createOverlayHeatmapToggleService({
    getIsHeatmapActive: () => mapStateManager.getIsHeatmapActive(),
    setIsHeatmapActive: (nextValue) => mapStateManager.setIsHeatmapActive(nextValue),
    getIsGlobalHeatmapActive: () => mapStateManager.getIsGlobalHeatmapActive(),
    setIsGlobalHeatmapActive: (nextValue) => mapStateManager.setIsGlobalHeatmapActive(nextValue),
    getIsOverlayActive: () => mapStateManager.getIsOverlayActive(),
    setIsOverlayActive: (nextValue) => mapStateManager.setIsOverlayActive(nextValue),
    clearHeatmapLayers,
    updateHeatmap,
    getTrackLayers: () => trackLayers,
    getActiveTrackName: () => getEffectiveActiveTrackName(),
    getMap: () => mapStateManager.getMap(),
    getAllLineLayers: collectAllNonHeatmapLineLayers,
    getHeatmapLayers: () => mapStateManager.getHeatmapLayers()
});
const playbackControlService = window.createPlaybackControlService({
    getPlaybackKeybindingsInitialized: () => playbackStateManager.getPlaybackKeybindingsInitialized(),
    setPlaybackKeybindingsInitialized: (nextValue) => playbackStateManager.setPlaybackKeybindingsInitialized(nextValue),
    getActiveTrackName: () => getEffectiveActiveTrackName(),
    getPlaybackPoints: () => playbackStateManager.getPlaybackPoints(),
    getIsPlaying: () => getEffectiveIsPlaying(),
    getPlaybackSpeed: () => playbackStateManager.getPlaybackSpeed(),
    getPlaybackIndex: () => getEffectivePlaybackIndex(),
    setPlaybackIndexState: (nextValue) => {
        setEffectivePlaybackIndex(nextValue);
    },
    getPlaybackTimelineSeconds: () => playbackStateManager.getPlaybackTimelineSeconds(),
    setPlaybackTimelineSeconds: (nextValue) => playbackStateManager.setPlaybackTimelineSeconds(nextValue),
    getPlaybackVirtualSeconds: () => playbackStateManager.getPlaybackVirtualSeconds(),
    setPlaybackVirtualSeconds: (nextValue) => playbackStateManager.setPlaybackVirtualSeconds(nextValue),
    getPlaybackLastTickMs: () => playbackStateManager.getPlaybackLastTickMs(),
    setPlaybackLastTickMs: (nextValue) => playbackStateManager.setPlaybackLastTickMs(nextValue),
    getPlaybackTimer: () => playbackStateManager.getPlaybackTimer(),
    setPlaybackTimer: (nextValue) => playbackStateManager.setPlaybackTimer(nextValue),
    setIsPlaying: (nextValue) => {
        setEffectiveIsPlaying(nextValue);
    },
    syncAllCharts,
    rebuildPlaybackTimeline,
    getPlaybackIndexForVirtualTime,
    showToast,
    clearChartSync,
    setPlaybackMarker: (nextValue) => {
        playbackStateManager.setPlaybackMarker(nextValue);
    }
});
const toastNotificationService = window.createToastNotificationService({
    getToastSequence: () => toastSequence,
    setToastSequence: (nextValue) => {
        toastSequence = Number.isFinite(Number(nextValue)) ? Number(nextValue) : 0;
    },
    log: (...args) => console.log(...args)
});
const heatmapTimeFilterService = window.createHeatmapTimeFilterService({
    toFiniteNumber,
    getHeatmapTimeFilters: () => heatmapTimeFilters,
    setHeatmapTimeFilters: (nextValue) => {
        heatmapTimeFilters = nextValue && typeof nextValue === 'object' ? nextValue : {};
    },
    persistUiState,
    getIsHeatmapActive: () => mapStateManager.getIsHeatmapActive(),
    updateHeatmap
});
const heatmapGradientService = window.createHeatmapGradientService();
const heatmapLayerService = window.createHeatmapLayerService({
    getLeaflet: () => window.L,
    getMap: () => mapStateManager.getMap(),
    getCurrentProfile: () => getEffectiveCurrentProfile(),
    getCachedTracks: () => cachedTracks,
    getTrackLayers: () => trackLayers,
    getCachedTrack,
    extractPointsSafely,
    getIsGlobalHeatmapActive: () => mapStateManager.getIsGlobalHeatmapActive(),
    getIsHeatmapActive: () => mapStateManager.getIsHeatmapActive(),
    canRenderMapOverlays,
    isValidMapCoordinatePair,
    isFiniteTrackPoint,
    isHeatmapPointMatchingTimeFilters,
    buildHeatmapGradientForProfile,
    heatmapSampleDistanceM: HEATMAP_SAMPLE_DISTANCE_M,
    heatmapGridFactor: HEATMAP_GRID_FACTOR,
    getHeatmapLayers: () => mapStateManager.getHeatmapLayers(),
    setHeatmapLayers: (nextValue) => mapStateManager.setHeatmapLayers(nextValue)
});
const panelUiService = window.createPanelUiService({
    endOutlierMode,
    endTrimMode,
    stopPlayback,
    clearChartSync,
    getActiveCharts: () => activeCharts,
    setActiveCharts: (nextValue) => {
        activeCharts = Array.isArray(nextValue) ? nextValue : [];
    },
    refreshChartContainers
});
const loadingOverlayService = window.createLoadingOverlayService();
const playbackChartSyncService = window.createPlaybackChartSyncService({
    buildPlaybackTimeline,
    getPlaybackPoints: () => playbackStateManager.getPlaybackPoints(),
    getPlaybackIndex: () => getEffectivePlaybackIndex(),
    setPlaybackIndex: (nextValue) => {
        setEffectivePlaybackIndex(nextValue);
    },
    getPlaybackTimelineSeconds: () => playbackStateManager.getPlaybackTimelineSeconds(),
    setPlaybackTimelineSeconds: (nextValue) => playbackStateManager.setPlaybackTimelineSeconds(nextValue),
    setPlaybackVirtualSeconds: (nextValue) => playbackStateManager.setPlaybackVirtualSeconds(nextValue),
    getCharts: () => [elevationChart, speedChart, hrChart, powerChart],
    getPlaybackMarker: () => playbackStateManager.getPlaybackMarker(),
    setPlaybackMarker: (nextValue) => {
        playbackStateManager.setPlaybackMarker(nextValue);
    },
    getLeaflet: () => window.L,
    getMap: () => mapStateManager.getMap(),
    updatePlaybackControlState
});
const playbackTimelineService = window.createPlaybackTimelineService({
    calculateSegmentDistanceMeters
});
const playbackChartSyncBridgeService = window.createPlaybackChartSyncBridgeService({
    playbackTimelineService,
    playbackChartSyncService
});
const segmentFavoriteHelperService = window.createSegmentFavoriteHelperService({
    formatMetricValue
});
const chartBuildService = window.createChartBuildService({
    getPlaybackPoints: () => playbackStateManager.getPlaybackPoints(),
    getElevationChart: () => elevationChart,
    setElevationChart: (nextValue) => {
        elevationChart = nextValue;
    },
    getSpeedChart: () => speedChart,
    setSpeedChart: (nextValue) => {
        speedChart = nextValue;
    },
    getHrChart: () => hrChart,
    setHrChart: (nextValue) => {
        hrChart = nextValue;
    },
    getPowerChart: () => powerChart,
    setPowerChart: (nextValue) => {
        powerChart = nextValue;
    },
    getHeartRateValue,
    getPowerValue,
    countValidPowerSamples,
    resolvePointSpeedKmh,
    syncAllCharts,
    pausePlayback,
    setPlaybackIndex,
    updateChartTabsVisibility,
    scheduleChartResize,
    getChartCtor: () => Chart
});
const chartBuildBridgeService = window.createChartBuildBridgeService({
    chartBuildService
});
const trackCacheService = window.createTrackCacheService({
    getCachedTracks: () => cachedTracks
});
const chartPluginService = window.createChartPluginService();
const gpxParserBridgeService = window.createGpxParserBridgeService({
    getGpxParserViewApi,
    getTrackPointLoadViewApi,
    getTrackPointFallbackViewApi,
    trackCacheService
});
const mapLayerCleanupBridgeService = window.createMapLayerCleanupBridgeService({
    getMapLayerCleanupViewApi,
    getTrackVisualStateViewApi
});
const weatherBridgeService = window.createWeatherBridgeService({
    getWeatherStateViewApi,
    getWeatherRequestPayloadViewApi,
    getWeatherLoadViewApi,
    getWeatherCardViewApi
});
const trimLifecycleBridgeService = window.createTrimLifecycleBridgeService({
    getTrimModeStateViewApi,
    getTrimHandleIconViewApi,
    getTrimSummaryViewApi,
    getTrimPreviewViewApi,
    getTrimInteractionViewApi,
    getTrimLifecycleViewApi,
    getTrimBeginViewApi,
    getTrimCommitViewApi
});
const outlierDetectionBridgeService = window.createOutlierDetectionBridgeService({
    getOutlierRulesViewApi,
    getOutlierLabelViewApi,
    getOutlierSegmentsViewApi,
    getOutlierCandidateAssemblyViewApi,
    getOutlierDetectionViewApi,
    getOutlierHighlightViewApi,
    getOutlierModeViewApi,
    getOutlierCleanupViewApi
});
const appNavigationBridgeService = window.createAppNavigationBridgeService({
    getViewStateViewApi,
    getNavigationViewApi,
    getModalAccessibilityViewApi,
    getFilterSearchViewApi,
    persistedSelectionService,
    getHomeQuickActionsViewApi,
    getHomeViewApi,
    getHomeTrackNavigationViewApi,
    getActivityNoteViewApi,
    getEquipmentTrackViewApi,
    getUploadViewApi,
    getDeleteAllViewApi
});
const statisticsBridgeService = window.createStatisticsBridgeService({
    getStatisticsViewApi,
    getStatsAggregateViewApi,
    getComparisonSummaryViewApi,
    getComparisonSelectionViewApi,
    getComparisonViewApi
});
const analysisDistributionBridgeService = window.createAnalysisDistributionBridgeService({
    getAnalysisDistributionViewApi,
    getAnalysisThresholdControlsViewApi,
    getAnalysisModeViewApi,
    analysisNormalizationService
});
const prAnalysisBridgeService = window.createPrAnalysisBridgeService({
    getAnalysesViewApi,
    getPrAnalysisViewApi,
    prAlertsService
});
const panelUiBridgeService = window.createPanelUiBridgeService({
    panelUiService,
    loadingOverlayService,
    chartPanelService,
    toastNotificationService
});
const playbackControlBridgeService = window.createPlaybackControlBridgeService({
    playbackControlService
});
const heatmapLayerBridgeService = window.createHeatmapLayerBridgeService({
    heatmapLayerService,
    overlayHeatmapToggleService,
    heatmapTimeFilterService,
    heatmapGradientService
});
const initializationBridgeService = window.createInitializationBridgeService({
    getMapInitViewApi,
    getProfileSwitcherViewApi,
    getView3DToggleViewApi,
    getStartupOverlayViewApi,
    resolveViewApi,
    showToast,
    formatDashboardNumber
});

const GRADE_BANDS = [
    { id: 'descent-extreme', max: -12, color: '#312e81', rangeLabel: '< -12%', label: 'Extremes Gefälle' },
    { id: 'descent-steep', max: -8, color: '#4f46e5', rangeLabel: '-8% bis -12%', label: 'Steiles Gefälle' },
    { id: 'descent-moderate', max: -4, color: '#0ea5e9', rangeLabel: '-4% bis -8%', label: 'Gefälle' },
    { id: 'flat', max: 1.5, color: '#10b981', rangeLabel: '±1.5%', label: 'Flach' },
    { id: 'climb-light', max: 4, color: '#f59e0b', rangeLabel: '1.5% bis 4%', label: 'Leicht bergauf' },
    { id: 'climb-moderate', max: 8, color: '#f97316', rangeLabel: '4% bis 8%', label: 'Moderat bergauf' },
    { id: 'climb-steep', max: 12, color: '#ef4444', rangeLabel: '8% bis 12%', label: 'Steil bergauf' },
    { id: 'climb-very-steep', max: 15, color: '#b91c1c', rangeLabel: '12% bis 15%', label: 'Sehr steil bergauf' },
    { id: 'climb-extreme', max: Number.POSITIVE_INFINITY, color: '#7f1d1d', rangeLabel: '> 15%', label: 'Extrem steil bergauf' }
];

const SPEED_ANALYSIS_BANDS_BY_PROFILE = {
    spazieren: [
        { id: 'walk-easy', max: 3, color: '#312e81', rangeLabel: '< 3 km/h', label: 'Sehr gemütlich' },
        { id: 'walk-regular', max: 4.5, color: '#4f46e5', rangeLabel: '3 bis 4.5 km/h', label: 'Normal' },
        { id: 'walk-brisk', max: 6, color: '#0ea5e9', rangeLabel: '4.5 bis 6 km/h', label: 'Zügig' },
        { id: 'walk-fast', max: 7.5, color: '#10b981', rangeLabel: '6 bis 7.5 km/h', label: 'Schnell' },
        { id: 'walk-very-fast', max: 9, color: '#f59e0b', rangeLabel: '7.5 bis 9 km/h', label: 'Sehr schnell' },
        { id: 'walk-peak', max: Number.POSITIVE_INFINITY, color: '#ef4444', rangeLabel: '> 9 km/h', label: 'Spitze' }
    ],
    laufen: [
        { id: 'run-easy', max: 7, color: '#312e81', rangeLabel: '< 7 km/h', label: 'Sehr locker' },
        { id: 'run-steady', max: 9, color: '#4f46e5', rangeLabel: '7 bis 9 km/h', label: 'Locker' },
        { id: 'run-tempo', max: 11, color: '#0ea5e9', rangeLabel: '9 bis 11 km/h', label: 'Zügig' },
        { id: 'run-fast', max: 13, color: '#10b981', rangeLabel: '11 bis 13 km/h', label: 'Schnell' },
        { id: 'run-very-fast', max: 15, color: '#f59e0b', rangeLabel: '13 bis 15 km/h', label: 'Sehr schnell' },
        { id: 'run-peak', max: Number.POSITIVE_INFINITY, color: '#ef4444', rangeLabel: '> 15 km/h', label: 'Spitze' }
    ],
    rennrad: [
        { id: 'bike-easy', max: 14, color: '#312e81', rangeLabel: '< 14 km/h', label: 'Sehr locker' },
        { id: 'bike-steady', max: 20, color: '#4f46e5', rangeLabel: '14 bis 20 km/h', label: 'Locker' },
        { id: 'bike-tempo', max: 26, color: '#0ea5e9', rangeLabel: '20 bis 26 km/h', label: 'Zügig' },
        { id: 'bike-fast', max: 32, color: '#10b981', rangeLabel: '26 bis 32 km/h', label: 'Schnell' },
        { id: 'bike-very-fast', max: 38, color: '#f59e0b', rangeLabel: '32 bis 38 km/h', label: 'Sehr schnell' },
        { id: 'bike-peak', max: Number.POSITIVE_INFINITY, color: '#ef4444', rangeLabel: '> 38 km/h', label: 'Spitze' }
    ],
    motorrad: [
        { id: 'moto-urban', max: 25, color: '#312e81', rangeLabel: '< 25 km/h', label: 'Rollend' },
        { id: 'moto-city', max: 45, color: '#4f46e5', rangeLabel: '25 bis 45 km/h', label: 'Stadt' },
        { id: 'moto-cruise', max: 70, color: '#0ea5e9', rangeLabel: '45 bis 70 km/h', label: 'Cruise' },
        { id: 'moto-fast', max: 95, color: '#10b981', rangeLabel: '70 bis 95 km/h', label: 'Schnell' },
        { id: 'moto-very-fast', max: 120, color: '#f59e0b', rangeLabel: '95 bis 120 km/h', label: 'Sehr schnell' },
        { id: 'moto-peak', max: Number.POSITIVE_INFINITY, color: '#ef4444', rangeLabel: '> 120 km/h', label: 'Spitze' }
    ]
};
const SPEED_ANALYSIS_PASSAGE_DISTANCES = [200, 500, 1000, 5000, 10000];
const SEGMENT_FAVORITE_SUGGESTION_LIMIT = 10;
const NOTE_SCORE_FIELDS = [
    {
        key: 'perceivedForm',
        label: 'Form',
        options: [
            { value: '', label: 'Nicht bewertet' },
            { value: '1', label: '1 · Schwach' },
            { value: '2', label: '2 · Eher schwer' },
            { value: '3', label: '3 · Solide' },
            { value: '4', label: '4 · Stark' },
            { value: '5', label: '5 · Topform' }
        ]
    },
    {
        key: 'weatherFeeling',
        label: 'Wettergefühl',
        options: [
            { value: '', label: 'Nicht bewertet' },
            { value: '1', label: '1 · Sehr unangenehm' },
            { value: '2', label: '2 · Eher schwierig' },
            { value: '3', label: '3 · Neutral' },
            { value: '4', label: '4 · Gut' },
            { value: '5', label: '5 · Perfekt' }
        ]
    },
    {
        key: 'sleepQuality',
        label: 'Schlaf',
        options: [
            { value: '', label: 'Nicht bewertet' },
            { value: '1', label: '1 · Sehr schlecht' },
            { value: '2', label: '2 · Unruhig' },
            { value: '3', label: '3 · Okay' },
            { value: '4', label: '4 · Gut' },
            { value: '5', label: '5 · Sehr gut' }
        ]
    },
    {
        key: 'rpe',
        label: 'RPE',
        options: [
            { value: '', label: 'Nicht bewertet' },
            { value: '1', label: '1 · Sehr locker' },
            { value: '2', label: '2 · Locker' },
            { value: '3', label: '3 · Mittel' },
            { value: '4', label: '4 · Hart' },
            { value: '5', label: '5 · Maximal' }
        ]
    }
];

function getDefaultAnalysisThresholds(profile = currentProfile) {
    return analysisThresholdPresetBridgeService.getDefaultAnalysisThresholds(profile);
}

function getAnalysisSpeedPresetDelta(profile = currentProfile) {
    return analysisThresholdPresetBridgeService.getAnalysisSpeedPresetDelta(profile);
}

function getAnalysisThresholdPreset(profile = currentProfile, presetKey = 'standard') {
    return analysisThresholdPresetBridgeService.getAnalysisThresholdPreset(profile, presetKey);
}

function areAnalysisThresholdValuesEqual(leftValue, rightValue) {
    return analysisThresholdPresetBridgeService.areAnalysisThresholdValuesEqual(leftValue, rightValue);
}

function areAnalysisThresholdsEqual(leftThresholds, rightThresholds) {
    return analysisThresholdPresetBridgeService.areAnalysisThresholdsEqual(leftThresholds, rightThresholds);
}

function getAnalysisThresholdPresetKey(profile = currentProfile, thresholds = null) {
    return analysisThresholdPresetBridgeService.getAnalysisThresholdPresetKey(profile, thresholds);
}

function getAnalysisThresholdPresetLabel(presetKey) {
    return analysisThresholdPresetBridgeService.getAnalysisThresholdPresetLabel(presetKey);
}

function getAnalysisThresholdPresetIcon(presetKey) {
    return analysisThresholdPresetBridgeService.getAnalysisThresholdPresetIcon(presetKey);
}

function getAnalysisThresholdPresetStateMarkup(presetKey) {
    return analysisThresholdPresetBridgeService.getAnalysisThresholdPresetStateMarkup(presetKey);
}

function getAnalysisThresholds(profile = currentProfile) {
    if (!profile) {
        return getDefaultAnalysisThresholds(currentProfile);
    }

    if (!analysisThresholdsByProfile[profile]) {
        analysisThresholdsByProfile[profile] = getDefaultAnalysisThresholds(profile);
    }

    return { ...analysisThresholdsByProfile[profile] };
}

function setAnalysisThresholds(profile, nextThresholds, { rerender = true } = {}) {
    if (!profile) {
        return;
    }

    const previous = getAnalysisThresholds(profile);
    const merged = normalizeAnalysisThresholdEntry(profile, {
        ...previous,
        ...(nextThresholds && typeof nextThresholds === 'object' ? nextThresholds : {})
    });

    const hasChanged = merged.steepGradePercent !== previous.steepGradePercent
        || merged.fastSpeedKmh !== previous.fastSpeedKmh;

    analysisThresholdsByProfile[profile] = merged;
    delete analysisOverviewByProfile[profile];
    delete analysisOverviewPromiseByProfile[profile];
    persistUiState();

    if (!hasChanged || !rerender) {
        return;
    }

    if (uiStateManager.getCurrentView() === VIEW_ANALYSES) {
        renderAnalysesView();
    }
}

function resetAnalysisThresholds(profile, { rerender = true } = {}) {
    if (!profile) {
        return;
    }

    delete analysisThresholdsByProfile[profile];
    delete analysisOverviewByProfile[profile];
    delete analysisOverviewPromiseByProfile[profile];
    persistUiState();

    if (rerender && uiStateManager.getCurrentView() === VIEW_ANALYSES) {
        renderAnalysesView();
    }
}

function formatNumericInputValue(value, fractionDigits = 1) {
    return formatUtilsBridgeService.formatNumericInputValue(value, fractionDigits);
}

function formatThresholdLabel(value, unit) {
    return formatUtilsBridgeService.formatThresholdLabel(value, unit);
}

function getDefaultWhatIfPace(profile = currentProfile) {
    const thresholds = getSpeedThresholdsForProfile(profile);
    const target = (Number(thresholds.normalMin) + Number(thresholds.normalMax)) / 2;
    return Number.isFinite(target) && target > 0 ? Number(target.toFixed(1)) : 10;
}

function getWhatIfPace(profile = currentProfile) {
    const persistedPace = Number(whatIfPaceByProfile?.[profile]);
    if (Number.isFinite(persistedPace) && persistedPace > 0) {
        return persistedPace;
    }

    return getDefaultWhatIfPace(profile);
}

function setWhatIfPace(profile, valueKmh) {
    if (!profile) {
        return;
    }

    const numericValue = Number(valueKmh);
    if (!Number.isFinite(numericValue) || numericValue <= 0) {
        delete whatIfPaceByProfile[profile];
    } else {
        whatIfPaceByProfile[profile] = Number(numericValue.toFixed(1));
    }

    persistUiState();
}

function updateDashboardScopeButtons(root = document) {
    dashboardScope = uiStateManager.getDashboardScope();
    root.querySelectorAll('[data-stats-scope]').forEach(button => {
        button.classList.toggle('active', button.getAttribute('data-stats-scope') === dashboardScope);
    });
}

function setDashboardScope(nextScope, { rerender = true } = {}) {
    dashboardScope = uiStateManager.setDashboardScope(nextScope);
    updateDashboardScopeButtons();
    persistUiState();

    if (!rerender) {
        return;
    }

    if (isDashboardOpen()) {
        renderDashboard();
    }

    if (uiStateManager.getCurrentView() === VIEW_STATISTICS) {
        renderStatisticsView();
    }
}

function persistUiState() {
    currentProfile = profileManager.getCurrentProfile();
    currentView = uiStateManager.getCurrentView();
    startupIntroDismissed = uiStateManager.getStartupIntroDismissed();
    currentSearchTerm = uiStateManager.getCurrentSearchTerm();
    activeFilters = uiStateManager.getActiveFilters();
    dashboardScope = uiStateManager.getDashboardScope();

    uiStateStore.save({
        currentProfile,
        currentView,
        startupIntroDismissed,
        currentSearchTerm,
        activeFilters: Array.from(activeFilters),
        lastSelectedTrackByProfile: { ...lastSelectedTrackByProfile },
        prAlertBaselineByProfile: { ...prAlertBaselineByProfile },
        dashboardScope,
        heatmapTimeFilters: { ...heatmapTimeFilters },
        whatIfPaceByProfile: { ...whatIfPaceByProfile },
        analysisThresholdsByProfile: { ...analysisThresholdsByProfile }
    });
}

function formatDistanceLabel(distanceMeters) {
    return formatUtilsBridgeService.formatDistanceLabel(distanceMeters);
}

function buildPersonalRecordSnapshot(entries) {
    return prAnalysisBridgeService.buildPersonalRecordSnapshot(entries);
}

function createPersonalRecordAlertMessages(previousSnapshot, nextSnapshot) {
    return prAnalysisBridgeService.createPersonalRecordAlertMessages(previousSnapshot, nextSnapshot);
}

async function runPersonalRecordAlertCheck(options = {}) {
    return prAnalysisBridgeService.runPersonalRecordAlertCheck(options);
}

function applyPersistedUiStateToControls() {
    return appNavigationBridgeService.applyPersistedUiStateToControls();
}

function getPersistedTrackSelection(profile = currentProfile) {
    return appNavigationBridgeService.getPersistedTrackSelection(profile);
}

function setPersistedTrackSelection(profile, filename) {
    return appNavigationBridgeService.setPersistedTrackSelection(profile, filename);
}

async function restorePersistedTrackSelection(profile = currentProfile) {
    return appNavigationBridgeService.restorePersistedTrackSelection(profile);
}

const activityDataService = window.createActivityDataService({
    apiBase: API_BASE,
    getCurrentProfile: () => getEffectiveCurrentProfile(),
    getState: () => ({
        activityNoteSummariesByProfile,
        activityNoteLoadPromises,
        activityNoteByTrackPromises,
        segmentFavoritesByProfile,
        segmentFavoriteLoadPromises,
        segmentFavoriteDraftByProfile,
        equipmentByProfile,
        equipmentLoadPromises,
        equipmentAssignmentsByProfile,
        equipmentAssignmentsLoadPromises,
        equipmentEditorDraftByProfile
    }),
    onCurrentProfileNotesLoaded: (profile) => {
        if (profile === currentProfile) {
            renderHomeView();
        }
    }
});
const equipmentDataBridgeService = window.createEquipmentDataBridgeService({
    activityDataService,
    getEquipmentViewApi,
    segmentFavoriteHelperService,
    equipmentMaintenanceService
});

function getActivityNoteSummary(profile, filename) {
    return equipmentDataBridgeService.getActivityNoteSummary(profile, filename);
}

function updateActivityNoteSummary(profile, note) {
    return equipmentDataBridgeService.updateActivityNoteSummary(profile, note);
}

function setActivityNoteSummaries(profile, notes) {
    return equipmentDataBridgeService.setActivityNoteSummaries(profile, notes);
}

async function loadActivityNoteSummaries(profile = currentProfile, { force = false } = {}) {
    return equipmentDataBridgeService.loadActivityNoteSummaries(profile, { force });
}

async function fetchActivityNote(profile, filename) {
    return equipmentDataBridgeService.fetchActivityNote(profile, filename);
}

async function saveActivityNote(filename, payload) {
    return equipmentDataBridgeService.saveActivityNote(filename, payload);
}

function getSegmentFavorites(profile = currentProfile) {
    return equipmentDataBridgeService.getSegmentFavorites(profile);
}

function setSegmentFavorites(profile, favorites) {
    return equipmentDataBridgeService.setSegmentFavorites(profile, favorites);
}

function upsertSegmentFavoriteInCache(profile, favorite) {
    return equipmentDataBridgeService.upsertSegmentFavoriteInCache(profile, favorite);
}

function removeSegmentFavoriteFromCache(profile, favoriteId) {
    return equipmentDataBridgeService.removeSegmentFavoriteFromCache(profile, favoriteId);
}

function getSegmentFavoriteDraft(profile = currentProfile) {
    return equipmentDataBridgeService.getSegmentFavoriteDraft(profile);
}

function setSegmentFavoriteDraft(profile, draft) {
    return equipmentDataBridgeService.setSegmentFavoriteDraft(profile, draft);
}

function clearSegmentFavoriteDraft(profile = currentProfile) {
    return equipmentDataBridgeService.clearSegmentFavoriteDraft(profile);
}

async function loadSegmentFavorites(profile = currentProfile, { force = false } = {}) {
    return equipmentDataBridgeService.loadSegmentFavorites(profile, { force });
}

async function createSegmentFavorite(profile, payload) {
    return equipmentDataBridgeService.createSegmentFavorite(profile, payload);
}

async function updateSegmentFavorite(profile, favoriteId, payload) {
    return equipmentDataBridgeService.updateSegmentFavorite(profile, favoriteId, payload);
}

async function deleteSegmentFavorite(profile, favoriteId) {
    return equipmentDataBridgeService.deleteSegmentFavorite(profile, favoriteId);
}

function getEquipmentItems(profile = currentProfile) {
    return equipmentDataBridgeService.getEquipmentItems(profile);
}

function setEquipmentItems(profile, items) {
    return equipmentDataBridgeService.setEquipmentItems(profile, items);
}

function getEquipmentEditorDraft(profile = currentProfile) {
    return equipmentDataBridgeService.getEquipmentEditorDraft(profile);
}

function setEquipmentEditorDraft(profile, draft) {
    return equipmentDataBridgeService.setEquipmentEditorDraft(profile, draft);
}

function clearEquipmentEditorDraft(profile = currentProfile) {
    return equipmentDataBridgeService.clearEquipmentEditorDraft(profile);
}

function getEquipmentAssignmentMap(profile = currentProfile) {
    return equipmentDataBridgeService.getEquipmentAssignmentMap(profile);
}

function setEquipmentAssignments(profile, assignments) {
    return equipmentDataBridgeService.setEquipmentAssignments(profile, assignments);
}

function upsertEquipmentAssignment(profile, assignment) {
    return equipmentDataBridgeService.upsertEquipmentAssignment(profile, assignment);
}

function getTrackEquipmentAssignment(profile, filename) {
    return equipmentDataBridgeService.getTrackEquipmentAssignment(profile, filename);
}

async function loadEquipment(profile = currentProfile, { force = false } = {}) {
    return equipmentDataBridgeService.loadEquipment(profile, { force });
}

async function loadEquipmentAssignments(profile = currentProfile, { force = false } = {}) {
    return equipmentDataBridgeService.loadEquipmentAssignments(profile, { force });
}

async function createEquipment(profile, payload) {
    return equipmentDataBridgeService.createEquipment(profile, payload);
}

async function updateEquipment(profile, equipmentId, payload) {
    return equipmentDataBridgeService.updateEquipment(profile, equipmentId, payload);
}

async function deleteEquipment(profile, equipmentId) {
    return equipmentDataBridgeService.deleteEquipment(profile, equipmentId);
}

async function saveTrackEquipmentAssignment(profile, filename, equipmentId) {
    return equipmentDataBridgeService.saveTrackEquipmentAssignment(profile, filename, equipmentId);
}

function getTrackDistanceKm(profile, filename) {
    return equipmentDataBridgeService.getTrackDistanceKm(profile, filename);
}

function buildEquipmentUsageMap(profile = currentProfile) {
    return equipmentDataBridgeService.buildEquipmentUsageMap(profile);
}

function getEquipmentMaintenanceStatus(equipment, usageKm) {
    return equipmentDataBridgeService.getEquipmentMaintenanceStatus(equipment, usageKm);
}

function getEquipmentStatusClass(statusState) {
    return equipmentDataBridgeService.getEquipmentStatusClass(statusState);
}

function getEquipmentReminderSummary(profile = currentProfile) {
    return equipmentDataBridgeService.getEquipmentReminderSummary(profile);
}

function clearTrackFilters() {
    return appNavigationBridgeService.clearTrackFilters();
}

async function openTrackFromHome(filename) {
    return appNavigationBridgeService.openTrackFromHome(filename);
}

function setActiveView(nextView, { skipPersist = false } = {}) {
    return appNavigationBridgeService.setActiveView(nextView, { skipPersist });
}

function initAppNavigation() {
    return appNavigationBridgeService.initAppNavigation();
}

function normalizeSupportUrl(rawUrl) {
    if (typeof rawUrl !== 'string') {
        return '';
    }

    const trimmed = rawUrl.trim();
    if (!trimmed) {
        return '';
    }

    try {
        const parsed = new URL(trimmed, window.location.origin);
        if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
            return '';
        }

        return parsed.toString();
    } catch (error) {
        return '';
    }
}

const DEFAULT_SUPPORT_URL = 'https://buymeacoffee.com/Klaus09878';

async function initSupportCta() {
    const supportLinks = [
        document.getElementById('support-link'),
        document.getElementById('startup-support-link-intro'),
        document.getElementById('startup-support-link-loading')
    ].filter(Boolean);

    if (!supportLinks.length) return;

    supportLinks.forEach(link => link.classList.add('is-hidden'));

    function applySupportUrl(rawUrl) {
        const supportUrl = normalizeSupportUrl(rawUrl);
        if (!supportUrl) {
            return false;
        }

        supportLinks.forEach(link => {
            link.href = supportUrl;
            link.classList.remove('is-hidden');
        });

        return true;
    }

    try {
        const response = await fetch(PUBLIC_CONFIG_ENDPOINT, {
            cache: 'no-store'
        });

        if (!response.ok) {
            applySupportUrl(DEFAULT_SUPPORT_URL);
            return;
        }

        const payload = await response.json().catch(() => ({}));
        if (applySupportUrl(payload && payload.supportUrl)) {
            return;
        }

        if (!applySupportUrl(DEFAULT_SUPPORT_URL)) {
            return;
        }
    } catch (error) {
        console.warn('Support-CTA konnte nicht geladen werden.', error);
        applySupportUrl(DEFAULT_SUPPORT_URL);
    }
}

function openModalWithA11y(modal, { returnFocusEl = null, initialFocusSelector = '.close-btn' } = {}) {
    return appNavigationBridgeService.openModalWithA11y(modal, { returnFocusEl, initialFocusSelector });
}

function closeModalWithA11y(modal, { skipFocusRestore = false } = {}) {
    return appNavigationBridgeService.closeModalWithA11y(modal, { skipFocusRestore });
}

function initModalAccessibility() {
    return appNavigationBridgeService.initModalAccessibility();
}

function isModalOpen(modal) {
    return Boolean(modal) && (modal.classList.contains('is-open') || modal.style.display === 'flex');
}

function bindHomeQuickActions(homeView) {
    return appNavigationBridgeService.bindHomeQuickActions(homeView);
}

function initStandardModal({ modalId, triggerId, closeId, initialFocusSelector = '.close-btn', onOpen = null } = {}) {
    return appNavigationBridgeService.initStandardModal({
        modalId,
        triggerId,
        closeId,
        initialFocusSelector,
        onOpen
    });
}

function getModalAccessibilityViewApi() {
    return resolveViewApi('__modalAccessibilityViewApi', 'createModalAccessibilityView', () => ({
            modalFocusableSelector: MODAL_FOCUSABLE_SELECTOR
        }));
}

function escapeHtml(value) {
    return formatUtilsBridgeService.escapeHtml(value);
}

function renderHomeView() {
    return appNavigationBridgeService.renderHomeView();
}

async function populateActivityNoteCard(container, filename) {
    return appNavigationBridgeService.populateActivityNoteCard(container, filename);
}

async function populateTrackEquipmentCard(container, filename) {
    return appNavigationBridgeService.populateTrackEquipmentCard(container, filename);
}

function getTrackCacheKey(profile, filename) {
    return gpxParserBridgeService.getTrackCacheKey(profile, filename);
}

function getCachedTrack(profile, filename) {
    return gpxParserBridgeService.getCachedTrack(profile, filename);
}

function setCachedTrack(profile, filename, value) {
    return gpxParserBridgeService.setCachedTrack(profile, filename, value);
}

function removeCachedTrack(profile, filename) {
    return gpxParserBridgeService.removeCachedTrack(profile, filename);
}

function updateStartupProgress({ total = 0, processed = 0, statusText = '' } = {}) {
    return initializationBridgeService.updateStartupProgress({ total, processed, statusText });
}

function beginStartupExperience() {
    return initializationBridgeService.beginStartupExperience();
}

function syncFoundationProfileState() {
    if (typeof appStore === 'undefined' || !appStore || typeof appStore.setState !== 'function') {
        return;
    }

    currentProfile = profileManager.setCurrentProfile(currentProfile);
    profileSwitchRequestId = profileManager.setProfileSwitchRequestId(profileSwitchRequestId);

    const storeRequestId = typeof appStore.selectStateRaw === 'function'
        ? appStore.selectStateRaw('features.profileSwitchRequestId')
        : null;

    if (Number.isInteger(storeRequestId) && storeRequestId > profileSwitchRequestId) {
        profileSwitchRequestId = profileManager.setProfileSwitchRequestId(storeRequestId);
    }

    appStore.setState({
        'ui.currentProfile': profileManager.getCurrentProfile(),
        'features.profileSwitchRequestId': profileSwitchRequestId
    });
}

function syncFoundationSelectionState(profile = getEffectiveCurrentProfile()) {
    if (typeof appStore === 'undefined' || !appStore || typeof appStore.setState !== 'function') {
        return;
    }

    const safeFilename = trackSelectionManager.getActiveTrackName();
    appStore.setState({
        'selectedTrack.profile': safeFilename ? profile : null,
        'selectedTrack.filename': safeFilename
    });
}

function setEffectiveActiveTrackName(filename, profile = getEffectiveCurrentProfile()) {
    activeTrackName = trackSelectionManager.setActiveTrackName(filename);
    syncFoundationSelectionState(profile);
    return activeTrackName;
}

function getEffectiveActiveTrackName() {
    if (typeof appStore !== 'undefined' && appStore && typeof appStore.selectStateRaw === 'function') {
        const currentProfileForRead = getEffectiveCurrentProfile();
        const profileFromStore = appStore.selectStateRaw('selectedTrack.profile');
        const filenameFromStore = appStore.selectStateRaw('selectedTrack.filename');
        if (profileFromStore === currentProfileForRead && typeof filenameFromStore === 'string' && filenameFromStore) {
            return filenameFromStore;
        }
        if (profileFromStore === null && filenameFromStore === null) {
            return null;
        }
    }

    return trackSelectionManager.getActiveTrackName();
}

function setEffectivePlaybackIndex(nextValue) {
    const normalized = Number.isFinite(Number(nextValue)) ? Number(nextValue) : 0;
    playbackIndex = playbackStateManager.setPlaybackIndex(normalized);

    if (typeof appStore !== 'undefined' && appStore && typeof appStore.setState === 'function') {
        appStore.setState({ 'playback.currentIndex': normalized });
    }

    return normalized;
}

function getEffectivePlaybackIndex() {
    if (typeof appStore !== 'undefined' && appStore && typeof appStore.selectStateRaw === 'function') {
        const indexFromStore = appStore.selectStateRaw('playback.currentIndex');
        if (Number.isFinite(Number(indexFromStore)) && Number(indexFromStore) >= 0) {
            playbackStateManager.setPlaybackIndex(Number(indexFromStore));
            playbackIndex = Number(indexFromStore);
            return Number(indexFromStore);
        }
    }

    const indexFromManager = playbackStateManager.getPlaybackIndex();
    playbackIndex = indexFromManager;
    return indexFromManager;
}

function setEffectiveIsPlaying(nextValue) {
    const normalized = Boolean(nextValue);
    isPlaying = playbackStateManager.setIsPlaying(normalized);

    if (typeof appStore !== 'undefined' && appStore && typeof appStore.setState === 'function') {
        appStore.setState({ 'playback.isPlaying': normalized });
    }

    return normalized;
}

function getEffectiveIsPlaying() {
    if (typeof appStore !== 'undefined' && appStore && typeof appStore.selectStateRaw === 'function') {
        const isPlayingFromStore = appStore.selectStateRaw('playback.isPlaying');
        if (typeof isPlayingFromStore === 'boolean') {
            playbackStateManager.setIsPlaying(isPlayingFromStore);
            isPlaying = isPlayingFromStore;
            return isPlayingFromStore;
        }
    }

    const isPlayingFromManager = playbackStateManager.getIsPlaying();
    isPlaying = isPlayingFromManager;
    return isPlayingFromManager;
}

function getEffectiveCurrentProfile() {
    if (typeof appStore !== 'undefined' && appStore && typeof appStore.selectStateRaw === 'function') {
        const profileFromStore = appStore.selectStateRaw('ui.currentProfile');
        if (typeof profileFromStore === 'string' && profileFromStore) {
            profileManager.setCurrentProfile(profileFromStore);
            currentProfile = profileFromStore;
            return profileFromStore;
        }
    }

    const profileFromManager = profileManager.getCurrentProfile();
    if (typeof profileFromManager === 'string' && profileFromManager) {
        currentProfile = profileFromManager;
        return profileFromManager;
    }

    return currentProfile;
}

function getEffectiveProfileSwitchRequestId() {
    if (typeof appStore !== 'undefined' && appStore && typeof appStore.selectStateRaw === 'function') {
        const requestIdFromStore = appStore.selectStateRaw('features.profileSwitchRequestId');
        if (Number.isInteger(requestIdFromStore) && requestIdFromStore >= 0) {
            profileManager.setProfileSwitchRequestId(requestIdFromStore);
            profileSwitchRequestId = requestIdFromStore;
            return requestIdFromStore;
        }
    }

    const requestIdFromManager = profileManager.getProfileSwitchRequestId();
    if (Number.isInteger(requestIdFromManager) && requestIdFromManager >= 0) {
        profileSwitchRequestId = requestIdFromManager;
        return requestIdFromManager;
    }

    return profileSwitchRequestId;
}

// ===========================================================
// CHART PLUGINS
// ===========================================================
chartPluginService.registerSyncLinePlugin({ chartCtor: typeof Chart !== 'undefined' ? Chart : null });

const frontendAppController = new FrontendAppController(uiStateStore);

window.__legacyFrontendRuntime = window.__legacyFrontendRuntime || {};
window.__legacyFrontendRuntime.frontendAppController = frontendAppController;
window.__legacyFrontendRuntime.uiStateStore = uiStateStore;
window.__legacyFrontendRuntime.profileManager = profileManager;
window.__legacyFrontendRuntime.uiStateManager = uiStateManager;
window.__legacyFrontendRuntime.mapStateManager = mapStateManager;
window.__legacyFrontendRuntime.playbackStateManager = playbackStateManager;
window.__legacyFrontendRuntime.trackSelectionManager = trackSelectionManager;

document.addEventListener('DOMContentLoaded', async () => {
    if (window.__frontendApp && typeof window.__frontendApp.bootstrapLegacy === 'function') {
        await window.__frontendApp.bootstrapLegacy();
        return;
    }

    await frontendAppController.bootstrap();
});

// ===========================================================
// INITIALIZATION & UI
// ===========================================================

function initMap() {
    return initializationBridgeService.initMap();
}

async function initializeProfiles() {
    return initializationBridgeService.initializeProfiles();
}

function initProfileSwitcher() {
    return initializationBridgeService.initProfileSwitcher();
}

function isAnalysisModeEnabled(mode = analysisMode) {
    return analysisDistributionBridgeService.isAnalysisModeEnabled(mode);
}

function isAnalysisAvailable() {
    return analysisDistributionBridgeService.isAnalysisAvailable();
}

function getSpeedAnalysisBandsForProfile(profile = currentProfile) {
    return SPEED_ANALYSIS_BANDS_BY_PROFILE[profile] || SPEED_ANALYSIS_BANDS_BY_PROFILE.rennrad;
}

function getSpeedBand(speedKmh, bands = getSpeedAnalysisBandsForProfile()) {
    const normalizedSpeed = Number.isFinite(speedKmh) && speedKmh >= 0 ? speedKmh : 0;
    for (const band of bands) {
        if (normalizedSpeed <= band.max) {
            return band;
        }
    }

    return bands[bands.length - 1];
}

function syncAnalysisToggleButtons() {
    return analysisDistributionBridgeService.syncAnalysisToggleButtons();
}

function updateAnalysisControlAvailability() {
    return analysisDistributionBridgeService.updateAnalysisControlAvailability();
}

function setAnalysisMode(nextMode, { refreshSelection = true } = {}) {
    return analysisDistributionBridgeService.setAnalysisMode(nextMode, { refreshSelection });
}

function initGradientToggle() {
    return analysisDistributionBridgeService.initGradientToggle();
}

function initView3DToggle() {
    return initializationBridgeService.initView3DToggle();
}

// ===========================================================
// DATA EXTRACTION & FALLBACKS
// ===========================================================

function calculateSegmentDistanceMeters(pointA, pointB) {
    const latA = Number(pointA?.lat);
    const lngA = Number(pointA?.lng);
    const latB = Number(pointB?.lat);
    const lngB = Number(pointB?.lng);

    if (!Number.isFinite(latA) || !Number.isFinite(lngA) || !Number.isFinite(latB) || !Number.isFinite(lngB)) {
        return 0;
    }

    return L.latLng(latA, lngA).distanceTo(L.latLng(latB, lngB));
}

function isFiniteTrackPoint(point) {
    return mapSafetyBridgeService.isFiniteTrackPoint(point);
}

function isValidLatitude(value) {
    return mapSafetyBridgeService.isValidLatitude(value);
}

function isValidLongitude(value) {
    return mapSafetyBridgeService.isValidLongitude(value);
}

function isValidMapCoordinatePair(lat, lng) {
    return mapSafetyBridgeService.isValidMapCoordinatePair(lat, lng);
}

function isMapViewportReady() {
    return mapSafetyBridgeService.isMapViewportReady();
}

function isMapViewActive() {
    return mapSafetyBridgeService.isMapViewActive();
}

function canRenderMapOverlays() {
    return mapSafetyBridgeService.canRenderMapOverlays();
}

async function ensureMapViewportReady({ timeoutMs = 1200, intervalMs = 50 } = {}) {
    return mapSafetyBridgeService.ensureMapViewportReady({ timeoutMs, intervalMs });
}

function isLeafletBoundsFinite(bounds) {
    return mapSafetyBridgeService.isLeafletBoundsFinite(bounds);
}

function safeSetView(lat, lng, zoom, options) {
    return mapSafetyBridgeService.safeSetView(lat, lng, zoom, options);
}

function safeFocusBounds(bounds, options) {
    return mapSafetyBridgeService.safeFocusBounds(bounds, options);
}

function safeFitBounds(bounds, options) {
    return mapSafetyBridgeService.safeFitBounds(bounds, options);
}

function normalizeTrackPoints(points) {
    return mapSafetyBridgeService.normalizeTrackPoints(points);
}

function parseNumericOrNull(value) {
    return gpxParserBridgeService.parseNumericOrNull(value);
}

function findFirstDescendantText(node, localNames) {
    return gpxParserBridgeService.findFirstDescendantText(node, localNames);
}

function parseSpeedToKmh(rawSpeed) {
    return gpxParserBridgeService.parseSpeedToKmh(rawSpeed);
}

function toFiniteNumber(value) {
    return gpxParserBridgeService.toFiniteNumber(value);
}

function getHeartRateValue(point) {
    return gpxParserBridgeService.getHeartRateValue(point);
}

function getPowerValue(point) {
    return gpxParserBridgeService.getPowerValue(point);
}

function countValidPowerSamples(points) {
    return gpxParserBridgeService.countValidPowerSamples(points);
}

function parseTrackPointsFromGpxText(xmlText) {
    return gpxParserBridgeService.parseTrackPointsFromGpxText(xmlText);
}

async function fetchTrackPoints(profile, filename) {
    return gpxParserBridgeService.fetchTrackPoints(profile, filename);
}

async function ensureTrackPoints(profile, filename, gpxLayer) {
    return gpxParserBridgeService.ensureTrackPoints(profile, filename, gpxLayer);
}

function extractPointsSafely(gpxLayer) {
    return gpxParserBridgeService.extractPointsSafely(gpxLayer);
}

function removeMapLayer(layer) {
    return mapLayerCleanupBridgeService.removeMapLayer(layer);
}

function clearComparisonOverlay() {
    return mapLayerCleanupBridgeService.clearComparisonOverlay();
}

function clearPrHighlightLayer() {
    return mapLayerCleanupBridgeService.clearPrHighlightLayer();
}

function getCompareAccentColor(columnKey) {
    return formatUtilsBridgeService.getCompareAccentColor(columnKey);
}

function findTrackStartAndEndTimeMs(points) {
    return weatherBridgeService.findTrackStartAndEndTimeMs(points);
}

function formatDurationMinutes(durationMinutes) {
    return formatUtilsBridgeService.formatDurationMinutes(durationMinutes);
}

function formatPace(paceMinPerKm) {
    return formatUtilsBridgeService.formatPace(paceMinPerKm);
}

function formatMetricValue(value, unit = '', digits = 1) {
    return formatUtilsBridgeService.formatMetricValue(value, unit, digits);
}

function formatWeatherNumber(value, digits = 1) {
    return formatUtilsBridgeService.formatWeatherNumber(value, digits);
}

function describeWeatherCode(code) {
    return formatUtilsBridgeService.describeWeatherCode(code);
}

function formatWindDirection(directionDeg) {
    return formatUtilsBridgeService.formatWindDirection(directionDeg);
}

function getTrackWeatherState(profile, filename) {
    return weatherBridgeService.getTrackWeatherState(profile, filename);
}

function setTrackWeatherState(profile, filename, nextState = {}) {
    return weatherBridgeService.setTrackWeatherState(profile, filename, nextState);
}

function getWeatherRequestPayloadForTrack(filename, gpxLayer) {
    return weatherBridgeService.getWeatherRequestPayloadForTrack(filename, gpxLayer);
}

async function loadWeatherForTrack(filename, gpxLayer, { force = false } = {}) {
    return weatherBridgeService.loadWeatherForTrack(filename, gpxLayer, { force });
}

function buildWeatherCard(filename, gpxLayer) {
    return weatherBridgeService.buildWeatherCard(filename, gpxLayer);
}

function collectNumericValues(points, extractor) {
    return statisticsBridgeService.collectNumericValues(points, extractor);
}

function calculateAverage(values) {
    return statisticsBridgeService.calculateAverage(values);
}

function calculateMax(values) {
    return statisticsBridgeService.calculateMax(values);
}

async function collectComparisonSummary(profile, filename) {
    return statisticsBridgeService.collectComparisonSummary(profile, filename);
}

function ensureComparisonSelection() {
    return statisticsBridgeService.ensureComparisonSelection();
}

function isTrimModeFor(profile, filename) {
    return trimLifecycleBridgeService.isTrimModeFor(profile, filename);
}

function createTrimHandleIcon(kind) {
    return trimLifecycleBridgeService.createTrimHandleIcon(kind);
}

function findNearestPlaybackPointIndex(latLng, points = playbackPoints) {
    return trimLifecycleBridgeService.findNearestPlaybackPointIndex(latLng, points);
}

function calculateTrimSummary(startIndex, endIndex) {
    return trimLifecycleBridgeService.calculateTrimSummary(startIndex, endIndex);
}

function clearTrimSelectionLayers() {
    return trimLifecycleBridgeService.clearTrimSelectionLayers();
}

function syncTrimMarkers() {
    return trimLifecycleBridgeService.syncTrimMarkers();
}

function updateTrimPreview({ fitBounds = false } = {}) {
    return trimLifecycleBridgeService.updateTrimPreview({ fitBounds });
}

function applyActiveTrackVisualState(gpxLayer) {
    return mapLayerCleanupBridgeService.applyActiveTrackVisualState(gpxLayer);
}

function applyTrimPreviewVisualState(gpxLayer) {
    return mapLayerCleanupBridgeService.applyTrimPreviewVisualState(gpxLayer);
}

function refreshDetailsPanelIfPossible() {
    return trimLifecycleBridgeService.refreshDetailsPanelIfPossible();
}

function setTrimBoundary(kind, requestedIndex, { refreshPanel = true, fitBounds = false } = {}) {
    return trimLifecycleBridgeService.setTrimBoundary(kind, requestedIndex, { refreshPanel, fitBounds });
}

function focusTrimSelection() {
    return trimLifecycleBridgeService.focusTrimSelection();
}

function endTrimMode({ refreshPanel = true } = {}) {
    return trimLifecycleBridgeService.endTrimMode({ refreshPanel });
}

function beginTrimMode(filename) {
    return trimLifecycleBridgeService.beginTrimMode(filename);
}

async function commitTrimSelection() {
    return trimLifecycleBridgeService.commitTrimSelection();
}

function isOutlierModeFor(profile, filename) {
    return Boolean(outlierSelection && outlierSelection.profile === profile && outlierSelection.filename === filename);
}

function getOutlierDetectionRules(profile = currentProfile) {
    return outlierDetectionBridgeService.getOutlierDetectionRules(profile);
}

function formatOutlierPointLabel(point, fallbackIndex) {
    return outlierDetectionBridgeService.formatOutlierPointLabel(point, fallbackIndex);
}

function buildTrackSegments(points) {
    return outlierDetectionBridgeService.buildTrackSegments(points);
}

function mergeOutlierBases(bases) {
    return outlierDetectionBridgeService.mergeOutlierBases(bases);
}

function finalizeOutlierCandidates(candidateBases, points) {
    return outlierDetectionBridgeService.finalizeOutlierCandidates(candidateBases, points);
}

function detectOutlierCandidates(points, profile = currentProfile) {
    return outlierDetectionBridgeService.detectOutlierCandidates(points, profile);
}

function clearOutlierSelectionLayers() {
    return outlierDetectionBridgeService.clearOutlierSelectionLayers();
}

function getOutlierCandidateColor(candidate) {
    return outlierDetectionBridgeService.getOutlierCandidateColor(candidate);
}

function refreshOutlierHighlights() {
    return outlierDetectionBridgeService.refreshOutlierHighlights();
}

function applyOutlierPreviewVisualState(gpxLayer) {
    return outlierDetectionBridgeService.applyOutlierPreviewVisualState(gpxLayer);
}

function focusOutlierCandidate(candidateId) {
    return outlierDetectionBridgeService.focusOutlierCandidate(candidateId);
}

function setOutlierDecision(candidateId, decision) {
    return outlierDetectionBridgeService.setOutlierDecision(candidateId, decision);
}

function endOutlierMode({ refreshPanel = true } = {}) {
    return outlierDetectionBridgeService.endOutlierMode({ refreshPanel });
}

function beginOutlierMode(filename) {
    return outlierDetectionBridgeService.beginOutlierMode(filename);
}

async function applyOutlierCleanup() {
    return outlierDetectionBridgeService.applyOutlierCleanup();
}

// ===========================================================
// SELECTION & GRADIENT ANALYSIS
// ===========================================================

async function selectTrack(filename) {
    const cached = getCachedTrack(currentProfile, filename);
    if (!cached) return;

    clearComparisonOverlay();
    clearPrHighlightLayer();

    if (trimSelection && !isTrimModeFor(currentProfile, filename)) {
        endTrimMode({ refreshPanel: false });
    }
    if (outlierSelection && !isOutlierModeFor(currentProfile, filename)) {
        endOutlierMode({ refreshPanel: false });
    }

    const selectionRequestId = trackSelectionManager.nextSelectionRequestId();
    const gpxLayer = cached.layer;
    
    setEffectiveActiveTrackName(filename, currentProfile);
    setPersistedTrackSelection(currentProfile, filename);
    stopPlayback();
    playbackPoints = playbackStateManager.setPlaybackPoints([]);
    rebuildPlaybackTimeline();
    updateAnalysisControlAvailability();

    if (mapStateManager.getIsHeatmapActive()) {
        mapStateManager.setIsHeatmapActive(false);
        document.getElementById('heatmap-toggle')?.classList.remove('active');
        document.querySelector('.map-container')?.classList.remove('heatmap-active');
        clearHeatmapLayers();
    }

    playbackPoints = normalizeTrackPoints(await ensureTrackPoints(currentProfile, filename, gpxLayer));
    if (selectionRequestId !== trackSelectionManager.getSelectionRequestId()) {
        return;
    }

    if (!playbackPoints.length) {
        playbackPoints = normalizeTrackPoints(extractPointsSafely(gpxLayer));
    }

    rebuildPlaybackTimeline();
    updateAnalysisControlAvailability();

    applyActiveTrackVisualState(gpxLayer);

    if (isTrimModeFor(currentProfile, filename)) {
        applyTrimPreviewVisualState(gpxLayer);
        updateTrimPreview();
    }
    if (isOutlierModeFor(currentProfile, filename)) {
        applyOutlierPreviewVisualState(gpxLayer);
        refreshOutlierHighlights();
    }

    const safeFlyToTrack = () => {
        const layerBounds = typeof gpxLayer?.getBounds === 'function' ? gpxLayer.getBounds() : null;
        if (safeFocusBounds(layerBounds, { padding: [50, 50], duration: 1.0 })) {
            return;
        }

        const validLatLngs = playbackPoints
            .filter(isFiniteTrackPoint)
            .map(point => [Number(point.lat), Number(point.lng)]);

        if (validLatLngs.length >= 2) {
            safeFocusBounds(L.latLngBounds(validLatLngs), { padding: [50, 50], duration: 1.0 });
            return;
        }

        if (validLatLngs.length === 1) {
            const [lat, lng] = validLatLngs[0];
            safeSetView(lat, lng, Math.max(13, map.getZoom() || 13));
        }
    };

    safeFlyToTrack();

    syncTrackListActiveState(filename);

    updateDetailsPanel(filename, gpxLayer);
    renderAnalysesView();
    if (isAnalysisModeEnabled()) {
        closeElevationPanel();
    } else {
        showCharts(gpxLayer);
    }

    if (!isOverlayActive) {
        refreshOverlayVisibility();
    }
}

function clearAnalysisOverlayLayers() {
    analysisLayers.forEach(layer => removeMapLayer(layer));
    analysisLayers = [];

    document.getElementById('gradient-legend')?.classList.remove('visible');

    const rowsHost = document.getElementById('analysis-legend-rows');
    if (rowsHost) {
        rowsHost.innerHTML = '';
    }

    const topPassagesHost = document.getElementById('analysis-top-passages');
    if (topPassagesHost) {
        topPassagesHost.classList.remove('visible');
        topPassagesHost.innerHTML = '';
    }
}

function getAnalysisTimeline(points) {
    if (Array.isArray(points) && points === playbackPoints && playbackTimelineSeconds.length === points.length) {
        return playbackTimelineSeconds;
    }

    return buildPlaybackTimeline(points);
}

function getSegmentDurationFromTimeline(timelineSeconds, endIndex) {
    if (!Array.isArray(timelineSeconds) || endIndex <= 0 || endIndex >= timelineSeconds.length) {
        return 0;
    }

    const delta = Number(timelineSeconds[endIndex]) - Number(timelineSeconds[endIndex - 1]);
    return Number.isFinite(delta) && delta > 0 ? delta : 0;
}

function createAnalysisBandTotals(bands) {
    const totals = {};
    bands.forEach(band => {
        totals[band.id] = { distanceM: 0, timeSeconds: 0 };
    });
    return totals;
}

function addAnalysisBandTotals(totalsByBand, bandId, distanceM, timeSeconds) {
    if (!totalsByBand?.[bandId]) {
        return;
    }

    if (Number.isFinite(distanceM) && distanceM > 0) {
        totalsByBand[bandId].distanceM += distanceM;
    }

    if (Number.isFinite(timeSeconds) && timeSeconds > 0) {
        totalsByBand[bandId].timeSeconds += timeSeconds;
    }
}

function toPercentShare(value, total) {
    return formatUtilsBridgeService.toPercentShare(value, total);
}

function formatDistanceKm(distanceM, fractionDigits = 2) {
    return formatUtilsBridgeService.formatDistanceKm(distanceM, fractionDigits);
}

function mergeAnalysisBandTotals(targetTotals, sourceTotals) {
    return analysisDistributionBridgeService.mergeAnalysisBandTotals(targetTotals, sourceTotals);
}

function summarizeAnalysisBands({ bands, totalsByBand, totalDistanceM, totalTimeSeconds }) {
    return analysisDistributionBridgeService.summarizeAnalysisBands({ bands, totalsByBand, totalDistanceM, totalTimeSeconds });
}

function createAnalysisBandRowsMarkup(summaryRows = [], { maxItems = 6 } = {}) {
    return analysisDistributionBridgeService.createAnalysisBandRowsMarkup(summaryRows, { maxItems });
}

function createAnalysisDistributionCardMarkup({ kicker = '', title = '', description = '', summaryRows = [], highlightText = '' } = {}) {
    return analysisDistributionBridgeService.createAnalysisDistributionCardMarkup({ kicker, title, description, summaryRows, highlightText });
}

function createAnalysisThresholdControlsMarkup({ profile, profileLabel, thresholds }) {
    return analysisDistributionBridgeService.createAnalysisThresholdControlsMarkup({ profile, profileLabel, thresholds });
}

function bindAnalysisThresholdControls(profile) {
    return analysisDistributionBridgeService.bindAnalysisThresholdControls(profile);
}

function computeElevationAnalysisTotals(points, { steepThresholdPercent = ANALYSIS_STEEP_THRESHOLD_DEFAULT } = {}) {
    const totalsByBand = createAnalysisBandTotals(GRADE_BANDS);
    const safeSteepThreshold = clampNumber(
        steepThresholdPercent,
        ANALYSIS_STEEP_THRESHOLD_MIN,
        ANALYSIS_STEEP_THRESHOLD_MAX,
        ANALYSIS_STEEP_THRESHOLD_DEFAULT
    );

    if (!Array.isArray(points) || points.length < 5) {
        return {
            bands: GRADE_BANDS,
            totalsByBand,
            totalDistanceM: 0,
            totalTimeSeconds: 0,
            steepDistanceM: 0,
            steepThresholdPercent: safeSteepThreshold
        };
    }

    const timelineSeconds = getAnalysisTimeline(points);
    const WINDOW_M = 45;
    const grades = new Array(points.length).fill(0);

    for (let index = 0; index < points.length; index += 1) {
        const centerDistance = points[index].dist;
        let backward = index;
        let forward = index;

        while (backward > 0 && (centerDistance - points[backward].dist) < WINDOW_M / 2) {
            backward -= 1;
        }

        while (forward < points.length - 1 && (points[forward].dist - centerDistance) < WINDOW_M / 2) {
            forward += 1;
        }

        const distanceSpan = points[forward].dist - points[backward].dist;
        const elevationSpan = points[forward].alt - points[backward].alt;
        grades[index] = distanceSpan > 5 ? (elevationSpan / distanceSpan) * 100 : 0;
    }

    const smoothedGrades = grades.map((grade, index, values) => {
        const start = Math.max(0, index - 4);
        const end = Math.min(values.length, index + 5);
        const sample = values.slice(start, end);
        return sample.reduce((sum, current) => sum + current, 0) / sample.length;
    });

    let totalDistanceM = 0;
    let totalTimeSeconds = 0;
    let steepDistanceM = 0;

    for (let index = 1; index < points.length; index += 1) {
        const grade = (smoothedGrades[index - 1] + smoothedGrades[index]) / 2;
        const band = getGradeBand(grade);
        const segmentDistance = calculateSegmentDistanceMeters(points[index - 1], points[index]);
        const segmentTimeSeconds = getSegmentDurationFromTimeline(timelineSeconds, index);

        const safeDistance = Number.isFinite(segmentDistance) ? Math.max(0, segmentDistance) : 0;
        const safeTime = Number.isFinite(segmentTimeSeconds) ? Math.max(0, segmentTimeSeconds) : 0;

        totalDistanceM += safeDistance;
        totalTimeSeconds += safeTime;
        addAnalysisBandTotals(totalsByBand, band.id, safeDistance, safeTime);

        if (grade >= safeSteepThreshold) {
            steepDistanceM += safeDistance;
        }
    }

    return {
        bands: GRADE_BANDS,
        totalsByBand,
        totalDistanceM,
        totalTimeSeconds,
        steepDistanceM,
        steepThresholdPercent: safeSteepThreshold
    };
}

function computeSpeedAnalysisTotals(points, { profile = currentProfile, fastThresholdKmh = null } = {}) {
    const bands = getSpeedAnalysisBandsForProfile(profile);
    const totalsByBand = createAnalysisBandTotals(bands);
    const fallbackThreshold = Number(getSpeedThresholdsForProfile(profile).normalMax) || 20;
    const safeFastThreshold = clampNumber(
        fastThresholdKmh,
        ANALYSIS_SPEED_THRESHOLD_MIN,
        ANALYSIS_SPEED_THRESHOLD_MAX,
        fallbackThreshold
    );

    if (!Array.isArray(points) || points.length < 2) {
        return {
            bands,
            totalsByBand,
            totalDistanceM: 0,
            totalTimeSeconds: 0,
            fastDistanceM: 0,
            fastThresholdKmh: safeFastThreshold
        };
    }

    const timelineSeconds = getAnalysisTimeline(points);
    let totalDistanceM = 0;
    let totalTimeSeconds = 0;
    let fastDistanceM = 0;

    for (let index = 1; index < points.length; index += 1) {
        const previousPoint = points[index - 1];
        const point = points[index];
        const speedKmh = resolvePointSpeedKmh(point, previousPoint);
        const band = getSpeedBand(speedKmh, bands);
        const segmentDistance = calculateSegmentDistanceMeters(previousPoint, point);
        const segmentTimeSeconds = getSegmentDurationFromTimeline(timelineSeconds, index);

        const safeDistance = Number.isFinite(segmentDistance) ? Math.max(0, segmentDistance) : 0;
        const safeTime = Number.isFinite(segmentTimeSeconds) ? Math.max(0, segmentTimeSeconds) : 0;

        totalDistanceM += safeDistance;
        totalTimeSeconds += safeTime;
        addAnalysisBandTotals(totalsByBand, band.id, safeDistance, safeTime);

        if (safeFastThreshold > 0 && Number.isFinite(speedKmh) && speedKmh > safeFastThreshold) {
            fastDistanceM += safeDistance;
        }
    }

    return {
        bands,
        totalsByBand,
        totalDistanceM,
        totalTimeSeconds,
        fastDistanceM,
        fastThresholdKmh: safeFastThreshold
    };
}

async function resolveAnalysisPointsForTrack(profile, filename, entry) {
    if (!entry?.layer) {
        return [];
    }

    const extractedPoints = extractPointsSafely(entry.layer);
    const timedExtractedPoints = extractedPoints.reduce((count, point) => {
        if (toFiniteNumber(point?.meta?.timeMs) !== null) {
            return count + 1;
        }

        const parsedTime = Date.parse(point?.meta?.time || '');
        return Number.isFinite(parsedTime) ? count + 1 : count;
    }, 0);

    const hasEnoughExtractedTime = extractedPoints.length > 1 && timedExtractedPoints >= Math.max(2, Math.floor(extractedPoints.length * 0.15));

    if (hasEnoughExtractedTime) {
        if (!Array.isArray(entry.points) || entry.points.length < 2) {
            entry.points = extractedPoints;
        }
        return extractedPoints;
    }

    try {
        const resolvedPoints = await ensureTrackPoints(profile, filename, entry.layer);
        if (Array.isArray(resolvedPoints) && resolvedPoints.length > 1) {
            return resolvedPoints;
        }
    } catch (_) {
        // Fallback to extracted points below.
    }

    return extractedPoints;
}

async function collectProfileAnalysisOverview(profile = currentProfile) {
    if (!profile) {
        return null;
    }

    if (analysisOverviewCacheGeneration !== loadGeneration) {
        analysisOverviewCacheGeneration = loadGeneration;
        analysisOverviewByProfile = {};
        analysisOverviewPromiseByProfile = {};
    }

    const requestedThresholds = getAnalysisThresholds(profile);
    const requestedThresholdSignature = `${requestedThresholds.steepGradePercent}|${requestedThresholds.fastSpeedKmh}`;

    const cachedOverview = analysisOverviewByProfile[profile];
    if (cachedOverview?.thresholdSignature === requestedThresholdSignature) {
        return cachedOverview;
    }
    if (cachedOverview) {
        delete analysisOverviewByProfile[profile];
    }

    const pendingOverviewPromise = analysisOverviewPromiseByProfile[profile];
    if (pendingOverviewPromise?.signature === requestedThresholdSignature) {
        return pendingOverviewPromise.promise;
    }
    if (pendingOverviewPromise) {
        delete analysisOverviewPromiseByProfile[profile];
    }

    const computePromise = (async () => {
        const files = tracksByProfile[profile] || [];
        const speedBands = getSpeedAnalysisBandsForProfile(profile);
        const steepThresholdPercent = requestedThresholds.steepGradePercent;
        const fastThresholdKmh = requestedThresholds.fastSpeedKmh;

        const overview = {
            profile,
            trackCount: files.length,
            thresholdSignature: requestedThresholdSignature,
            availableTrackCount: 0,
            grade: {
                bands: GRADE_BANDS,
                totalsByBand: createAnalysisBandTotals(GRADE_BANDS),
                totalDistanceM: 0,
                totalTimeSeconds: 0,
                steepDistanceM: 0,
                steepThresholdPercent
            },
            speed: {
                bands: speedBands,
                totalsByBand: createAnalysisBandTotals(speedBands),
                totalDistanceM: 0,
                totalTimeSeconds: 0,
                fastDistanceM: 0,
                fastThresholdKmh
            }
        };

        if (!files.length) {
            const currentThresholds = getAnalysisThresholds(profile);
            const currentSignature = `${currentThresholds.steepGradePercent}|${currentThresholds.fastSpeedKmh}`;
            if (currentSignature === requestedThresholdSignature) {
                analysisOverviewByProfile[profile] = overview;
            }
            return overview;
        }

        const taskFactories = files.map(filename => async () => {
            const entry = getCachedTrack(profile, filename);
            if (!entry?.layer) {
                return;
            }

            const points = await resolveAnalysisPointsForTrack(profile, filename, entry);
            if (!Array.isArray(points) || points.length < 2) {
                return;
            }

            const elevationTotals = computeElevationAnalysisTotals(points, { steepThresholdPercent });
            const speedTotals = computeSpeedAnalysisTotals(points, { profile, fastThresholdKmh });

            const hasAnyDistance = elevationTotals.totalDistanceM > 0 || speedTotals.totalDistanceM > 0;
            if (hasAnyDistance) {
                overview.availableTrackCount += 1;
            }

            mergeAnalysisBandTotals(overview.grade.totalsByBand, elevationTotals.totalsByBand);
            mergeAnalysisBandTotals(overview.speed.totalsByBand, speedTotals.totalsByBand);

            overview.grade.totalDistanceM += elevationTotals.totalDistanceM;
            overview.grade.totalTimeSeconds += elevationTotals.totalTimeSeconds;
            overview.grade.steepDistanceM += elevationTotals.steepDistanceM;

            overview.speed.totalDistanceM += speedTotals.totalDistanceM;
            overview.speed.totalTimeSeconds += speedTotals.totalTimeSeconds;
            overview.speed.fastDistanceM += speedTotals.fastDistanceM;
        });

        await runWithConcurrency(taskFactories, 4);

        const currentThresholds = getAnalysisThresholds(profile);
        const currentSignature = `${currentThresholds.steepGradePercent}|${currentThresholds.fastSpeedKmh}`;
        if (currentSignature === requestedThresholdSignature) {
            analysisOverviewByProfile[profile] = overview;
        }

        return overview;
    })().finally(() => {
        const pendingEntry = analysisOverviewPromiseByProfile[profile];
        if (pendingEntry?.promise === computePromise) {
            delete analysisOverviewPromiseByProfile[profile];
        }
    });

    analysisOverviewPromiseByProfile[profile] = {
        signature: requestedThresholdSignature,
        promise: computePromise
    };
    return computePromise;
}

function renderAnalysisLegend({ title, bands, totalsByBand, totalDistanceM, totalTimeSeconds, topPassages = [] }) {
    const legend = document.getElementById('gradient-legend');
    const titleEl = document.getElementById('analysis-legend-title');
    const rowsHost = document.getElementById('analysis-legend-rows');
    const topPassagesHost = document.getElementById('analysis-top-passages');

    if (!legend || !rowsHost) {
        return;
    }

    if (titleEl) {
        titleEl.textContent = title;
    }

    rowsHost.innerHTML = '';

    bands.forEach(band => {
        const totals = totalsByBand?.[band.id] || { distanceM: 0, timeSeconds: 0 };
        const distanceShare = toPercentShare(totals.distanceM, totalDistanceM);
        const timeShare = toPercentShare(totals.timeSeconds, totalTimeSeconds);

        const row = document.createElement('div');
        row.className = 'legend-row';

        const left = document.createElement('div');
        left.className = 'legend-row-main';

        const swatch = document.createElement('span');
        swatch.className = 'legend-swatch';
        swatch.style.background = band.color;

        const text = document.createElement('span');
        text.className = 'legend-text';
        text.textContent = `${band.rangeLabel || ''}${band.rangeLabel ? ' · ' : ''}${band.label}`;

        const metrics = document.createElement('span');
        metrics.className = 'legend-metrics';
        metrics.textContent = `Dist ${distanceShare.toFixed(1)}% · ${formatDistanceKm(totals.distanceM, 2)} · Zeit ${timeShare.toFixed(1)}%`;

        left.appendChild(swatch);
        left.appendChild(text);
        row.appendChild(left);
        row.appendChild(metrics);
        rowsHost.appendChild(row);
    });

    if (topPassagesHost) {
        topPassagesHost.innerHTML = '';
        topPassagesHost.classList.toggle('visible', topPassages.length > 0);

        if (topPassages.length > 0) {
            const passagesTitle = document.createElement('div');
            passagesTitle.className = 'analysis-top-passages__title';
            passagesTitle.textContent = 'Top-Passagen';
            topPassagesHost.appendChild(passagesTitle);

            topPassages.forEach(passage => {
                const row = document.createElement('div');
                row.className = 'analysis-passage-row';

                const label = document.createElement('span');
                label.className = 'analysis-passage-row__distance';
                label.textContent = formatDistanceLabel(passage.distanceMeters);

                const value = document.createElement('span');
                value.className = 'analysis-passage-row__value';
                const speedText = Number.isFinite(passage.avgSpeedKmh) ? `${passage.avgSpeedKmh.toFixed(1)} km/h` : '—';
                value.textContent = `${formatEffortTime(passage.timeSeconds)} · ${speedText}`;

                row.appendChild(label);
                row.appendChild(value);
                topPassagesHost.appendChild(row);
            });
        }
    }

    legend.classList.add('visible');
}

function buildTopSpeedPassages(points, timelineSeconds) {
    return SPEED_ANALYSIS_PASSAGE_DISTANCES
        .map(distanceMeters => {
            const effort = findBestEffortForDistance(points, timelineSeconds, distanceMeters);
            if (!effort) {
                return null;
            }

            return {
                distanceMeters,
                timeSeconds: effort.timeSeconds,
                avgSpeedKmh: effort.avgSpeedKmh
            };
        })
        .filter(Boolean);
}

function drawElevationAnalysis(pts) {
    clearAnalysisOverlayLayers();

    if (!Array.isArray(pts) || pts.length < 5) {
        return;
    }

    const timelineSeconds = getAnalysisTimeline(pts);
    const WINDOW_M = 45;
    const MIN_SEGMENT_DISTANCE_M = 30;
    const grades = new Array(pts.length).fill(0);
    const totalsByBand = createAnalysisBandTotals(GRADE_BANDS);
    let totalDistanceM = 0;
    let totalTimeSeconds = 0;

    for (let i = 0; i < pts.length; i++) {
        const dCenter = pts[i].dist;
        let iBack = i;
        let iFwd = i;
        while (iBack > 0 && (dCenter - pts[iBack].dist) < WINDOW_M / 2) iBack--;
        while (iFwd < pts.length - 1 && (pts[iFwd].dist - dCenter) < WINDOW_M / 2) iFwd++;

        const distSpan = pts[iFwd].dist - pts[iBack].dist;
        const elevSpan = pts[iFwd].alt - pts[iBack].alt;
        grades[i] = distSpan > 5 ? (elevSpan / distSpan) * 100 : 0;
    }

    const smoothed = grades.map((grade, index, values) => {
        const start = Math.max(0, index - 4);
        const end = Math.min(values.length, index + 5);
        const slice = values.slice(start, end);
        return slice.reduce((sum, current) => sum + current, 0) / slice.length;
    });

    let current = null;
    const segments = [];

    for (let i = 1; i < pts.length; i += 1) {
        const grade = (smoothed[i - 1] + smoothed[i]) / 2;
        const band = getGradeBand(grade);
        const p1 = [pts[i - 1].lat, pts[i - 1].lng];
        const p2 = [pts[i].lat, pts[i].lng];
        const segmentDistance = calculateSegmentDistanceMeters(pts[i - 1], pts[i]);
        const segmentTimeSeconds = getSegmentDurationFromTimeline(timelineSeconds, i);

        totalDistanceM += Number.isFinite(segmentDistance) ? Math.max(0, segmentDistance) : 0;
        totalTimeSeconds += Number.isFinite(segmentTimeSeconds) ? Math.max(0, segmentTimeSeconds) : 0;
        addAnalysisBandTotals(totalsByBand, band.id, segmentDistance, segmentTimeSeconds);

        if (current && current.bandId === band.id) {
            current.points.push(p2);
            current.gradeSum += grade;
            current.count += 1;
            current.distanceM += segmentDistance;
            current.timeSeconds += segmentTimeSeconds;
        } else {
            if (current) {
                segments.push(current);
            }

            current = {
                bandId: band.id,
                bandLabel: band.label,
                color: band.color,
                points: [p1, p2],
                gradeSum: grade,
                count: 1,
                distanceM: segmentDistance,
                timeSeconds: segmentTimeSeconds
            };
        }
    }

    if (current) {
        segments.push(current);
    }

    const compactSegments = [];
    segments.forEach(segment => {
        if (!compactSegments.length) {
            compactSegments.push(segment);
            return;
        }

        const previous = compactSegments[compactSegments.length - 1];
        const shouldMerge = segment.distanceM < MIN_SEGMENT_DISTANCE_M || previous.bandId === segment.bandId;

        if (shouldMerge) {
            previous.points.push(...segment.points.slice(1));
            previous.gradeSum += segment.gradeSum;
            previous.count += segment.count;
            previous.distanceM += segment.distanceM;
            previous.timeSeconds += segment.timeSeconds;
            return;
        }

        compactSegments.push(segment);
    });

    compactSegments.forEach(segment => {
        const avgGrade = segment.gradeSum / Math.max(segment.count, 1);
        const polyline = L.polyline(segment.points, {
            color: segment.color,
            weight: 9,
            opacity: 0.98,
            lineCap: 'round',
            interactive: true
        }).addTo(map);

        polyline.bindTooltip(`${segment.bandLabel}: ${avgGrade > 0 ? '+' : ''}${avgGrade.toFixed(1)}%`, {
            sticky: true,
            className: 'gradient-tooltip'
        });
        analysisLayers.push(polyline);
    });

    renderAnalysisLegend({
        title: 'Steigungsanalyse',
        bands: GRADE_BANDS,
        totalsByBand,
        totalDistanceM,
        totalTimeSeconds,
        topPassages: []
    });
}

function drawSpeedAnalysis(pts) {
    clearAnalysisOverlayLayers();

    if (!Array.isArray(pts) || pts.length < 2) {
        return;
    }

    const bands = getSpeedAnalysisBandsForProfile(currentProfile);
    const timelineSeconds = getAnalysisTimeline(pts);
    const totalsByBand = createAnalysisBandTotals(bands);
    const MIN_SEGMENT_DISTANCE_M = 25;
    const segments = [];
    let current = null;
    let totalDistanceM = 0;
    let totalTimeSeconds = 0;

    for (let i = 1; i < pts.length; i += 1) {
        const previousPoint = pts[i - 1];
        const point = pts[i];
        const speedKmh = resolvePointSpeedKmh(point, previousPoint);
        const band = getSpeedBand(speedKmh, bands);
        const p1 = [previousPoint.lat, previousPoint.lng];
        const p2 = [point.lat, point.lng];
        const segmentDistance = calculateSegmentDistanceMeters(previousPoint, point);
        const segmentTimeSeconds = getSegmentDurationFromTimeline(timelineSeconds, i);

        totalDistanceM += Number.isFinite(segmentDistance) ? Math.max(0, segmentDistance) : 0;
        totalTimeSeconds += Number.isFinite(segmentTimeSeconds) ? Math.max(0, segmentTimeSeconds) : 0;
        addAnalysisBandTotals(totalsByBand, band.id, segmentDistance, segmentTimeSeconds);

        if (current && current.bandId === band.id) {
            current.points.push(p2);
            current.speedSum += speedKmh;
            current.count += 1;
            current.distanceM += segmentDistance;
            current.timeSeconds += segmentTimeSeconds;
        } else {
            if (current) {
                segments.push(current);
            }

            current = {
                bandId: band.id,
                bandLabel: band.label,
                color: band.color,
                points: [p1, p2],
                speedSum: speedKmh,
                count: 1,
                distanceM: segmentDistance,
                timeSeconds: segmentTimeSeconds
            };
        }
    }

    if (current) {
        segments.push(current);
    }

    const compactSegments = [];
    segments.forEach(segment => {
        if (!compactSegments.length) {
            compactSegments.push(segment);
            return;
        }

        const previous = compactSegments[compactSegments.length - 1];
        const shouldMerge = segment.distanceM < MIN_SEGMENT_DISTANCE_M || previous.bandId === segment.bandId;

        if (shouldMerge) {
            previous.points.push(...segment.points.slice(1));
            previous.speedSum += segment.speedSum;
            previous.count += segment.count;
            previous.distanceM += segment.distanceM;
            previous.timeSeconds += segment.timeSeconds;
            return;
        }

        compactSegments.push(segment);
    });

    compactSegments.forEach(segment => {
        const avgSpeed = segment.speedSum / Math.max(segment.count, 1);
        const polyline = L.polyline(segment.points, {
            color: segment.color,
            weight: 9,
            opacity: 0.98,
            lineCap: 'round',
            interactive: true
        }).addTo(map);

        polyline.bindTooltip(`${segment.bandLabel}: ${avgSpeed.toFixed(1)} km/h`, {
            sticky: true,
            className: 'gradient-tooltip'
        });
        analysisLayers.push(polyline);
    });

    renderAnalysisLegend({
        title: 'Geschwindigkeitsanalyse',
        bands,
        totalsByBand,
        totalDistanceM,
        totalTimeSeconds,
        topPassages: buildTopSpeedPassages(pts, timelineSeconds)
    });
}

function getGradeBand(grade) {
    for (const band of GRADE_BANDS) {
        if (grade <= band.max) {
            return band;
        }
    }

    return GRADE_BANDS[GRADE_BANDS.length - 1];
}

// ===========================================================
// CHARTS & SYNC
// ===========================================================

function showCharts(gpxLayer) {
    return chartBuildBridgeService.showCharts(gpxLayer);
}

function buildElevationChart(themeColor) {
    return chartBuildBridgeService.buildElevationChart(themeColor);
}

function buildSpeedChart(themeColor) {
    return chartBuildBridgeService.buildSpeedChart(themeColor);
}

function buildHRChart() {
    return chartBuildBridgeService.buildHRChart();
}

function buildPowerChart() {
    return chartBuildBridgeService.buildPowerChart();
}

function resolvePointSpeedKmh(point, previousPoint) {
    return playbackChartSyncBridgeService.resolvePointSpeedKmh(point, previousPoint);
}

function buildPlaybackTimeline(points) {
    return playbackChartSyncBridgeService.buildPlaybackTimeline(points);
}

function rebuildPlaybackTimeline() {
    return playbackChartSyncBridgeService.rebuildPlaybackTimeline();
}

function getPlaybackIndexForVirtualTime(virtualSeconds) {
    return playbackChartSyncBridgeService.getPlaybackIndexForVirtualTime(virtualSeconds);
}

function getCommonChartOptions(unit, onHover) {
    return chartBuildBridgeService.getCommonChartOptions(unit, onHover);
}

function syncAllCharts(idx) {
    return playbackChartSyncBridgeService.syncAllCharts(idx);
}

function clearChartSync() {
    return playbackChartSyncBridgeService.clearChartSync();
}

// ===========================================================
// PROFILE LOADING & CACHING
// ===========================================================

async function loadAllTracks(options = {}) {
    const { startup = false } = options;
    loadGeneration += 1;
    if (analysisOverviewCacheGeneration !== loadGeneration) {
        analysisOverviewCacheGeneration = loadGeneration;
        analysisOverviewByProfile = {};
        analysisOverviewPromiseByProfile = {};
    }
    if (trackStatsCacheGeneration !== loadGeneration) {
        trackStatsCacheGeneration = loadGeneration;
        trackStatsByScopeCache = {};
    }
    clearComparisonOverlay();
    clearPrHighlightLayer();

    if (startup) {
        updateStartupProgress({ statusText: 'Profile und GPX-Dateien werden gesucht...' });
    }

    const knownProfiles = profileManager.getAvailableProfiles();
    const profiles = knownProfiles.length ? knownProfiles : getProfilesFromButtons();
    const nextTracksByProfile = {};
    const failedLoads = [];

    try {
        for (const profile of profiles) {
            try {
                const resp = await fetch(`${API_BASE}/tracks/${profile}`);
                if (!resp.ok) {
                    failedLoads.push(`${profile} (Liste)`);
                    nextTracksByProfile[profile] = [];
                    continue;
                }

                const files = await resp.json();
                nextTracksByProfile[profile] = Array.isArray(files) ? files : [];
            } catch (err) {
                console.error(err);
                failedLoads.push(`${profile} (Liste)`);
                nextTracksByProfile[profile] = [];
            }
        }

        const totalTrackCount = Object.values(nextTracksByProfile).reduce((sum, files) => sum + files.length, 0);
        let processedTrackCount = 0;

        if (startup) {
            updateStartupProgress({
                total: totalTrackCount,
                processed: 0,
                statusText: totalTrackCount > 0 ? 'Tracks werden geladen...' : 'Keine GPX-Dateien gefunden.'
            });
        }

        const existingKeys = Object.keys(cachedTracks);
        const validKeys = new Set();

        Object.entries(nextTracksByProfile).forEach(([profile, files]) => {
            files.forEach(file => validKeys.add(getTrackCacheKey(profile, file)));
        });

        existingKeys.forEach(cacheKey => {
            if (!validKeys.has(cacheKey)) {
                const entry = cachedTracks[cacheKey];
                if (entry?.layer && map.hasLayer(entry.layer)) {
                    map.removeLayer(entry.layer);
                }
                delete cachedTracks[cacheKey];
            }
        });

        const taskFactories = [];

        Object.entries(nextTracksByProfile).forEach(([profile, files]) => {
            files.forEach(file => {
                const isCached = !!getCachedTrack(profile, file);
                if (isCached) {
                    processedTrackCount += 1;
                    return;
                }

                taskFactories.push(async () => {
                    try {
                        const entry = await createTrackLayer(profile, file);
                        setCachedTrack(profile, file, entry);
                    } catch (err) {
                        console.error(err);
                        failedLoads.push(`${profile}/${file}`);
                    } finally {
                        processedTrackCount += 1;

                        if (startup) {
                            updateStartupProgress({
                                total: totalTrackCount,
                                processed: processedTrackCount,
                                statusText: totalTrackCount > 0
                                    ? `Tracks werden geladen... (${processedTrackCount}/${totalTrackCount})`
                                    : 'Keine GPX-Dateien gefunden.'
                            });
                        }
                    }
                });
            });
        });

        // Trigger initial progress if some are already cached
        if (startup && processedTrackCount > 0) {
            updateStartupProgress({
                total: totalTrackCount,
                processed: processedTrackCount,
                statusText: 'Tracks werden geladen...'
            });
        }

        await runWithConcurrency(taskFactories, 5);

        tracksByProfile = nextTracksByProfile;
        const activeProfile = getEffectiveCurrentProfile();
        if (!tracksByProfile[activeProfile]) {
            currentProfile = profileManager.setCurrentProfile(profiles[0] || activeProfile);
            syncFoundationProfileState();
        }

        isAppLoaded = true;
        showProfileTracks(getEffectiveCurrentProfile());
        await loadActivityNoteSummaries(getEffectiveCurrentProfile(), { force: true });
        renderHomeView();
        renderAnalysesView();
        renderStatisticsView();
        await restorePersistedTrackSelection(getEffectiveCurrentProfile());
        updateAnalysisControlAvailability();
        runPersonalRecordAlertCheck({ startup });
        persistUiState();

        if (failedLoads.length > 0) {
            showToast(`${failedLoads.length} Tracks konnten nicht geladen werden.`, 'warning');
        }
    } catch (e) {
        console.error(e);
        showToast('Routen konnten nicht geladen werden.', 'error');
    } finally {
        if (startup) {
            updateStartupProgress({ statusText: 'Initialisierung abgeschlossen.' });
        }
    }
}

function createTrackLayer(profile, file, requestVersion = loadGeneration) {
    return new Promise((resolve, reject) => {
        const url = `${API_BASE}/tracks/${profile}/${encodeURIComponent(file)}?v=${encodeURIComponent(requestVersion)}`;
        const gpxLayer = new L.GPX(url, {
            async: true,
            marker_options: { startIconUrl: '', endIconUrl: '', shadowUrl: '' },
            polyline_options: { opacity: 0.6, weight: 4 }
        })
            .on('loaded', () => {
                resolve({
                    profile,
                    sourceUrl: url,
                    layer: gpxLayer,
                    stats: {
                        filename: file,
                        distance: gpxLayer.get_distance(),
                        elevation: gpxLayer.get_elevation_gain(),
                        speed: gpxLayer.get_moving_speed ? (gpxLayer.get_moving_speed() || 0) : 0,
                        date: (gpxLayer.get_start_time() || new Date(0)).getTime()
                    }
                });
            })
            .on('click', () => {
                if (!isHeatmapActive && profile === currentProfile) {
                    selectTrack(file);
                }
            })
            .on('error', () => {
                reject(new Error(`Track konnte nicht geladen werden: ${profile}/${file}`));
            });
    });
}

async function runWithConcurrency(taskFactories, concurrencyLimit = 4) {
    if (!taskFactories.length) {
        return;
    }

    const queue = [...taskFactories];
    const workerCount = Math.max(1, Math.min(concurrencyLimit, queue.length));

    const workers = Array.from({ length: workerCount }, async () => {
        while (queue.length > 0) {
            const nextTask = queue.shift();
            if (nextTask) {
                await nextTask();
            }
        }
    });

    await Promise.all(workers);
}

function collectAllNonHeatmapLineLayers() {
    const trackRouteLayers = Object.values(trackLayers || {});
    const analysisRouteLayers = Array.isArray(analysisLayers) ? analysisLayers : [];
    const compareRouteLayers = Array.isArray(compareOverlayLayers) ? compareOverlayLayers : [];
    const prRouteLayer = prHighlightLayer ? [prHighlightLayer] : [];
    const trimPreviewLayer = trimSelection?.previewLayer ? [trimSelection.previewLayer] : [];
    const outlierCandidateLayers = (outlierSelection?.candidates || [])
        .map(candidate => candidate?.layer)
        .filter(Boolean);

    return [
        ...trackRouteLayers,
        ...analysisRouteLayers,
        ...compareRouteLayers,
        ...prRouteLayer,
        ...trimPreviewLayer,
        ...outlierCandidateLayers
    ].filter(Boolean);
}

function showProfileTracks(profile) {
    if (trimSelection && trimSelection.profile !== profile) {
        endTrimMode({ refreshPanel: false });
    }
    if (outlierSelection && outlierSelection.profile !== profile) {
        endOutlierMode({ refreshPanel: false });
    }

    Object.values(trackLayers).forEach(l => map.removeLayer(l));
    clearAnalysisOverlayLayers();
    trackLayers = {};
    trackDataCache = [];
    const trackList = document.getElementById('track-list');
    if (trackList) {
        trackList.innerHTML = '';
    }

    const files = tracksByProfile[profile] || [];

    if (!files.includes(getEffectiveActiveTrackName())) {
        setEffectiveActiveTrackName(null, profile);
        playbackPoints = [];
        rebuildPlaybackTimeline();
        stopPlayback();
        closeFloatingPanel();
    }

    files.forEach(f => {
        const c = getCachedTrack(profile, f);
        if (c) {
            trackLayers[f] = c.layer;
            if (!isHeatmapActive) {
                c.layer.addTo(map);
            }
            trackDataCache.push(c.stats);
        }
    });
    applyFiltersAndSort();

    if (isHeatmapActive) {
        updateHeatmap();
    }

    toggleDeleteAllButton(trackDataCache.length > 0);

    if (isDashboardOpen()) {
        renderDashboard();
    }

    renderAnalysesView();
    renderStatisticsView();

    updateAnalysisControlAvailability();
}

// ===========================================================
// FILTERING, SORTING & SEARCH
// ===========================================================

function initFiltersAndSort() {
    return appNavigationBridgeService.initFiltersAndSort();
}

function initSearch() {
    return appNavigationBridgeService.initSearch();
}

function initMapFilters() {
    return appNavigationBridgeService.initMapFilters();
}

function applyFiltersAndSort() {
    return appNavigationBridgeService.applyFiltersAndSort();
}

// ===========================================================
// UPLOAD & FILE MANAGEMENT
// ===========================================================

function initDragAndDrop() {
    return appNavigationBridgeService.initDragAndDrop();
}

async function handleFileUpload(files) {
    return appNavigationBridgeService.handleFileUpload(files);
}

async function resolveDuplicateConflict(profile, pendingId, action) {
    return appNavigationBridgeService.resolveDuplicateConflict(profile, pendingId, action);
}

function showDuplicateModal(conflict) {
    return appNavigationBridgeService.showDuplicateModal(conflict);
}

async function deleteTrack(filename) {
    if (!confirm(`Soll "${filename}" wirklich gelöscht werden?`)) return;

    if (isTrimModeFor(currentProfile, filename)) {
        endTrimMode({ refreshPanel: false });
    }
    if (isOutlierModeFor(currentProfile, filename)) {
        endOutlierMode({ refreshPanel: false });
    }

    try {
        const res = await fetch(`${API_BASE}/tracks/${currentProfile}/${encodeURIComponent(filename)}`, { method: 'DELETE' });
        const data = await res.json().catch(() => ({}));

        if (!res.ok) {
            showToast(data.error || 'Route konnte nicht gelöscht werden.', 'error');
            return;
        }

        removeCachedTrack(currentProfile, filename);
        showToast('Route gelöscht.', 'success');
        await loadAllTracks();
    } catch (err) {
        console.error(err);
        showToast('Löschen fehlgeschlagen.', 'error');
    }
}

function initDeleteAll() {
    return appNavigationBridgeService.initDeleteAll();
}

// ===========================================================
// HOUSEKEEPING
// ===========================================================

function formatSignedDuration(totalSeconds) {
    if (!Number.isFinite(totalSeconds)) {
        return '—';
    }

    const sign = totalSeconds < 0 ? '-' : '+';
    return `${sign}${formatEffortTime(Math.abs(totalSeconds))}`;
}

function calculateWhatIfPacing({ points, timelineSeconds, startIndex, endIndex, targetSpeedKmh }) {
    if (!Array.isArray(points) || points.length < 2) {
        return null;
    }

    const safeStartIndex = Math.max(0, Math.min(points.length - 2, Number(startIndex) || 0));
    const safeEndIndex = Math.max(safeStartIndex + 1, Math.min(points.length - 1, Number(endIndex) || points.length - 1));
    const distanceMeters = Math.max(0, (points[safeEndIndex]?.dist || 0) - (points[safeStartIndex]?.dist || 0));
    const actualSeconds = Array.isArray(timelineSeconds) && timelineSeconds.length === points.length
        ? Math.max(0, (timelineSeconds[safeEndIndex] || 0) - (timelineSeconds[safeStartIndex] || 0))
        : 0;

    const speedKmh = Number(targetSpeedKmh);
    if (!Number.isFinite(speedKmh) || speedKmh <= 0 || distanceMeters <= 0 || actualSeconds <= 0) {
        return null;
    }

    const projectedSeconds = ((distanceMeters / 1000) / speedKmh) * 3600;

    return {
        distanceKm: distanceMeters / 1000,
        actualSeconds,
        projectedSeconds,
        deltaSeconds: projectedSeconds - actualSeconds,
        actualAvgKmh: (distanceMeters / actualSeconds) * 3.6
    };
}

function createWhatIfPacingCard(filename) {
    const card = document.createElement('div');
    card.className = 'trim-editor-card whatif-pacing-card';

    const title = document.createElement('div');
    title.className = 'trim-editor-title';
    title.textContent = 'Was-wäre-wenn-Pacing';

    const hint = document.createElement('p');
    hint.className = 'trim-editor-hint';
    hint.textContent = 'Simuliere eine konstante Zielgeschwindigkeit für den gesamten Track oder den aktuellen Trim-Bereich.';

    card.appendChild(title);
    card.appendChild(hint);

    if (!Array.isArray(playbackPoints) || playbackPoints.length < 2) {
        const empty = document.createElement('p');
        empty.className = 'placeholder-text';
        empty.textContent = 'Für die Pacing-Simulation sind mehr Trackpunkte erforderlich.';
        card.appendChild(empty);
        return card;
    }

    const timelineSeconds = getAnalysisTimeline(playbackPoints);
    const hasTrimRange = isTrimModeFor(currentProfile, filename);
    let selectedScope = hasTrimRange ? 'trim' : 'full';

    const controls = document.createElement('div');
    controls.className = 'activity-note-grid';

    const targetField = document.createElement('label');
    targetField.className = 'activity-note-field';

    const targetLabel = document.createElement('span');
    targetLabel.className = 'mini-label';
    targetLabel.textContent = 'Zielgeschwindigkeit (km/h)';

    const targetInput = document.createElement('input');
    targetInput.type = 'number';
    targetInput.min = '0.1';
    targetInput.step = '0.1';
    targetInput.className = 'activity-note-select';
    targetInput.value = String(getWhatIfPace(currentProfile));

    targetField.appendChild(targetLabel);
    targetField.appendChild(targetInput);
    controls.appendChild(targetField);

    let scopeSelect = null;
    if (hasTrimRange) {
        const scopeField = document.createElement('label');
        scopeField.className = 'activity-note-field';

        const scopeLabel = document.createElement('span');
        scopeLabel.className = 'mini-label';
        scopeLabel.textContent = 'Bereich';

        scopeSelect = document.createElement('select');
        scopeSelect.className = 'activity-note-select';
        scopeSelect.innerHTML = `
            <option value="full">Gesamter Track</option>
            <option value="trim">Trim-Bereich</option>
        `;
        scopeSelect.value = selectedScope;

        scopeField.appendChild(scopeLabel);
        scopeField.appendChild(scopeSelect);
        controls.appendChild(scopeField);
    }

    const output = document.createElement('div');
    output.className = 'whatif-pacing-output';

    const actions = document.createElement('div');
    actions.className = 'trim-editor-actions';

    const useActualAverageBtn = document.createElement('button');
    useActualAverageBtn.type = 'button';
    useActualAverageBtn.className = 'action-btn-secondary trim-action-btn';
    useActualAverageBtn.textContent = 'Tatsächliche Ø übernehmen';
    actions.appendChild(useActualAverageBtn);

    card.appendChild(controls);
    card.appendChild(output);
    card.appendChild(actions);

    const renderOutput = () => {
        if (scopeSelect) {
            selectedScope = scopeSelect.value === 'trim' ? 'trim' : 'full';
        }

        const range = selectedScope === 'trim' && hasTrimRange
            ? {
                startIndex: Math.max(0, trimSelection?.startIndex || 0),
                endIndex: Math.max(1, trimSelection?.endIndex || 1),
                label: 'Trim-Bereich'
            }
            : {
                startIndex: 0,
                endIndex: playbackPoints.length - 1,
                label: 'Gesamter Track'
            };

        const result = calculateWhatIfPacing({
            points: playbackPoints,
            timelineSeconds,
            startIndex: range.startIndex,
            endIndex: range.endIndex,
            targetSpeedKmh: Number(targetInput.value)
        });

        if (!result) {
            output.innerHTML = '<p class="placeholder-text">Bitte einen gültigen Zielwert angeben.</p>';
            return;
        }

        output.innerHTML = `
            <div class="whatif-pacing-row"><span>Bereich</span><strong>${range.label}</strong></div>
            <div class="whatif-pacing-row"><span>Distanz</span><strong>${formatDashboardNumber(result.distanceKm, 2)} km</strong></div>
            <div class="whatif-pacing-row"><span>Tatsächliche Zeit</span><strong>${formatEffortTime(result.actualSeconds)}</strong></div>
            <div class="whatif-pacing-row"><span>Tatsächliche Ø</span><strong>${formatDashboardNumber(result.actualAvgKmh, 1)} km/h</strong></div>
            <div class="whatif-pacing-row"><span>Zielzeit</span><strong>${formatEffortTime(result.projectedSeconds)}</strong></div>
            <div class="whatif-pacing-row"><span>Differenz</span><strong class="${result.deltaSeconds <= 0 ? 'compare-delta-positive' : 'compare-delta-negative'}">${formatSignedDuration(result.deltaSeconds)}</strong></div>
        `;
    };

    targetInput.addEventListener('input', renderOutput);
    targetInput.addEventListener('change', () => {
        setWhatIfPace(currentProfile, Number(targetInput.value));
        renderOutput();
    });

    scopeSelect?.addEventListener('change', renderOutput);

    useActualAverageBtn.onclick = () => {
        const range = selectedScope === 'trim' && hasTrimRange
            ? {
                startIndex: Math.max(0, trimSelection?.startIndex || 0),
                endIndex: Math.max(1, trimSelection?.endIndex || 1)
            }
            : {
                startIndex: 0,
                endIndex: playbackPoints.length - 1
            };

        const baseline = calculateWhatIfPacing({
            points: playbackPoints,
            timelineSeconds,
            startIndex: range.startIndex,
            endIndex: range.endIndex,
            targetSpeedKmh: 10
        });

        if (!baseline || !Number.isFinite(baseline.actualAvgKmh) || baseline.actualAvgKmh <= 0) {
            return;
        }

        targetInput.value = String(Number(baseline.actualAvgKmh.toFixed(1)));
        setWhatIfPace(currentProfile, baseline.actualAvgKmh);
        renderOutput();
    };

    renderOutput();
    return card;
}

function updateDetailsPanel(filename, gpxLayer) {
    const floating = document.getElementById('floating-info-content');
    const panel = document.getElementById('floating-info-panel');
    if (!floating || !panel) return;

    floating.innerHTML = '';

    const distanceKm = ((gpxLayer.get_distance?.() || 0) / 1000).toFixed(1);
    const elevationM = (gpxLayer.get_elevation_gain?.() || 0).toFixed(0);
    const speedKmh = (gpxLayer.get_moving_speed?.() || 0).toFixed(1);
    const startTime = gpxLayer.get_start_time?.() || new Date(0);

    const header = document.createElement('div');
    header.className = 'detail-header-group';

    const title = document.createElement('h3');
    title.textContent = getTrackDisplayName(filename);

    const subtitle = document.createElement('p');
    subtitle.textContent = startTime.toLocaleDateString('de-DE');

    header.appendChild(title);
    header.appendChild(subtitle);

    const statsGrid = document.createElement('div');
    statsGrid.className = 'stats-grid-small';

    const stats = [
        { label: 'Distanz', value: `${distanceKm} km` },
        { label: 'Anstieg', value: `+${elevationM} m` },
        { label: 'Speed', value: `${speedKmh} km/h` }
    ];

    stats.forEach(stat => {
        const card = document.createElement('div');
        card.className = 'stat-mini-card';

        const label = document.createElement('span');
        label.className = 'mini-label';
        label.textContent = stat.label;

        const value = document.createElement('span');
        value.className = 'mini-value';
        value.textContent = stat.value;

        card.appendChild(label);
        card.appendChild(value);
        statsGrid.appendChild(card);
    });

    statsGrid.appendChild(buildWeatherCard(filename, gpxLayer));

    const actions = document.createElement('div');
    actions.className = 'detail-actions';

    const centerBtn = document.createElement('button');
    centerBtn.className = 'action-btn-secondary';
    centerBtn.textContent = 'Zentrieren';
    centerBtn.onclick = () => {
        const bounds = typeof gpxLayer?.getBounds === 'function' ? gpxLayer.getBounds() : null;
        safeFocusBounds(bounds, { padding: [50, 50], duration: 1.0 });
    };

    const trimBtn = document.createElement('button');
    trimBtn.className = `action-btn-secondary${isTrimModeFor(currentProfile, filename) ? ' action-btn-secondary--active' : ''}`;
    trimBtn.textContent = isTrimModeFor(currentProfile, filename) ? 'Trim aktiv' : 'Zuschneiden';
    trimBtn.onclick = () => {
        if (isTrimModeFor(currentProfile, filename)) {
            focusTrimSelection();
            return;
        }

        beginTrimMode(filename);
    };

    const outlierBtn = document.createElement('button');
    outlierBtn.className = `action-btn-secondary${isOutlierModeFor(currentProfile, filename) ? ' action-btn-secondary--active' : ''}`;
    outlierBtn.textContent = isOutlierModeFor(currentProfile, filename) ? 'Ausreißer aktiv' : 'Ausreißer prüfen';
    outlierBtn.onclick = () => {
        if (isOutlierModeFor(currentProfile, filename)) {
            const firstCandidate = outlierSelection?.candidates?.[0];
            if (firstCandidate) {
                focusOutlierCandidate(firstCandidate.id);
            }
            return;
        }

        beginOutlierMode(filename);
    };

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'detail-delete-btn';
    deleteBtn.textContent = 'Löschen';
    deleteBtn.onclick = () => deleteTrack(filename);

    actions.appendChild(centerBtn);
    actions.appendChild(trimBtn);
    actions.appendChild(outlierBtn);
    actions.appendChild(deleteBtn);

    const playbackControls = document.createElement('div');
    playbackControls.className = 'playback-controls';

    const playbackButton = document.createElement('button');
    playbackButton.id = 'playback-toggle-btn';
    playbackButton.className = 'playback-btn-shared';
    playbackButton.textContent = '▶';
    playbackButton.title = 'Playback starten/pausieren';
    playbackButton.onclick = () => togglePlayback();

    const stepBackButton = document.createElement('button');
    stepBackButton.className = 'playback-btn-shared';
    stepBackButton.textContent = '⏮';
    stepBackButton.title = 'Einen Punkt zurück';
    stepBackButton.onclick = () => {
        pausePlayback();
        stepPlayback(-1);
    };

    const stepForwardButton = document.createElement('button');
    stepForwardButton.className = 'playback-btn-shared';
    stepForwardButton.textContent = '⏭';
    stepForwardButton.title = 'Einen Punkt vor';
    stepForwardButton.onclick = () => {
        pausePlayback();
        stepPlayback(1);
    };

    const speedSelect = document.createElement('select');
    speedSelect.id = 'playback-speed-select';
    speedSelect.className = 'playback-speed-shared';
    PLAYBACK_SPEED_OPTIONS.forEach(speed => {
        const option = document.createElement('option');
        option.value = String(speed);
        option.textContent = `${speed}x`;
        if (speed === playbackSpeed) {
            option.selected = true;
        }
        speedSelect.appendChild(option);
    });
    speedSelect.onchange = (event) => {
        const nextSpeed = Number(event.target.value);
        if (!Number.isNaN(nextSpeed) && nextSpeed > 0) {
            playbackSpeed = nextSpeed;
            if (isPlaying) {
                startPlaybackLoop();
            }
        }
    };

    const playbackStatus = document.createElement('span');
    playbackStatus.id = 'playback-status';
    playbackStatus.className = 'mini-label';
    playbackStatus.textContent = playbackPoints.length ? `Punkt ${Math.min(playbackIndex + 1, playbackPoints.length)}/${playbackPoints.length}` : 'Keine Playback-Daten';

    playbackControls.appendChild(stepBackButton);
    playbackControls.appendChild(playbackButton);
    playbackControls.appendChild(stepForwardButton);
    playbackControls.appendChild(speedSelect);
    playbackControls.appendChild(playbackStatus);

    const trimSummary = isTrimModeFor(currentProfile, filename)
        ? calculateTrimSummary(trimSelection.startIndex, trimSelection.endIndex)
        : null;

    let trimCard = null;
    if (trimSummary) {
        trimCard = document.createElement('div');
        trimCard.className = 'trim-editor-card';

        const trimTitle = document.createElement('div');
        trimTitle.className = 'trim-editor-title';
        trimTitle.textContent = 'Training zuschneiden';

        const trimHint = document.createElement('p');
        trimHint.className = 'trim-editor-hint';
        trimHint.textContent = 'Ziehe Start und Ende direkt auf der Karte. Optional kannst du zuerst per Playback oder Chart an die Stelle springen und dann den aktuellen Punkt übernehmen.';

        const trimStats = document.createElement('div');
        trimStats.className = 'trim-summary-grid';

        [
            { label: 'Start', value: trimSummary.startLabel },
            { label: 'Ende', value: trimSummary.endLabel },
            { label: 'Distanz', value: `${trimSummary.distanceKm.toFixed(1)} km` },
            { label: 'Anstieg', value: `+${Math.round(trimSummary.elevationGainM)} m` },
            { label: 'Dauer', value: trimSummary.durationMinutes !== null ? `${trimSummary.durationMinutes.toFixed(0)} min` : 'Keine Zeitdaten' },
            { label: 'Punkte', value: String(trimSummary.pointCount) }
        ].forEach(item => {
            const statCard = document.createElement('div');
            statCard.className = 'trim-summary-card';

            const statLabel = document.createElement('span');
            statLabel.className = 'mini-label';
            statLabel.textContent = item.label;

            const statValue = document.createElement('strong');
            statValue.className = 'trim-summary-value';
            statValue.textContent = item.value;

            statCard.appendChild(statLabel);
            statCard.appendChild(statValue);
            trimStats.appendChild(statCard);
        });

        const trimActions = document.createElement('div');
        trimActions.className = 'trim-editor-actions';

        const setStartBtn = document.createElement('button');
        setStartBtn.className = 'action-btn-secondary trim-action-btn';
        setStartBtn.textContent = 'Start = aktueller Punkt';
        setStartBtn.onclick = () => setTrimBoundary('start', playbackIndex);

        const setEndBtn = document.createElement('button');
        setEndBtn.className = 'action-btn-secondary trim-action-btn';
        setEndBtn.textContent = 'Ende = aktueller Punkt';
        setEndBtn.onclick = () => setTrimBoundary('end', playbackIndex);

        const applyTrimBtn = document.createElement('button');
        applyTrimBtn.className = 'action-btn-secondary trim-action-btn trim-action-btn--primary';
        applyTrimBtn.textContent = 'Übernehmen';
        applyTrimBtn.onclick = () => commitTrimSelection();

        const cancelTrimBtn = document.createElement('button');
        cancelTrimBtn.className = 'action-btn-secondary trim-action-btn';
        cancelTrimBtn.textContent = 'Abbrechen';
        cancelTrimBtn.onclick = () => endTrimMode();

        trimActions.appendChild(setStartBtn);
        trimActions.appendChild(setEndBtn);
        trimActions.appendChild(applyTrimBtn);
        trimActions.appendChild(cancelTrimBtn);

        trimCard.appendChild(trimTitle);
        trimCard.appendChild(trimHint);
        trimCard.appendChild(trimStats);
        trimCard.appendChild(trimActions);
    }

    const activeOutlierCandidates = isOutlierModeFor(currentProfile, filename)
        ? (outlierSelection?.candidates || [])
        : [];

    let outlierCard = null;
    if (activeOutlierCandidates.length) {
        outlierCard = document.createElement('div');
        outlierCard.className = 'trim-editor-card outlier-editor-card';

        const outlierTitle = document.createElement('div');
        outlierTitle.className = 'trim-editor-title';
        outlierTitle.textContent = 'Ausreißer-Prüfung';

        const outlierHint = document.createElement('p');
        outlierHint.className = 'trim-editor-hint';
        outlierHint.textContent = 'Bitte jeden Fund einzeln bestätigen. Mit „Entfernen“ wird der markierte Bereich später aus dem Originaltraining gelöscht.';

        const outlierList = document.createElement('div');
        outlierList.className = 'outlier-list';

        activeOutlierCandidates.forEach(candidate => {
            const row = document.createElement('div');
            row.className = `outlier-row${candidate.decision === 'remove' ? ' outlier-row--remove' : candidate.decision === 'keep' ? ' outlier-row--keep' : ''}`;

            const rowHeader = document.createElement('div');
            rowHeader.className = 'outlier-row__header';

            const rowTitle = document.createElement('strong');
            rowTitle.className = 'outlier-row__title';
            rowTitle.textContent = candidate.title;

            const rowMeta = document.createElement('span');
            rowMeta.className = 'outlier-row__meta';
            rowMeta.textContent = `${candidate.startLabel} → ${candidate.endLabel}`;

            rowHeader.appendChild(rowTitle);
            rowHeader.appendChild(rowMeta);

            const rowReason = document.createElement('p');
            rowReason.className = 'outlier-row__reason';
            rowReason.textContent = `${candidate.reasonText} · ${candidate.distanceKm.toFixed(2)} km · ${candidate.pointCount} Punkte${candidate.durationMinutes !== null ? ` · ${candidate.durationMinutes.toFixed(0)} min` : ''}`;

            const rowActions = document.createElement('div');
            rowActions.className = 'outlier-row__actions';

            const focusBtn = document.createElement('button');
            focusBtn.className = 'action-btn-secondary outlier-decision-btn';
            focusBtn.textContent = 'Ansehen';
            focusBtn.onclick = () => focusOutlierCandidate(candidate.id);

            const keepBtn = document.createElement('button');
            keepBtn.className = `action-btn-secondary outlier-decision-btn${candidate.decision === 'keep' ? ' outlier-decision-btn--active-neutral' : ''}`;
            keepBtn.textContent = 'Behalten';
            keepBtn.onclick = () => setOutlierDecision(candidate.id, 'keep');

            const removeBtn = document.createElement('button');
            removeBtn.className = `action-btn-secondary outlier-decision-btn${candidate.decision === 'remove' ? ' outlier-decision-btn--active-danger' : ''}`;
            removeBtn.textContent = 'Entfernen';
            removeBtn.onclick = () => setOutlierDecision(candidate.id, 'remove');

            rowActions.appendChild(focusBtn);
            rowActions.appendChild(keepBtn);
            rowActions.appendChild(removeBtn);

            row.appendChild(rowHeader);
            row.appendChild(rowReason);
            row.appendChild(rowActions);
            outlierList.appendChild(row);
        });

        const outlierFooter = document.createElement('div');
        outlierFooter.className = 'trim-editor-actions';

        const undecidedCount = activeOutlierCandidates.filter(candidate => candidate.decision === null).length;
        const removeCount = activeOutlierCandidates.filter(candidate => candidate.decision === 'remove').length;

        const statusPill = document.createElement('div');
        statusPill.className = 'outlier-status-pill';
        statusPill.textContent = undecidedCount > 0
            ? `${undecidedCount} noch offen`
            : removeCount > 0
                ? `${removeCount} zur Entfernung bestätigt`
                : 'Keine Entfernung ausgewählt';

        const applyOutlierBtn = document.createElement('button');
        applyOutlierBtn.className = 'action-btn-secondary trim-action-btn trim-action-btn--primary';
        applyOutlierBtn.textContent = 'Bereinigung anwenden';
        applyOutlierBtn.disabled = undecidedCount > 0 || removeCount === 0;
        applyOutlierBtn.onclick = () => applyOutlierCleanup();

        const cancelOutlierBtn = document.createElement('button');
        cancelOutlierBtn.className = 'action-btn-secondary trim-action-btn';
        cancelOutlierBtn.textContent = 'Abbrechen';
        cancelOutlierBtn.onclick = () => endOutlierMode();

        outlierFooter.appendChild(statusPill);
        outlierFooter.appendChild(applyOutlierBtn);
        outlierFooter.appendChild(cancelOutlierBtn);

        outlierCard.appendChild(outlierTitle);
        outlierCard.appendChild(outlierHint);
        outlierCard.appendChild(outlierList);
        outlierCard.appendChild(outlierFooter);
    }

    const noteCard = document.createElement('div');
    noteCard.className = 'trim-editor-card activity-note-card';

    const equipmentCard = document.createElement('div');
    equipmentCard.className = 'trim-editor-card equipment-track-card';

    const pacingCard = createWhatIfPacingCard(filename);

    floating.appendChild(header);
    floating.appendChild(statsGrid);
    floating.appendChild(actions);
    if (outlierCard) {
        floating.appendChild(outlierCard);
    }
    if (trimCard) {
        floating.appendChild(trimCard);
    }
    floating.appendChild(noteCard);
    floating.appendChild(equipmentCard);
    floating.appendChild(pacingCard);
    floating.appendChild(playbackControls);
    panel.classList.add('visible');

    populateActivityNoteCard(noteCard, filename).catch(error => {
        console.error(error);
    });

    populateTrackEquipmentCard(equipmentCard, filename).catch(error => {
        console.error(error);
    });

    const weatherState = getTrackWeatherState(currentProfile, filename);
    if (weatherState.status === 'idle') {
        loadWeatherForTrack(filename, gpxLayer).catch(() => {});
    }

    updatePlaybackControlState();
}

function createTrackListItem(filename, dist) {
    const li = document.createElement('li');
    li.className = 'track-item';
    li.id = getTrackListItemId(filename);
    if (filename === getEffectiveActiveTrackName()) {
        li.classList.add('active');
    }

    const info = document.createElement('div');
    info.className = 'track-info';

    const nameSpan = document.createElement('span');
    nameSpan.textContent = getTrackDisplayName(filename);

    const distanceSpan = document.createElement('span');
    distanceSpan.textContent = `${((dist || 0) / 1000).toFixed(1)} km`;

    info.appendChild(nameSpan);
    info.appendChild(distanceSpan);
    li.appendChild(info);

    li.onclick = () => selectTrack(filename);
    return li;
}

function addTrackToList(filename, dist, listElement = null) {
    const list = listElement || document.getElementById('track-list');
    if (!list) return;

    list.appendChild(createTrackListItem(filename, dist));
}

function syncTrackListActiveState(filename = getEffectiveActiveTrackName()) {
    const activeFilename = typeof filename === 'string' && filename ? filename : getEffectiveActiveTrackName();
    document.querySelectorAll('.track-item.active').forEach(el => el.classList.remove('active'));
    if (!activeFilename) {
        return;
    }

    const listItem = document.getElementById(getTrackListItemId(activeFilename));
    if (listItem) {
        listItem.classList.add('active');
    }
}

function getTrackDisplayName(filename) {
    const baseName = String(filename || '').replace(/\.(gpx|fit|fir)$/i, '').trim();
    const withoutDatePrefix = baseName
        .replace(/^\s*\d{4}\s*[-._]\s*\d{1,2}\s*[-._]\s*\d{1,2}\s*[_\-\s]*/u, '')
        .replace(/^\s*\d{4}\s+\d{1,2}\s+\d{1,2}\s*[_\-\s]*/u, '')
        .trim();

    return withoutDatePrefix || baseName;
}

function getTrackListItemId(filename) {
    return `list-item-${encodeURIComponent(String(filename || ''))}`;
}

function initDashboard() {
    initStandardModal({
        modalId: 'dashboard-modal',
        triggerId: 'dashboard-btn',
        closeId: 'close-dashboard',
        initialFocusSelector: '#close-dashboard',
        onOpen: async () => {
            renderDashboard();
        }
    });
}

function isDashboardOpen() {
    const modal = document.getElementById('dashboard-modal');
    return isModalOpen(modal);
}

function getCurrentProfileLabel() {
    const profile = getEffectiveCurrentProfile();
    const button = document.querySelector(`.profile-btn[data-profile="${profile}"]`);
    if (button?.textContent) {
        return button.textContent.trim();
    }

    return profile;
}

function getProfileLabel(profile) {
    const button = document.querySelector(`.profile-btn[data-profile="${profile}"]`);
    if (button?.textContent) {
        return button.textContent.trim();
    }

    return profile;
}

function formatDashboardNumber(value, digits = 1) {
    return formatUtilsBridgeService.formatDashboardNumber(value, digits);
}

function formatDashboardDate(dateMs) {
    return formatUtilsBridgeService.formatDashboardDate(dateMs);
}

function getDashboardTier(rankIndex, totalCount) {
    if (totalCount <= 1) {
        return 'S';
    }

    const percentile = rankIndex / Math.max(totalCount - 1, 1);
    if (percentile <= 0.15) return 'S';
    if (percentile <= 0.4) return 'A';
    if (percentile <= 0.75) return 'B';
    return 'C';
}

function collectCurrentProfileTrackStats() {
    const files = tracksByProfile[currentProfile] || [];

    return files
        .map(filename => {
            const entry = getCachedTrack(currentProfile, filename);
            if (!entry?.stats) {
                return null;
            }

            const distanceKm = (Number(entry.stats.distance) || 0) / 1000;
            const elevationM = Number(entry.stats.elevation) || 0;
            const speedKmh = Number(entry.stats.speed) || 0;
            const dateMs = Number(entry.stats.date) || 0;

            const score = (distanceKm * 1.2) + (elevationM / 120) + (speedKmh * 1.6);

            return {
                filename,
                displayName: getTrackDisplayName(filename),
                distanceKm,
                elevationM,
                speedKmh,
                dateMs,
                score
            };
        })
        .filter(Boolean);
}

function getTrackStatsScopeCacheKey(scope = uiStateManager.getDashboardScope()) {
    const profile = getEffectiveCurrentProfile();
    return scope === 'all' ? 'all' : `profile:${profile}`;
}

function collectTrackStatsForScope(scope = uiStateManager.getDashboardScope()) {
    if (trackStatsCacheGeneration !== loadGeneration) {
        trackStatsCacheGeneration = loadGeneration;
        trackStatsByScopeCache = {};
    }

    const cacheKey = getTrackStatsScopeCacheKey(scope);
    const cachedRows = trackStatsByScopeCache[cacheKey];
    if (Array.isArray(cachedRows)) {
        return cachedRows;
    }

    if (scope !== 'all') {
        const currentProfileKey = getEffectiveCurrentProfile();
        const rows = collectCurrentProfileTrackStats().map(item => ({
            ...item,
            profile: currentProfileKey,
            profileLabel: getCurrentProfileLabel()
        }));

        trackStatsByScopeCache[cacheKey] = rows;
        return rows;
    }

    const availableProfileList = profileManager.getAvailableProfiles();
    const allProfiles = availableProfileList.length ? availableProfileList : Object.keys(tracksByProfile);
    const rows = [];

    allProfiles.forEach(profile => {
        const files = tracksByProfile[profile] || [];
        files.forEach(filename => {
            const entry = getCachedTrack(profile, filename);
            if (!entry?.stats) {
                return;
            }

            const distanceKm = (Number(entry.stats.distance) || 0) / 1000;
            const elevationM = Number(entry.stats.elevation) || 0;
            const speedKmh = Number(entry.stats.speed) || 0;
            const dateMs = Number(entry.stats.date) || 0;
            const score = (distanceKm * 1.2) + (elevationM / 120) + (speedKmh * 1.6);

            rows.push({
                profile,
                profileLabel: getProfileLabel(profile),
                filename,
                displayName: getTrackDisplayName(filename),
                distanceKm,
                elevationM,
                speedKmh,
                dateMs,
                score
            });
        });
    });

    trackStatsByScopeCache[cacheKey] = rows;
    return rows;
}

function buildYearlyRecapData(stats = []) {
    const yearlyMap = new Map();

    stats.forEach(item => {
        if (!Number.isFinite(item?.dateMs) || item.dateMs <= 0) {
            return;
        }

        const year = new Date(item.dateMs).getFullYear();
        if (!Number.isFinite(year)) {
            return;
        }

        if (!yearlyMap.has(year)) {
            yearlyMap.set(year, {
                year,
                totalDistanceKm: 0,
                totalElevationM: 0,
                activities: 0,
                longest: item,
                fastest: item,
                steepest: item
            });
        }

        const bucket = yearlyMap.get(year);
        bucket.totalDistanceKm += Number(item.distanceKm) || 0;
        bucket.totalElevationM += Number(item.elevationM) || 0;
        bucket.activities += 1;

        if ((Number(item.distanceKm) || 0) > (Number(bucket.longest?.distanceKm) || 0)) {
            bucket.longest = item;
        }
        if ((Number(item.speedKmh) || 0) > (Number(bucket.fastest?.speedKmh) || 0)) {
            bucket.fastest = item;
        }
        if ((Number(item.elevationM) || 0) > (Number(bucket.steepest?.elevationM) || 0)) {
            bucket.steepest = item;
        }
    });

    const rows = Array.from(yearlyMap.values()).sort((left, right) => right.year - left.year);
    rows.forEach((item, index) => {
        const previous = rows[index + 1] || null;
        item.distanceDeltaKm = previous ? item.totalDistanceKm - previous.totalDistanceKm : null;
        item.elevationDeltaM = previous ? item.totalElevationM - previous.totalElevationM : null;
    });

    return rows;
}

function collectStatsInTimeRange(stats, { startMs, endMs }) {
    const safeStartMs = Number.isFinite(startMs) ? startMs : Number.NEGATIVE_INFINITY;
    const safeEndMs = Number.isFinite(endMs) ? endMs : Number.POSITIVE_INFINITY;

    const rows = (Array.isArray(stats) ? stats : []).filter(item => {
        const dateMs = Number(item?.dateMs);
        return Number.isFinite(dateMs) && dateMs > 0 && dateMs >= safeStartMs && dateMs < safeEndMs;
    });

    const speedRows = rows.filter(item => Number.isFinite(Number(item?.speedKmh)) && Number(item.speedKmh) > 0);

    return {
        activities: rows.length,
        distanceKm: rows.reduce((sum, item) => sum + (Number(item.distanceKm) || 0), 0),
        elevationM: rows.reduce((sum, item) => sum + (Number(item.elevationM) || 0), 0),
        avgSpeedKmh: speedRows.length
            ? speedRows.reduce((sum, item) => sum + (Number(item.speedKmh) || 0), 0) / speedRows.length
            : 0
    };
}

function computeRollingTrendKpis(stats = [], { nowMs = Date.now(), windowDays = TREND_WINDOW_DAYS } = {}) {
    const safeNowMs = Number.isFinite(nowMs) ? nowMs : Date.now();
    const safeWindowDays = Math.max(1, Number(windowDays) || TREND_WINDOW_DAYS);
    const windowMs = safeWindowDays * 24 * 60 * 60 * 1000;

    const recentStartMs = safeNowMs - windowMs;
    const previousStartMs = recentStartMs - windowMs;

    const recent = collectStatsInTimeRange(stats, {
        startMs: recentStartMs,
        endMs: safeNowMs + 1
    });
    const previous = collectStatsInTimeRange(stats, {
        startMs: previousStartMs,
        endMs: recentStartMs
    });

    return {
        windowDays: safeWindowDays,
        recent,
        previous,
        deltaDistanceKm: recent.distanceKm - previous.distanceKm,
        deltaElevationM: recent.elevationM - previous.elevationM,
        deltaActivities: recent.activities - previous.activities,
        deltaAvgSpeedKmh: recent.avgSpeedKmh - previous.avgSpeedKmh,
        hasAnyWindowData: (recent.activities + previous.activities) > 0,
        hasComparisonData: previous.activities > 0
    };
}

function formatSignedDelta(value, digits = 1, unit = '') {
    const numericValue = Number(value);
    const safeValue = Number.isFinite(numericValue) ? numericValue : 0;
    const prefix = safeValue > 0 ? '+' : '';
    const suffix = unit ? ` ${unit}` : '';
    return `${prefix}${formatDashboardNumber(safeValue, digits)}${suffix}`;
}

// Wave 3: Sportartspezifische Trend-Insights
function computeProfileSpecificMetrics(profile, stats = []) {
    if (!stats.length) {
        return {
            profile,
            sessionsCount: 0,
            avgDistance: 0,
            avgDuration: 0,
            avgSpeed: 0,
            totalDistance: 0
        };
    }

    const totalDistance = stats.reduce((sum, s) => sum + (s.distanceKm || 0), 0);
    const avgDistance = totalDistance / stats.length;
    const avgSpeed = stats.reduce((sum, s) => sum + (s.speedKmh || 0), 0) / stats.length;
    const avgDuration = stats.reduce((sum, s) => {
        const distKm = s.distanceKm || 0;
        const speedKmh = s.speedKmh || 1;
        return sum + (distKm / speedKmh);
    }, 0) / stats.length;

    return {
        profile,
        sessionsCount: stats.length,
        avgDistance,
        avgDuration,
        avgSpeed,
        totalDistance
    };
}

function getProfileSpecificInsight(profile, trends, stats = []) {
    if (!stats.length) {
        return null;
    }

    const metrics = computeProfileSpecificMetrics(profile, stats);
    const recentStats = stats.slice(-Math.max(1, Math.floor(stats.length / 2)));

    let insightText = '';
    let recommendation = '';
    let icon = '✨';
    let severity = 'info';

    const hasTrends = trends && trends.hasComparisonData;

    if (profile === 'laufen') {
        const recentSpeed = recentStats.reduce((s, st) => s + (st.speedKmh || 0), 0) / recentStats.length;
        const previousSpeed = metrics.avgSpeed;

        if (recentSpeed > previousSpeed * 1.05) {
            insightText = `🏃 Starke Leistung! Dein Tempo ist um ${formatDashboardNumber((recentSpeed - previousSpeed) / previousSpeed * 100, 0)}% gestiegen.`;
            recommendation = 'Behalte das Tempotraining bei, aber achte auf ausreichend Regeneration der Sehnen.';
            icon = '🏃';
            severity = 'good';
        } else if (recentSpeed < previousSpeed * 0.95) {
            insightText = `⚠️ Dein Runninglevel scheint zu sinken (${formatDashboardNumber(recentSpeed, 1)} vs ${formatDashboardNumber(previousSpeed, 1)} km/h).`;
            recommendation = 'Vielleicht ein Regenerationstag nötig? Ein lockerer Regenerationslauf könnte Wunder wirken.';
            icon = '⚠️';
            severity = 'caution';
        } else {
            insightText = `🎯 Konstante Laufperformance bei ~${formatDashboardNumber(recentSpeed, 1)} km/h.`;
            recommendation = 'Versuche, einmal pro Woche ein neues Gelände (Trail/City) zu erkunden, um neue Reize zu setzen.';
            icon = '🎯';
            severity = 'info';
        }

        if (hasTrends && trends.deltaElevationM < -50) {
            recommendation += ' Du läufst aktuell sehr flach. Baue 1x die Woche Steigungen ein.';
        }
    } else if (profile === 'rennrad') {
        const recentSpeed = recentStats.reduce((s, st) => s + (st.speedKmh || 0), 0) / recentStats.length;
        const recentDistance = recentStats.reduce((s, st) => s + (st.distanceKm || 0), 0);

        if (recentSpeed > 26) {
            insightText = `🚴 Aggressive Fahrweise! Ø ${formatDashboardNumber(recentSpeed, 1)} km/h über die letzten Touren.`;
            recommendation = 'Starke Pace! Prüfe die Kettenspannung und gönn dir nach 100km einen Protein-Shake.';
            icon = '🚴';
            severity = 'good';
        } else if (recentDistance > 100) {
            insightText = `🛣️ Ausdauer-König: ${formatDashboardNumber(recentDistance, 0)} km in diesem Block.`;
            recommendation = 'Deine Ausdauer ist top. Arbeite jetzt an kurzen Intervallen, um die VO2max zu steigern.';
            icon = '🛣️';
            severity = 'info';
        } else {
            insightText = `🚴 ${metrics.sessionsCount} Rennrad-Sessions mit Ø ${formatDashboardNumber(metrics.avgDistance, 1)} km pro Tour.`;
            recommendation = 'Plane eine "Queen Stage" am Wochenende ein (>60km), um die Komfortzone zu verlassen.';
            icon = '🚴';
            severity = 'info';
        }

        if (hasTrends && trends.deltaAvgSpeedKmh > 2) {
            insightText += ' Deutlicher Geschwindigkeitssprung!';
            recommendation = 'Deine Kraftausdauer wächst. Zeit für eine längere Bergetappe.';
        }
    } else if (profile === 'motorrad') {
        const avgSpeed = metrics.avgSpeed;

        if (avgSpeed > 65) {
            insightText = `🏍️ Flotte Touren: Durchschnitt ${formatDashboardNumber(avgSpeed, 1)} km/h.`;
            recommendation = 'Viel Speed – Prüf doch mal wieder den Reifendruck und die Kettenschmierung.';
            icon = '🏍️';
            severity = 'good';
        } else if (avgSpeed > 40) {
            insightText = `🏍️ Gemischte Strecken mit Ø ${formatDashboardNumber(avgSpeed, 1)} km/h.`;
            recommendation = 'Schöne Abwechslung. Wie wäre es mit einem spezialisierten Sicherheitstraining oder Kurventraining?';
            icon = '🏍️';
            severity = 'info';
        } else {
            insightText = `🏍️ Stadt- & Kurzstrecken dominieren (${formatDashboardNumber(avgSpeed, 1)} km/h).`;
            recommendation = 'Gönn deiner Maschine mal wieder eine ordentliche Überlandfahrt, um Ablagerungen freizubrennen.';
            icon = '🏍️';
            severity = 'caution';
        }
    } else if (profile === 'spazieren') {
        const sessionFrequency = metrics.sessionsCount;
        const recommendedPerWeek = 4;

        if (sessionFrequency >= recommendedPerWeek * 2) {
            insightText = `🚶 Bewegungs-Profi! ${sessionFrequency} Spaziertouren.`;
            recommendation = 'Hervorragend für die mentale Gesundheit. Probier mal Power-Walking, um den Puls etwas zu heben.';
            icon = '🚶';
            severity = 'good';
        } else if (sessionFrequency >= 3) {
            insightText = `🚶 Gute Basis mit ${sessionFrequency} Touren.`;
            recommendation = 'Ein täglicher 15-Minuten-Spaziergang bringt oft mehr als eine große Tour am Sonntag.';
            icon = '🚶';
            severity = 'info';
        } else {
            insightText = `⚠️ Nur ${sessionFrequency} Spaziertouren bisher.`;
            recommendation = 'Bewegungsmangel droht. Versuche, jede Mittagspause für einen kleinen "Airdrop" zu nutzen.';
            icon = '⚠️';
            severity = 'caution';
        }

        if (hasTrends && trends.deltaDistanceKm < 0) {
            recommendation = 'Deine Laufwege werden kürzer. Setz dir das Ziel, nächste Woche +2km Gesamtweg zu erreichen.';
        }
    }

    return {
        profile,
        insightText,
        recommendation,
        icon,
        severity
    };
}

function createStatsScopeSwitch() {
    const switcher = document.createElement('div');
    switcher.className = 'stats-scope-switch';

    const profileBtn = document.createElement('button');
    profileBtn.type = 'button';
    profileBtn.className = 'action-btn-secondary';
    profileBtn.dataset.statsScope = 'profile';
    profileBtn.textContent = 'Aktuelles Profil';
    profileBtn.onclick = () => setDashboardScope('profile');

    const allBtn = document.createElement('button');
    allBtn.type = 'button';
    allBtn.className = 'action-btn-secondary';
    allBtn.dataset.statsScope = 'all';
    allBtn.textContent = 'Alle Profile';
    allBtn.onclick = () => setDashboardScope('all');

    switcher.appendChild(profileBtn);
    switcher.appendChild(allBtn);

    updateDashboardScopeButtons(switcher);
    return switcher;
}

function createSportartInsightCard(insight) {
    if (!insight) return null;

    const card = document.createElement('article');
    card.className = 'sportart-insight-card';
    card.setAttribute('data-insight-severity', insight.severity);

    const severityClass = {
        'good': 'accent-success',
        'caution': 'accent-warning',
        'warning': 'accent-danger',
        'info': 'accent-info'
    }[insight.severity] || 'accent-info';

    card.innerHTML = `
        <div class="insight-header ${severityClass}">
            <span class="insight-icon">${insight.icon}</span>
            <span class="insight-sportart">
                <strong>${
                    insight.profile === 'laufen' ? 'Laufen' :
                    insight.profile === 'rennrad' ? 'Rennrad' :
                    insight.profile === 'motorrad' ? 'Motorrad' :
                    insight.profile === 'spazieren' ? 'Spazieren' : 'Aktivität'
                }</strong>
            </span>
        </div>
        <div class="insight-content">
            <p class="insight-text">${insight.insightText}</p>
            ${insight.recommendation ? `
                <div class="insight-recommendation">
                    <span class="rec-label">Unsere Empfehlung:</span>
                    <p class="rec-text">${insight.recommendation}</p>
                </div>
            ` : ''}
        </div>
    `;

    return card;
}

function createGoalProgressCard({ title, currentValue, targetValue, unit, extraText = '' }) {
    const card = document.createElement('article');
    card.className = 'goal-progress-card';

    const progressPercent = targetValue > 0 ? (currentValue / targetValue) * 100 : 0;
    const clampedProgress = Math.max(0, Math.min(100, progressPercent));

    const header = document.createElement('div');
    header.className = 'goal-progress-card__header';

    const titleEl = document.createElement('strong');
    titleEl.textContent = title;

    const percentEl = document.createElement('span');
    percentEl.textContent = `${formatDashboardNumber(progressPercent, 1)}%`;

    header.appendChild(titleEl);
    header.appendChild(percentEl);

    const bar = document.createElement('div');
    bar.className = 'goal-progress-card__bar';

    const fill = document.createElement('span');
    fill.className = 'goal-progress-card__fill';
    fill.style.width = `${clampedProgress}%`;
    bar.appendChild(fill);

    const visual = document.createElement('div');
    visual.className = 'goal-progress-card__visual';

    const ring = document.createElement('div');
    ring.className = 'goal-progress-card__ring';
    ring.style.setProperty('--goal-progress', `${clampedProgress}%`);

    const ringInner = document.createElement('span');
    ringInner.className = 'goal-progress-card__ring-inner';
    ringInner.textContent = `${formatDashboardNumber(progressPercent, 0)}%`;
    ring.appendChild(ringInner);

    visual.appendChild(ring);
    visual.appendChild(bar);

    const footer = document.createElement('div');
    footer.className = 'goal-progress-card__footer';
    footer.textContent = `${formatDashboardNumber(currentValue, 1)} / ${formatDashboardNumber(targetValue, 1)} ${unit}${extraText ? ` · ${extraText}` : ''}`;

    card.appendChild(header);
    card.appendChild(visual);
    card.appendChild(footer);

    return card;
}

function createYearlyRecapSection(stats = []) {
    const section = document.createElement('section');
    section.className = 'stats-yearly-recap';

    const title = document.createElement('h3');
    title.className = 'ranking-title';
    title.textContent = 'Jahresrückblick';

    const intro = document.createElement('p');
    intro.className = 'trim-editor-hint';
    intro.textContent = 'Automatischer Rückblick mit Highlights und Entwicklung pro Jahr.';

    section.appendChild(title);
    section.appendChild(intro);

    const rows = buildYearlyRecapData(stats);
    if (!rows.length) {
        const empty = document.createElement('p');
        empty.className = 'placeholder-text';
        empty.textContent = 'Für den Jahresrückblick fehlen datierte Aktivitäten.';
        section.appendChild(empty);
        return section;
    }

    const grid = document.createElement('div');
    grid.className = 'yearly-recap-grid';

    rows.forEach(row => {
        const card = document.createElement('article');
        card.className = 'yearly-recap-card';

        const header = document.createElement('div');
        header.className = 'yearly-recap-card__header';

        const yearLabel = document.createElement('strong');
        yearLabel.textContent = String(row.year);

        const deltaLabel = document.createElement('span');
        if (Number.isFinite(row.distanceDeltaKm)) {
            const isPositive = row.distanceDeltaKm >= 0;
            deltaLabel.className = isPositive ? 'compare-delta-positive' : 'compare-delta-negative';
            deltaLabel.textContent = `${isPositive ? '+' : ''}${formatDashboardNumber(row.distanceDeltaKm, 1)} km vs. Vorjahr`;
        } else {
            deltaLabel.textContent = 'Erstes Jahr im Datensatz';
        }

        header.appendChild(yearLabel);
        header.appendChild(deltaLabel);

        const body = document.createElement('div');
        body.className = 'yearly-recap-card__body';
        body.innerHTML = `
            <span>${row.activities} Aktivitäten</span>
            <span>${formatDashboardNumber(row.totalDistanceKm, 1)} km</span>
            <span>+${formatDashboardNumber(row.totalElevationM, 0)} m</span>
            <span>Längste: ${escapeHtml(row.longest?.displayName || '—')} (${formatDashboardNumber(Number(row.longest?.distanceKm) || 0, 1)} km)</span>
            <span>Schnellste: ${escapeHtml(row.fastest?.displayName || '—')} (${formatDashboardNumber(Number(row.fastest?.speedKmh) || 0, 1)} km/h)</span>
            <span>Höchster Anstieg: ${escapeHtml(row.steepest?.displayName || '—')} (+${formatDashboardNumber(Number(row.steepest?.elevationM) || 0, 0)} m)</span>
        `;

        card.appendChild(header);
        card.appendChild(body);
        grid.appendChild(card);
    });

    section.appendChild(grid);
    return section;
}

function createDashboardStatCard({ icon, title, value, sub, standout = false }) {
    const card = document.createElement('div');
    card.className = `stat-card${standout ? ' standout' : ''}`;

    const iconEl = document.createElement('div');
    iconEl.className = 'card-icon';
    iconEl.textContent = icon;

    const titleEl = document.createElement('h5');
    titleEl.textContent = title;

    const valueEl = document.createElement('div');
    valueEl.className = 'stat-big';
    valueEl.textContent = value;

    const subEl = document.createElement('div');
    subEl.className = 'stat-sub';
    subEl.textContent = sub;

    card.appendChild(iconEl);
    card.appendChild(titleEl);
    card.appendChild(valueEl);
    card.appendChild(subEl);

    return card;
}

async function focusTrackFromDashboard(filename, profile = getEffectiveCurrentProfile()) {
    const modal = document.getElementById('dashboard-modal');
    if (modal) {
        closeModalWithA11y(modal);
    }

    const activeProfile = getEffectiveCurrentProfile();
    if (profile && profile !== activeProfile) {
        currentProfile = profileManager.setCurrentProfile(profile);
        syncFoundationProfileState();
        document.querySelectorAll('.profile-btn').forEach(button => {
            button.classList.toggle('active', button.getAttribute('data-profile') === currentProfile);
        });

        document.documentElement.style.setProperty('--active-theme-color', `var(--${currentProfile}-color)`);
        updateSpeedLabels();
        updateElevationLabels();
        showProfileTracks(currentProfile);
        persistUiState();

        await Promise.all([
            loadActivityNoteSummaries(currentProfile),
            loadEquipment(currentProfile),
            loadEquipmentAssignments(currentProfile)
        ]);
    }

    const searchInput = document.getElementById('search-input');
    if (searchInput) {
        searchInput.value = '';
    }
    currentSearchTerm = uiStateManager.setCurrentSearchTerm('');

    activeFilters = uiStateManager.replaceActiveFilters([]);
    document.querySelectorAll('.filter-chip.active').forEach(chip => chip.classList.remove('active'));
    applyFiltersAndSort();

    if (!trackLayers[filename]) {
        showToast('Route ist aktuell nicht verfügbar.', 'warning');
        return;
    }

    await selectTrack(filename);
}

function getStatisticsViewApi() {
    return resolveViewApi('__statisticsViewApi', 'createStatisticsView', () => ({
            getDashboardScope: () => uiStateManager.getDashboardScope(),
            getCurrentProfile: () => getEffectiveCurrentProfile(),
            getCurrentProfileLabel,
            createStatsScopeSwitch,
            collectTrackStatsForScope,
            formatDashboardNumber,
            formatDashboardDate,
            createGoalProgressCard,
            createDashboardStatCard,
            computeRollingTrendKpis,
            formatSignedDelta,
            getDashboardTier,
            setActiveView,
            viewMap: VIEW_MAP,
            focusTrackFromDashboard,
            showToast,
            getProfileSpecificInsight,
            createSportartInsightCard,
            createYearlyRecapSection,
            earthCircumferenceKm: EARTH_CIRCUMFERENCE_KM,
            everestHeightM: EVEREST_HEIGHT_M,
            trendWindowDays: TREND_WINDOW_DAYS
        }));
}

function renderDashboard() {
    return statisticsBridgeService.renderDashboard();
}

function renderStatisticsPanel(container, options) {
    return statisticsBridgeService.renderStatisticsPanel(container, options);
}

function renderStatisticsView() {
    return statisticsBridgeService.renderStatisticsView();
}

function getAnalysesViewApi() {
    return resolveViewApi('__analysesViewApi', 'createAnalysesView', () => ({
            getCurrentProfile: () => getEffectiveCurrentProfile(),
            getCurrentProfileLabel,
            getActiveTrackName: () => getEffectiveActiveTrackName(),
            getPlaybackPoints: () => playbackStateManager.getPlaybackPoints(),
            getTracksByProfile: () => tracksByProfile,
            getAnalysisThresholds,
            formatThresholdLabel,
            escapeHtml,
            createAnalysisThresholdControlsMarkup,
            setActiveView,
            viewMap: VIEW_MAP,
            viewStatistics: VIEW_STATISTICS,
            bindAnalysisThresholdControls,
            collectProfileAnalysisOverview,
            summarizeAnalysisBands,
            toPercentShare,
            formatDistanceKm,
            formatDashboardNumber,
            createAnalysisDistributionCardMarkup,
            getAnalysisTimeline,
            buildTopSpeedPassages,
            computeElevationAnalysisTotals,
            computeSpeedAnalysisTotals,
            getTrackDisplayName,
            formatEffortTime,
            formatDistanceLabel,
            setAnalysisMode,
            analysisModeElevation: ANALYSIS_MODE_ELEVATION,
            analysisModeSpeed: ANALYSIS_MODE_SPEED,
            selectTrack,
            showToast
        }));
}

function getAnalysisDistributionViewApi() {
    return resolveViewApi('__analysisDistributionViewApi', 'createAnalysisDistributionView', () => ({
            toPercentShare,
            escapeHtml,
            formatDistanceKm,
            formatDashboardNumber
        }));
}

function getAnalysisThresholdControlsViewApi() {
    return resolveViewApi('__analysisThresholdControlsViewApi', 'createAnalysisThresholdControlsView', () => ({
            formatNumericInputValue,
            getAnalysisThresholdPreset,
            getAnalysisThresholdPresetKey,
            formatThresholdLabel,
            getAnalysisThresholdPresetIcon,
            escapeHtml,
            getAnalysisThresholdPresetStateMarkup,
            analysisSteepThresholdMin: ANALYSIS_STEEP_THRESHOLD_MIN,
            analysisSteepThresholdMax: ANALYSIS_STEEP_THRESHOLD_MAX,
            analysisSpeedThresholdMin: ANALYSIS_SPEED_THRESHOLD_MIN,
            analysisSpeedThresholdMax: ANALYSIS_SPEED_THRESHOLD_MAX,
            normalizeAnalysisThresholdEntry,
            setAnalysisThresholds,
            resetAnalysisThresholds,
            getAnalysisThresholds
        }));
}

function renderAnalysesView() {
    return prAnalysisBridgeService.renderAnalysesView();
}

function getTrimSummaryViewApi() {
    return resolveViewApi('__trimSummaryViewApi', 'createTrimSummaryView', () => ({
            getPlaybackPoints: () => playbackStateManager.getPlaybackPoints(),
            getMap: () => mapStateManager.getMap()
        }));
}

function getTrimModeStateViewApi() {
    return resolveViewApi('__trimModeStateViewApi', 'createTrimModeStateView', () => ({
            getTrimSelection: () => trimSelection
        }));
}

function getTrimHandleIconViewApi() {
    return resolveViewApi('__trimHandleIconViewApi', 'createTrimHandleIconView', () => ({
            leaflet: L
        }));
}

function getTrimPreviewViewApi() {
    return resolveViewApi('__trimPreviewViewApi', 'createTrimPreviewView', () => ({
            getTrimSelection: () => trimSelection,
            getPlaybackPoints: () => playbackStateManager.getPlaybackPoints(),
            getMap: () => mapStateManager.getMap(),
            removeMapLayer,
            leaflet: L
        }));
}

function getTrackVisualStateViewApi() {
    return resolveViewApi('__trackVisualStateViewApi', 'createTrackVisualStateView', () => ({
            getCurrentProfile: () => getEffectiveCurrentProfile(),
            getTrackLayers: () => trackLayers,
            isAnalysisModeEnabled,
            isAnalysisAvailable,
            getAnalysisMode: () => analysisMode,
            analysisModeElevation: ANALYSIS_MODE_ELEVATION,
            analysisModeSpeed: ANALYSIS_MODE_SPEED,
            drawElevationAnalysis,
            drawSpeedAnalysis,
            clearAnalysisOverlayLayers,
            getPlaybackPoints: () => playbackStateManager.getPlaybackPoints(),
            updateAnalysisControlAvailability
        }));
}

function getTrimInteractionViewApi() {
    return resolveViewApi('__trimInteractionViewApi', 'createTrimInteractionView', () => ({
            getActiveTrackName: () => getEffectiveActiveTrackName(),
            getCurrentProfile: () => getEffectiveCurrentProfile(),
            getCachedTrack,
            updateDetailsPanel,
            getTrimSelection: () => trimSelection,
            getPlaybackPoints: () => playbackStateManager.getPlaybackPoints(),
            updateTrimPreview,
            getMap: () => mapStateManager.getMap()
        }));
}

function getTrimLifecycleViewApi() {
    return resolveViewApi('__trimLifecycleViewApi', 'createTrimLifecycleView', () => ({
            getTrimSelection: () => trimSelection,
            setTrimSelection: (nextValue) => {
                trimSelection = nextValue;
            },
            clearTrimSelectionLayers,
            getActiveTrackName: () => getEffectiveActiveTrackName(),
            getCurrentProfile: () => getEffectiveCurrentProfile(),
            getCachedTrack,
            applyActiveTrackVisualState,
            refreshDetailsPanelIfPossible
        }));
}

function getTrimBeginViewApi() {
    return resolveViewApi('__trimBeginViewApi', 'createTrimBeginView', () => ({
            getActiveTrackName: () => getEffectiveActiveTrackName(),
            getCurrentProfile: () => getEffectiveCurrentProfile(),
            getPlaybackPoints: () => playbackStateManager.getPlaybackPoints(),
            isTrimModeFor,
            focusTrimSelection,
            endOutlierMode,
            endTrimMode,
            getCachedTrack,
            showToast,
            setTrimSelection: (nextValue) => {
                trimSelection = nextValue;
            },
            getTrimSelection: () => trimSelection,
            getMap: () => mapStateManager.getMap(),
            leaflet: L,
            createTrimHandleIcon,
            findNearestPlaybackPointIndex,
            setTrimBoundary,
            applyTrimPreviewVisualState,
            updateTrimPreview,
            refreshDetailsPanelIfPossible
        }));
}

function getTrimCommitViewApi() {
    return resolveViewApi('__trimCommitViewApi', 'createTrimCommitView', () => ({
            getTrimSelection: () => trimSelection,
            getCurrentProfile: () => getEffectiveCurrentProfile(),
            calculateTrimSummary,
            apiBase: API_BASE,
            showToast,
            getCachedTrack,
            removeMapLayer,
            endTrimMode,
            removeCachedTrack,
            loadAllTracks,
            getTracksByProfile: () => tracksByProfile,
            selectTrack
        }));
}

function getOutlierRulesViewApi() {
    return resolveViewApi('__outlierRulesViewApi', 'createOutlierRulesView', () => ({}));
}

function getOutlierLabelViewApi() {
    return resolveViewApi('__outlierLabelViewApi', 'createOutlierLabelView', () => ({
            toFiniteNumber
        }));
}

function getOutlierSegmentsViewApi() {
    return resolveViewApi('__outlierSegmentsViewApi', 'createOutlierSegmentsView', () => ({
            calculateSegmentDistanceMeters,
            toFiniteNumber,
            resolvePointSpeedKmh
        }));
}

function getOutlierCandidateAssemblyViewApi() {
    return resolveViewApi('__outlierCandidateAssemblyViewApi', 'createOutlierCandidateAssemblyView', () => ({
            toFiniteNumber,
            calculateSegmentDistanceMeters,
            formatOutlierPointLabel
        }));
}

function getOutlierDetectionViewApi() {
    return resolveViewApi('__outlierDetectionViewApi', 'createOutlierDetectionView', () => ({
            getOutlierDetectionRules,
            buildTrackSegments,
            mergeOutlierBases,
            finalizeOutlierCandidates
        }));
}

function getOutlierHighlightViewApi() {
    return resolveViewApi('__outlierHighlightViewApi', 'createOutlierHighlightView', () => ({
            getOutlierSelection: () => outlierSelection,
            getPlaybackPoints: () => playbackStateManager.getPlaybackPoints(),
            getMap: () => mapStateManager.getMap(),
            removeMapLayer,
            refreshDetailsPanelIfPossible,
            leaflet: L
        }));
}

function getOutlierModeViewApi() {
    return resolveViewApi('__outlierModeViewApi', 'createOutlierModeView', () => ({
            applyTrimPreviewVisualState,
            getOutlierSelection: () => outlierSelection,
            setOutlierSelection: (nextValue) => {
                outlierSelection = nextValue;
            },
            clearOutlierSelectionLayers,
            getActiveTrackName: () => getEffectiveActiveTrackName(),
            getCurrentProfile: () => getEffectiveCurrentProfile(),
            getCachedTrack,
            applyActiveTrackVisualState,
            refreshDetailsPanelIfPossible,
            showToast,
            getPlaybackPoints: () => playbackStateManager.getPlaybackPoints(),
            isOutlierModeFor,
            focusOutlierCandidate,
            endTrimMode,
            detectOutlierCandidates,
            refreshOutlierHighlights
        }));
}

function getOutlierCleanupViewApi() {
    return resolveViewApi('__outlierCleanupViewApi', 'createOutlierCleanupView', () => ({
            getOutlierSelection: () => outlierSelection,
            getCurrentProfile: () => getEffectiveCurrentProfile(),
            showToast,
            apiBase: API_BASE,
            getCachedTrack,
            removeMapLayer,
            endOutlierMode,
            removeCachedTrack,
            loadAllTracks,
            getTracksByProfile: () => tracksByProfile,
            selectTrack
        }));
}

function getComparisonSelectionViewApi() {
    return resolveViewApi('__comparisonSelectionViewApi', 'createComparisonSelectionView', () => ({
            getCurrentProfile: () => getEffectiveCurrentProfile(),
            getTracksByProfile: () => tracksByProfile,
            getCompareSelection: () => compareSelection,
            setCompareSelection: (nextValue) => {
                compareSelection = nextValue;
            }
        }));
}

function getComparisonSummaryViewApi() {
    return resolveViewApi('__comparisonSummaryViewApi', 'createComparisonSummaryView', () => ({
            getCachedTrack,
            ensureTrackPoints,
            extractPointsSafely,
            findTrackStartAndEndTimeMs,
            resolvePointSpeedKmh,
            calculateMax,
            calculateAverage,
            collectNumericValues,
            getHeartRateValue,
            getPowerValue,
            getTrackDisplayName
        }));
}

function resolveViewApi(cacheKey, factoryName, createDependencies) {
    const resolvedFromRegistry = window.__esmViewApiRegistry?.resolve?.({
        cacheKey,
        factoryName,
        createDependencies
    });

    if (resolvedFromRegistry) {
        return resolvedFromRegistry;
    }

    if (!window[cacheKey] && typeof window[factoryName] === 'function') {
        window[cacheKey] = window[factoryName](createDependencies());
    }

    return window[cacheKey] || null;
}

function getComparisonViewApi() {
    return resolveViewApi('__comparisonViewApi', 'createComparisonView', () => ({
            initStandardModal,
            ensureComparisonSelection,
            getCurrentProfile: () => getEffectiveCurrentProfile(),
            getCurrentProfileLabel,
            getActiveTrackName: () => getEffectiveActiveTrackName(),
            getCachedTrack,
            getTrackDisplayName,
            formatDashboardDate,
            formatMetricValue,
            formatDurationMinutes,
            formatPace,
            getCompareAccentColor,
            clearComparisonOverlay,
            endTrimMode,
            endOutlierMode,
            getIsHeatmapActive: () => mapStateManager.getIsHeatmapActive(),
            setIsHeatmapActive: (nextValue) => mapStateManager.setIsHeatmapActive(nextValue),
            clearHeatmapLayers,
            getCompareSelection: () => compareSelection,
            collectComparisonSummary,
            getMap: () => mapStateManager.getMap(),
            showToast,
            getCompareOverlayLayers: () => compareOverlayLayers,
            setCompareOverlayLayers: (layers) => {
                compareOverlayLayers = Array.isArray(layers) ? layers : [];
            },
            leaflet: L
        }));
}

function initComparisonModal() {
    return statisticsBridgeService.initComparisonModal();
}

function showComparisonOnMap(leftSummary, rightSummary) {
    return statisticsBridgeService.showComparisonOnMap(leftSummary, rightSummary);
}

async function renderComparisonModal() {
    return statisticsBridgeService.renderComparisonModal();
}

function getPrAnalysisViewApi() {
    return resolveViewApi('__prAnalysisViewApi', 'createPrAnalysisView', () => ({
            initStandardModal,
            getCurrentProfile: () => getEffectiveCurrentProfile(),
            getCurrentProfileLabel,
            collectProfileAnalysisEntries,
            loadSegmentFavorites,
            createSegmentFavoritesSection,
            createPrLeaderboardTable,
            createPrProgressionTable,
            buildPrLeaderboard,
            buildPrProgression,
            createTopClimbTable,
            buildTopClimbRanking,
            prDistanceMeters: PR_DISTANCE_METERS
        }));
}

function initPrAnalysisModal() {
    return prAnalysisBridgeService.initPrAnalysisModal();
}

function getEquipmentViewApi() {
    return resolveViewApi('__equipmentViewApi', 'createEquipmentView', () => ({
            initStandardModal,
            getCurrentProfile: () => getEffectiveCurrentProfile(),
            getCurrentProfileLabel,
            getEquipmentEditorDraft,
            clearEquipmentEditorDraft,
            setEquipmentEditorDraft,
            updateEquipment,
            createEquipment,
            deleteEquipment,
            loadEquipment,
            loadEquipmentAssignments,
            renderHomeView,
            showToast,
            buildEquipmentUsageMap,
            getEquipmentAssignmentMap,
            getEquipmentMaintenanceStatus,
            getEquipmentStatusClass,
            formatDashboardNumber,
            getEquipmentReminderSummary,
            getEquipmentItems
        }));
}

async function renderEquipmentModal(options) {
    return equipmentDataBridgeService.renderEquipmentModal(options);
}

function initEquipmentModal() {
    return equipmentDataBridgeService.initEquipmentModal();
}

function getNavigationViewApi() {
    return resolveViewApi('__navigationViewApi', 'createNavigationView', () => ({
            setActiveView,
            viewMap: VIEW_MAP
        }));
}

function getFilterSearchViewApi() {
    return resolveViewApi('__filterSearchViewApi', 'createFilterSearchView', () => ({
            getCurrentProfile: () => getEffectiveCurrentProfile(),
            getTrackDataCache: () => trackDataCache,
            getTrackLayers: () => trackLayers,
            getMap: () => mapStateManager.getMap(),
            getCurrentSearchTerm: () => uiStateManager.getCurrentSearchTerm(),
            setCurrentSearchTerm: (nextTerm) => {
                currentSearchTerm = uiStateManager.setCurrentSearchTerm(nextTerm);
            },
            getActiveFilters: () => uiStateManager.getActiveFilters(),
            getSpeedThresholdsForProfile,
            getActivityNoteSummary,
            persistUiState,
            getSearchDebounceTimer: () => searchDebounceTimer,
            setSearchDebounceTimer: (nextTimer) => {
                searchDebounceTimer = nextTimer;
            },
            searchInputDebounceMs: SEARCH_INPUT_DEBOUNCE_MS,
            createTrackListItem,
            getActiveTrackName: () => getEffectiveActiveTrackName(),
            resetActiveTrackSelection: () => {
                setEffectiveActiveTrackName(null, getEffectiveCurrentProfile());
                playbackPoints = playbackStateManager.setPlaybackPoints([]);
                rebuildPlaybackTimeline();
                stopPlayback();
                closeFloatingPanel();
                updateAnalysisControlAvailability();
            },
            syncTrackListActiveState,
            getIsHeatmapActive: () => mapStateManager.getIsHeatmapActive(),
            updateHeatmap
        }));
}

function getViewStateViewApi() {
    return resolveViewApi('__viewStateViewApi', 'createViewStateView', () => ({
            viewHome: VIEW_HOME,
            viewMap: VIEW_MAP,
            viewAnalyses: VIEW_ANALYSES,
            viewStatistics: VIEW_STATISTICS,
            viewHealth: VIEW_HEALTH,
            getCurrentView: () => uiStateManager.getCurrentView(),
            setCurrentView: (nextView) => {
                currentView = uiStateManager.setCurrentView(nextView);
            },
            renderHomeView,
            renderAnalysesView,
            renderStatisticsView,
            renderHealthView,
            onMapViewActivated: async () => {
                await new Promise(resolve => requestAnimationFrame(() => resolve()));
                await new Promise(resolve => setTimeout(resolve, 40));
                await ensureMapViewportReady({ timeoutMs: 1800, intervalMs: 60 });
                if (typeof map?.invalidateSize === 'function') {
                    map.invalidateSize(false);
                }
                refreshOverlayVisibility();
            },
            persistUiState
        }));
}

function getHomeTrackNavigationViewApi() {
    return resolveViewApi('__homeTrackNavigationViewApi', 'createHomeTrackNavigationView', () => ({
            getActiveFilters: () => uiStateManager.getActiveFilters(),
            setCurrentSearchTerm: (nextTerm) => {
                currentSearchTerm = uiStateManager.setCurrentSearchTerm(nextTerm);
            },
            persistUiState,
            applyFiltersAndSort,
            setActiveView,
            viewMap: VIEW_MAP,
            selectTrack
        }));
}

function getHomeViewApi() {
    return resolveViewApi('__homeViewApi', 'createHomeView', () => ({
            getActivityNoteSummariesByProfile: () => activityNoteSummariesByProfile,
            getCurrentProfile: () => getEffectiveCurrentProfile(),
            getTrackDataCache: () => trackDataCache,
            getEquipmentReminderSummary,
            getEquipmentItems,
            escapeHtml,
            getCurrentProfileLabel,
            formatDashboardNumber,
            formatDashboardDate,
            getTrackDisplayName,
            bindHomeQuickActions
        }));
}

function getActivityNoteViewApi() {
    return resolveViewApi('__activityNoteViewApi', 'createActivityNoteView', () => ({
            noteScoreFields: NOTE_SCORE_FIELDS,
            getCurrentProfile: () => getEffectiveCurrentProfile(),
            getActivityNoteSummary,
            fetchActivityNote,
            saveActivityNote,
            showToast,
            applyFiltersAndSort,
            renderHomeView
        }));
}

function getEquipmentTrackViewApi() {
    return resolveViewApi('__equipmentTrackViewApi', 'createEquipmentTrackView', () => ({
            getCurrentProfile: () => getEffectiveCurrentProfile(),
            getEquipmentItems,
            buildEquipmentUsageMap,
            getTrackEquipmentAssignment,
            getEquipmentMaintenanceStatus,
            formatDashboardNumber,
            saveTrackEquipmentAssignment,
            loadEquipment,
            loadEquipmentAssignments,
            renderHomeView,
            showToast
        }));
}

function getStartupOverlayViewApi() {
    return resolveViewApi('__startupOverlayViewApi', 'createStartupOverlayView', () => ({
            startupLoadingMinMs: STARTUP_LOADING_MIN_MS,
            getStartupIntroDismissed: () => uiStateManager.getStartupIntroDismissed(),
            setStartupIntroDismissed: (nextValue) => {
                startupIntroDismissed = uiStateManager.setStartupIntroDismissed(nextValue);
                persistUiState();
            }
        }));
}

function getProfileSwitcherViewApi() {
    return resolveViewApi('__profileSwitcherViewApi', 'createProfileSwitcherView', () => ({
            apiBase: API_BASE,
            getCurrentProfile: () => getEffectiveCurrentProfile(),
            setCurrentProfile: (nextProfile) => {
                currentProfile = profileManager.setCurrentProfile(nextProfile);
                syncFoundationProfileState();
            },
            getAvailableProfiles: () => profileManager.getAvailableProfiles(),
            setAvailableProfiles: (nextProfiles) => {
                availableProfiles = profileManager.setAvailableProfiles(nextProfiles);
            },
            nextProfileSwitchRequestId: () => {
                profileSwitchRequestId = profileManager.nextProfileSwitchRequestId();
                syncFoundationProfileState();
                return profileSwitchRequestId;
            },
            getProfileSwitchRequestId: () => getEffectiveProfileSwitchRequestId(),
            performProfileSwitch: (nextProfile, options) => window.frontendOrchestrators?.performProfileSwitch?.(nextProfile, options),
            resetCompareSelectionProfile: () => {
                compareSelection.profile = null;
            },
            clearComparisonOverlay,
            clearPrHighlightLayer,
            updateSpeedLabels,
            updateElevationLabels,
            showProfileTracks,
            persistUiState,
            loadActivityNoteSummaries,
            loadEquipment,
            loadEquipmentAssignments,
            renderHomeView,
            renderAnalysesView,
            renderStatisticsView,
            isModalOpen,
            renderEquipmentModal,
            isDashboardOpen,
            renderDashboard,
            restorePersistedTrackSelection,
            updateAnalysisControlAvailability,
            runPersonalRecordAlertCheck
        }));
}

function getMapInitViewApi() {
    return resolveViewApi('__mapInitViewApi', 'createMapInitView', () => ({
            setMap: (nextMap) => {
                mapStateManager.setMap(nextMap);
            },
            onMapZoomChanged: () => {
                if (mapStateManager.getIsHeatmapActive()) {
                    updateHeatmap();
                }
            }
        }));
}

function getAnalysisModeViewApi() {
    return resolveViewApi('__analysisModeViewApi', 'createAnalysisModeView', () => ({
            analysisModeOff: ANALYSIS_MODE_OFF,
            analysisModeElevation: ANALYSIS_MODE_ELEVATION,
            analysisModeSpeed: ANALYSIS_MODE_SPEED,
            getAnalysisMode: () => analysisMode,
            setAnalysisModeState: (nextMode) => {
                analysisMode = nextMode;
            },
            getActiveTrackName: () => getEffectiveActiveTrackName(),
            getCurrentProfile: () => getEffectiveCurrentProfile(),
            getCachedTrack,
            getPlaybackPoints: () => playbackStateManager.getPlaybackPoints(),
            clearAnalysisOverlayLayers,
            closeElevationPanel,
            selectTrack,
            showToast
        }));
}

function getView3DToggleViewApi() {
    return resolveViewApi('__view3DToggleViewApi', 'createView3DToggleView', () => ({
            getMap: () => mapStateManager.getMap(),
            showToast
        }));
}

function getGpxParserViewApi() {
    return resolveViewApi('__gpxParserViewApi', 'createGpxParserView', () => ({
            apiBase: API_BASE,
            getLoadGeneration: () => loadGeneration,
            calculateSegmentDistanceMeters
        }));
}

function getTrackPointFallbackViewApi() {
    return resolveViewApi('__trackPointFallbackViewApi', 'createTrackPointFallbackView', () => ({
            calculateSegmentDistanceMeters
        }));
}

function getTrackPointLoadViewApi() {
    return resolveViewApi('__trackPointLoadViewApi', 'createTrackPointLoadView', () => ({
            getCachedTrack,
            fetchTrackPoints,
            extractPointsSafely
        }));
}

function getMapLayerCleanupViewApi() {
    return resolveViewApi('__mapLayerCleanupViewApi', 'createMapLayerCleanupView', () => ({
            getMap: () => mapStateManager.getMap(),
            getCompareOverlayLayers: () => compareOverlayLayers,
            setCompareOverlayLayers: (nextLayers) => {
                compareOverlayLayers = Array.isArray(nextLayers) ? nextLayers : [];
            },
            getPrHighlightLayer: () => prHighlightLayer,
            setPrHighlightLayer: (nextLayer) => {
                prHighlightLayer = nextLayer;
            }
        }));
}

function getDisplayFormatViewApi() {
    return resolveViewApi('__displayFormatViewApi', 'createDisplayFormatView', () => ({}));
}

function getWeatherStateViewApi() {
    return resolveViewApi('__weatherStateViewApi', 'createWeatherStateView', () => ({
            getCachedTrack,
            toFiniteNumber
        }));
}

function getWeatherRequestPayloadViewApi() {
    return resolveViewApi('__weatherRequestPayloadViewApi', 'createWeatherRequestPayloadView', () => ({
            getCurrentProfile: () => getEffectiveCurrentProfile(),
            getActiveTrackName: () => getEffectiveActiveTrackName(),
            getPlaybackPoints: () => playbackStateManager.getPlaybackPoints(),
            getCachedTrack,
            toFiniteNumber
        }));
}

function getWeatherLoadViewApi() {
    return resolveViewApi('__weatherLoadViewApi', 'createWeatherLoadView', () => ({
            apiBase: API_BASE,
            getCurrentProfile: () => getEffectiveCurrentProfile(),
            getCachedTrack,
            getTrackWeatherState,
            setTrackWeatherState,
            getWeatherRequestPayloadForTrack,
            getActiveTrackName: () => getEffectiveActiveTrackName(),
            refreshDetailsPanelIfPossible,
            showToast
        }));
}

function getWeatherCardViewApi() {
    return resolveViewApi('__weatherCardViewApi', 'createWeatherCardView', () => ({
            getCurrentProfile: () => getEffectiveCurrentProfile(),
            getTrackWeatherState,
            describeWeatherCode,
            formatWeatherNumber,
            formatWindDirection,
            loadWeatherForTrack
        }));
}

function getStatsAggregateViewApi() {
    return resolveViewApi('__statsAggregateViewApi', 'createStatsAggregateView', () => ({}));
}

function getHomeQuickActionsViewApi() {
    return resolveViewApi('__homeQuickActionsViewApi', 'createHomeQuickActionsView', () => ({
            setActiveView,
            viewMap: VIEW_MAP,
            viewAnalyses: VIEW_ANALYSES,
            viewStatistics: VIEW_STATISTICS,
            openTrackFromHome,
            showToast
        }));
}

function getDeleteAllViewApi() {
    return resolveViewApi('__deleteAllViewApi', 'createDeleteAllView', () => ({
            apiBase: API_BASE,
            getCurrentProfile: () => getEffectiveCurrentProfile(),
            showToast,
            loadAllTracks
        }));
}

function getUploadViewApi() {
    return resolveViewApi('__uploadViewApi', 'createUploadView', () => ({
            apiBase: API_BASE,
            getCurrentProfile: () => getEffectiveCurrentProfile(),
            showToast,
            loadAllTracks,
            closeModalWithA11y,
            openModalWithA11y
        }));
}

function formatEffortTime(totalSeconds) {
    if (!Number.isFinite(totalSeconds) || totalSeconds <= 0) {
        return '—';
    }

    const roundedSeconds = Math.max(1, Math.round(totalSeconds));
    const hours = Math.floor(roundedSeconds / 3600);
    const minutes = Math.floor((roundedSeconds % 3600) / 60);
    const seconds = roundedSeconds % 60;

    if (hours > 0) {
        return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }

    return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

function findBestEffortForDistance(points, timelineSeconds, targetMeters) {
    if (!Array.isArray(points) || points.length < 2 || !Array.isArray(timelineSeconds) || timelineSeconds.length !== points.length) {
        return null;
    }

    let bestEffort = null;
    let endIndex = 1;

    for (let startIndex = 0; startIndex < points.length - 1; startIndex += 1) {
        if (endIndex <= startIndex) {
            endIndex = startIndex + 1;
        }

        while (endIndex < points.length && ((points[endIndex]?.dist || 0) - (points[startIndex]?.dist || 0)) < targetMeters) {
            endIndex += 1;
        }

        if (endIndex >= points.length) {
            break;
        }

        const distanceMeters = (points[endIndex]?.dist || 0) - (points[startIndex]?.dist || 0);
        const timeSeconds = (timelineSeconds[endIndex] || 0) - (timelineSeconds[startIndex] || 0);

        if (!Number.isFinite(distanceMeters) || distanceMeters <= 0 || !Number.isFinite(timeSeconds) || timeSeconds <= 0) {
            continue;
        }

        const avgSpeedKmh = (distanceMeters / timeSeconds) * 3.6;
        const paceMinPerKm = (timeSeconds / 60) / Math.max(distanceMeters / 1000, 0.001);

        if (!bestEffort || timeSeconds < bestEffort.timeSeconds) {
            bestEffort = {
                startIndex,
                endIndex,
                distanceMeters,
                timeSeconds,
                avgSpeedKmh,
                paceMinPerKm
            };
        }
    }

    return bestEffort;
}

function extractTrackClimbCandidates(points) {
    if (!Array.isArray(points) || points.length < 3) {
        return [];
    }

    const MIN_GAIN_M = 35;
    const MIN_DISTANCE_M = 380;
    const START_GRADE_PERCENT = 2.2;
    const HOLD_GRADE_PERCENT = -0.8;

    const climbs = [];
    let runStartIndex = null;
    let runGainM = 0;
    let runDistanceM = 0;
    let runMaxGrade = Number.NEGATIVE_INFINITY;

    const flushRun = (runEndIndex) => {
        if (runStartIndex === null) {
            return;
        }

        if (runGainM >= MIN_GAIN_M && runDistanceM >= MIN_DISTANCE_M && runEndIndex > runStartIndex) {
            climbs.push({
                startIndex: runStartIndex,
                endIndex: runEndIndex,
                gainM: runGainM,
                distanceKm: runDistanceM / 1000,
                avgGrade: (runGainM / runDistanceM) * 100,
                maxGrade: Number.isFinite(runMaxGrade) ? runMaxGrade : 0
            });
        }

        runStartIndex = null;
        runGainM = 0;
        runDistanceM = 0;
        runMaxGrade = Number.NEGATIVE_INFINITY;
    };

    for (let index = 1; index < points.length; index += 1) {
        const previousPoint = points[index - 1];
        const point = points[index];
        const segmentDistanceM = calculateSegmentDistanceMeters(previousPoint, point);
        if (!Number.isFinite(segmentDistanceM) || segmentDistanceM < 2) {
            continue;
        }

        const elevationDelta = Number(point?.alt || 0) - Number(previousPoint?.alt || 0);
        const gradePercent = (elevationDelta / segmentDistanceM) * 100;

        const isClimbing = runStartIndex === null
            ? gradePercent >= START_GRADE_PERCENT
            : gradePercent >= HOLD_GRADE_PERCENT;

        if (isClimbing) {
            if (runStartIndex === null) {
                runStartIndex = index - 1;
            }

            runDistanceM += segmentDistanceM;
            if (elevationDelta > 0) {
                runGainM += elevationDelta;
            }
            runMaxGrade = Math.max(runMaxGrade, gradePercent);
            continue;
        }

        flushRun(index - 1);
    }

    flushRun(points.length - 1);

    return climbs
        .sort((left, right) => right.gainM - left.gainM || right.avgGrade - left.avgGrade)
        .slice(0, 4);
}

async function collectProfileAnalysisEntries() {
    const files = tracksByProfile[currentProfile] || [];
    if (!files.length) {
        return [];
    }

    if (prAnalysisCacheGeneration !== loadGeneration) {
        prAnalysisCacheGeneration = loadGeneration;
        prAnalysisEntryCache = {};
    }

    const profile = currentProfile;
    const resultsByFilename = new Map();
    const taskFactories = files.map(filename => async () => {
        const cachedEntry = getCachedTrack(profile, filename);
        if (!cachedEntry?.layer) {
            return;
        }

        const cacheKey = getTrackCacheKey(profile, filename);
        const signature = `${Number(cachedEntry?.stats?.date) || 0}|${Number(cachedEntry?.stats?.distance) || 0}|${Number(cachedEntry?.stats?.elevation) || 0}`;
        const existingCache = prAnalysisEntryCache[cacheKey];

        if (existingCache && existingCache.signature === signature) {
            resultsByFilename.set(filename, existingCache.value);
            return;
        }

        const extractedPoints = extractPointsSafely(cachedEntry.layer);
        const timedExtractedPoints = extractedPoints.reduce((count, point) => {
            if (toFiniteNumber(point?.meta?.timeMs) !== null) {
                return count + 1;
            }

            const parsed = Date.parse(point?.meta?.time || '');
            return Number.isFinite(parsed) ? count + 1 : count;
        }, 0);

        const hasEnoughExtractedTime = extractedPoints.length > 1 && timedExtractedPoints >= Math.max(2, Math.floor(extractedPoints.length * 0.15));

        let points = [];
        if (hasEnoughExtractedTime) {
            points = extractedPoints;
            if (!Array.isArray(cachedEntry.points) || cachedEntry.points.length < 2) {
                cachedEntry.points = extractedPoints;
            }
        } else {
            try {
                points = await ensureTrackPoints(profile, filename, cachedEntry.layer);
            } catch (_) {
                points = [];
            }

            if (!Array.isArray(points) || points.length < 2) {
                points = extractedPoints;
            }
        }

        if (!Array.isArray(points) || points.length < 2) {
            return;
        }

        const timelineSeconds = buildPlaybackTimeline(points);
        const effortsByDistance = {};
        PR_DISTANCE_METERS.forEach(distanceMeters => {
            effortsByDistance[distanceMeters] = findBestEffortForDistance(points, timelineSeconds, distanceMeters);
        });

        const value = {
            filename,
            displayName: getTrackDisplayName(filename),
            dateMs: Number(cachedEntry?.stats?.date) || 0,
            effortsByDistance,
            climbs: extractTrackClimbCandidates(points)
        };

        prAnalysisEntryCache[cacheKey] = {
            signature,
            value
        };

        resultsByFilename.set(filename, value);
    });

    await runWithConcurrency(taskFactories, 2);

    return files
        .map(filename => resultsByFilename.get(filename))
        .filter(Boolean);
}

function buildPrLeaderboard(entries, distanceMeters) {
    return entries
        .map(entry => {
            const effort = entry.effortsByDistance?.[distanceMeters];
            if (!effort) {
                return null;
            }

            return {
                filename: entry.filename,
                displayName: entry.displayName,
                dateMs: entry.dateMs,
                distanceMeters,
                ...effort
            };
        })
        .filter(Boolean)
        .sort((left, right) => left.timeSeconds - right.timeSeconds);
}

function buildPrProgression(leaderboard) {
    const dated = leaderboard
        .filter(record => Number.isFinite(record.dateMs) && record.dateMs > 0)
        .sort((left, right) => left.dateMs - right.dateMs);

    const progression = [];
    let bestTimeSeconds = Number.POSITIVE_INFINITY;

    dated.forEach(record => {
        if (record.timeSeconds < bestTimeSeconds - 0.4) {
            const improvementSeconds = Number.isFinite(bestTimeSeconds)
                ? bestTimeSeconds - record.timeSeconds
                : null;

            bestTimeSeconds = record.timeSeconds;
            progression.push({
                ...record,
                improvementSeconds
            });
        }
    });

    return progression;
}

function buildTopClimbRanking(entries) {
    return entries
        .flatMap(entry => (entry.climbs || []).map(climb => ({
            ...climb,
            filename: entry.filename,
            displayName: entry.displayName,
            dateMs: entry.dateMs
        })))
        .sort((left, right) => right.gainM - left.gainM || right.avgGrade - left.avgGrade)
        .slice(0, 12);
}

async function focusPrSegmentOnMap(filename, startIndex, endIndex, label = 'Segment') {
    const modal = document.getElementById('pr-modal');
    if (modal) {
        closeModalWithA11y(modal);
    }

    await selectTrack(filename);

    if (!Array.isArray(playbackPoints) || playbackPoints.length < 2) {
        showToast('Segment konnte nicht angezeigt werden.', 'warning');
        return;
    }

    const safeStartIndex = Math.max(0, Math.min(playbackPoints.length - 2, Number(startIndex) || 0));
    const safeEndIndex = Math.max(safeStartIndex + 1, Math.min(playbackPoints.length - 1, Number(endIndex) || safeStartIndex + 1));

    setPlaybackIndex(safeStartIndex);
    clearPrHighlightLayer();

    const segmentPoints = playbackPoints.slice(safeStartIndex, safeEndIndex + 1);
    if (segmentPoints.length < 2) {
        showToast('Segment konnte nicht angezeigt werden.', 'warning');
        return;
    }

    const accentColor = getComputedStyle(document.documentElement).getPropertyValue('--active-theme-color').trim() || '#f97316';
    prHighlightLayer = L.polyline(segmentPoints.map(point => [point.lat, point.lng]), {
        color: accentColor,
        weight: 8,
        opacity: 0.95,
        lineCap: 'round'
    }).addTo(map);

    prHighlightLayer.bringToFront();
    const bounds = prHighlightLayer.getBounds();
    safeFitBounds(bounds, { padding: [55, 55] });

    showToast(`${label} auf der Karte markiert.`, 'success');
}

function createPrActionButton(label, onClick) {
    const button = document.createElement('button');
    button.className = 'action-btn-secondary pr-action-btn';
    button.textContent = label;
    button.onclick = onClick;
    return button;
}

function createPrLeaderboardTable(leaderboard, distanceMeters) {
    if (!leaderboard.length) {
        const empty = document.createElement('p');
        empty.className = 'placeholder-text';
        empty.textContent = `Für ${distanceMeters / 1000} km sind noch nicht genug Daten vorhanden.`;
        return empty;
    }

    const table = document.createElement('table');
    table.className = 'compare-metric-table pr-metric-table';

    const thead = document.createElement('thead');
    const headRow = document.createElement('tr');
    ['Rang', 'Zeit', 'Pace', 'Ø km/h', 'Datum', 'Track', 'Aktion'].forEach(label => {
        const th = document.createElement('th');
        th.textContent = label;
        headRow.appendChild(th);
    });
    thead.appendChild(headRow);

    const tbody = document.createElement('tbody');
    leaderboard.slice(0, 6).forEach((record, index) => {
        const row = document.createElement('tr');

        const rankCell = document.createElement('td');
        rankCell.textContent = String(index + 1);

        const timeCell = document.createElement('td');
        timeCell.textContent = formatEffortTime(record.timeSeconds);

        const paceCell = document.createElement('td');
        paceCell.textContent = formatPace(record.paceMinPerKm);

        const speedCell = document.createElement('td');
        speedCell.textContent = formatMetricValue(record.avgSpeedKmh, 'km/h', 1);

        const dateCell = document.createElement('td');
        dateCell.textContent = formatDashboardDate(record.dateMs);

        const trackCell = document.createElement('td');
        trackCell.className = 'compare-metric-table__label';
        trackCell.textContent = record.displayName;

        const actionCell = document.createElement('td');
        actionCell.appendChild(createPrActionButton('Ansehen', () => focusPrSegmentOnMap(
            record.filename,
            record.startIndex,
            record.endIndex,
            `${distanceMeters / 1000} km PR`
        )));

        row.appendChild(rankCell);
        row.appendChild(timeCell);
        row.appendChild(paceCell);
        row.appendChild(speedCell);
        row.appendChild(dateCell);
        row.appendChild(trackCell);
        row.appendChild(actionCell);
        tbody.appendChild(row);
    });

    table.appendChild(thead);
    table.appendChild(tbody);
    return table;
}

function createPrProgressionTable(progression, distanceMeters) {
    const wrapper = document.createElement('div');
    wrapper.className = 'pr-progression-block';

    const title = document.createElement('h5');
    title.textContent = `${distanceMeters / 1000} km – Entwicklung`;
    wrapper.appendChild(title);

    if (!progression.length) {
        const empty = document.createElement('p');
        empty.className = 'placeholder-text';
        empty.textContent = 'Für diese Distanz gibt es noch keine zeitliche PR-Historie.';
        wrapper.appendChild(empty);
        return wrapper;
    }

    const table = document.createElement('table');
    table.className = 'compare-metric-table pr-metric-table';

    const thead = document.createElement('thead');
    const headRow = document.createElement('tr');
    ['Datum', 'Neue Bestzeit', 'Verbesserung', 'Track', 'Aktion'].forEach(label => {
        const th = document.createElement('th');
        th.textContent = label;
        headRow.appendChild(th);
    });
    thead.appendChild(headRow);

    const tbody = document.createElement('tbody');
    progression.slice(-8).reverse().forEach(record => {
        const row = document.createElement('tr');

        const dateCell = document.createElement('td');
        dateCell.textContent = formatDashboardDate(record.dateMs);

        const timeCell = document.createElement('td');
        timeCell.textContent = formatEffortTime(record.timeSeconds);

        const improvementCell = document.createElement('td');
        improvementCell.textContent = Number.isFinite(record.improvementSeconds)
            ? `-${formatEffortTime(record.improvementSeconds)}`
            : 'Erster Eintrag';
        if (Number.isFinite(record.improvementSeconds)) {
            improvementCell.className = 'compare-delta-positive';
        }

        const trackCell = document.createElement('td');
        trackCell.className = 'compare-metric-table__label';
        trackCell.textContent = record.displayName;

        const actionCell = document.createElement('td');
        actionCell.appendChild(createPrActionButton('Ansehen', () => focusPrSegmentOnMap(
            record.filename,
            record.startIndex,
            record.endIndex,
            `${distanceMeters / 1000} km Entwicklung`
        )));

        row.appendChild(dateCell);
        row.appendChild(timeCell);
        row.appendChild(improvementCell);
        row.appendChild(trackCell);
        row.appendChild(actionCell);
        tbody.appendChild(row);
    });

    table.appendChild(thead);
    table.appendChild(tbody);
    wrapper.appendChild(table);
    return wrapper;
}

function createTopClimbTable(climbs) {
    if (!climbs.length) {
        const empty = document.createElement('p');
        empty.className = 'placeholder-text';
        empty.textContent = 'Es wurden noch keine stabilen Anstiegssegmente gefunden.';
        return empty;
    }

    const table = document.createElement('table');
    table.className = 'compare-metric-table pr-metric-table';

    const thead = document.createElement('thead');
    const headRow = document.createElement('tr');
    ['Rang', 'Anstieg', 'Distanz', 'Ø Steigung', 'Max', 'Datum', 'Track', 'Aktion'].forEach(label => {
        const th = document.createElement('th');
        th.textContent = label;
        headRow.appendChild(th);
    });
    thead.appendChild(headRow);

    const tbody = document.createElement('tbody');
    climbs.forEach((climb, index) => {
        const row = document.createElement('tr');

        const rankCell = document.createElement('td');
        rankCell.textContent = String(index + 1);

        const gainCell = document.createElement('td');
        gainCell.textContent = `+${formatMetricValue(climb.gainM, 'm', 0)}`;

        const distanceCell = document.createElement('td');
        distanceCell.textContent = formatMetricValue(climb.distanceKm, 'km', 2);

        const avgCell = document.createElement('td');
        avgCell.textContent = `${formatMetricValue(climb.avgGrade, '%', 1)}`;

        const maxCell = document.createElement('td');
        maxCell.textContent = `${formatMetricValue(climb.maxGrade, '%', 1)}`;

        const dateCell = document.createElement('td');
        dateCell.textContent = formatDashboardDate(climb.dateMs);

        const trackCell = document.createElement('td');
        trackCell.className = 'compare-metric-table__label';
        trackCell.textContent = climb.displayName;

        const actionCell = document.createElement('td');
        actionCell.appendChild(createPrActionButton('Ansehen', () => focusPrSegmentOnMap(
            climb.filename,
            climb.startIndex,
            climb.endIndex,
            'Anstieg'
        )));

        row.appendChild(rankCell);
        row.appendChild(gainCell);
        row.appendChild(distanceCell);
        row.appendChild(avgCell);
        row.appendChild(maxCell);
        row.appendChild(dateCell);
        row.appendChild(trackCell);
        row.appendChild(actionCell);
        tbody.appendChild(row);
    });

    table.appendChild(thead);
    table.appendChild(tbody);
    return table;
}

function buildSegmentFavoriteKey(filename, startIndex, endIndex) {
    return equipmentDataBridgeService.buildSegmentFavoriteKey(filename, startIndex, endIndex);
}

function getSegmentFavoriteLabel(favorite, fallbackIndex = 0) {
    return equipmentDataBridgeService.getSegmentFavoriteLabel(favorite, fallbackIndex);
}

function formatSegmentPointRange(startIndex, endIndex) {
    return equipmentDataBridgeService.formatSegmentPointRange(startIndex, endIndex);
}

function getSegmentFavoriteRangeInfo(entry, favorite) {
    return equipmentDataBridgeService.getSegmentFavoriteRangeInfo(entry, favorite);
}

function createSegmentFavoritesTable(favorites, entriesByFilename) {
    if (!favorites.length) {
        const empty = document.createElement('p');
        empty.className = 'placeholder-text';
        empty.textContent = 'Noch keine Favoriten gespeichert.';
        return empty;
    }

    const table = document.createElement('table');
    table.className = 'compare-metric-table pr-metric-table';

    const thead = document.createElement('thead');
    const headRow = document.createElement('tr');
    ['Name', 'Bereich', 'Track', 'Aktion'].forEach(label => {
        const th = document.createElement('th');
        th.textContent = label;
        headRow.appendChild(th);
    });
    thead.appendChild(headRow);

    const tbody = document.createElement('tbody');
    favorites.forEach((favorite, index) => {
        const row = document.createElement('tr');
        const entry = entriesByFilename.get(favorite.filename);

        const nameCell = document.createElement('td');
        nameCell.className = 'compare-metric-table__label';
        nameCell.textContent = getSegmentFavoriteLabel(favorite, index);

        const rangeCell = document.createElement('td');
        rangeCell.textContent = getSegmentFavoriteRangeInfo(entry, favorite);

        const trackCell = document.createElement('td');
        trackCell.textContent = getTrackDisplayName(favorite.filename);

        const actionCell = document.createElement('td');

        const viewBtn = createPrActionButton('Ansehen', () => {
            focusPrSegmentOnMap(favorite.filename, favorite.startIndex, favorite.endIndex, getSegmentFavoriteLabel(favorite, index));
        });

        const editBtn = createPrActionButton('Bearbeiten', () => {
            setSegmentFavoriteDraft(currentProfile, {
                favoriteId: favorite.favoriteId,
                filename: favorite.filename,
                startIndex: favorite.startIndex,
                endIndex: favorite.endIndex,
                label: favorite.label,
                source: favorite.source
            });

            renderPrAnalysisModal().catch(error => {
                console.error(error);
                showToast('Favorit konnte nicht in den Editor geladen werden.', 'error');
            });
        });

        const deleteBtn = createPrActionButton('Löschen', async () => {
            if (!confirm('Segment-Favorit wirklich löschen?')) {
                return;
            }

            try {
                await deleteSegmentFavorite(currentProfile, favorite.favoriteId);
                const draft = getSegmentFavoriteDraft(currentProfile);
                if (Number(draft?.favoriteId) === Number(favorite.favoriteId)) {
                    clearSegmentFavoriteDraft(currentProfile);
                }

                await loadSegmentFavorites(currentProfile, { force: true });
                await renderPrAnalysisModal();
                showToast('Segment-Favorit gelöscht.', 'success');
            } catch (error) {
                console.error(error);
                showToast(error.message || 'Segment-Favorit konnte nicht gelöscht werden.', 'error');
            }
        });

        actionCell.appendChild(viewBtn);
        actionCell.appendChild(editBtn);
        actionCell.appendChild(deleteBtn);

        row.appendChild(nameCell);
        row.appendChild(rangeCell);
        row.appendChild(trackCell);
        row.appendChild(actionCell);
        tbody.appendChild(row);
    });

    table.appendChild(thead);
    table.appendChild(tbody);
    return table;
}

function createSegmentSuggestionsTable(suggestions, favoriteKeys) {
    if (!suggestions.length) {
        const empty = document.createElement('p');
        empty.className = 'placeholder-text';
        empty.textContent = 'Derzeit sind keine Vorschläge verfügbar.';
        return empty;
    }

    const table = document.createElement('table');
    table.className = 'compare-metric-table pr-metric-table';

    const thead = document.createElement('thead');
    const headRow = document.createElement('tr');
    ['Vorschlag', 'Anstieg', 'Track', 'Aktion'].forEach(label => {
        const th = document.createElement('th');
        th.textContent = label;
        headRow.appendChild(th);
    });
    thead.appendChild(headRow);

    const tbody = document.createElement('tbody');

    suggestions.forEach((climb, index) => {
        const row = document.createElement('tr');
        const suggestionKey = buildSegmentFavoriteKey(climb.filename, climb.startIndex, climb.endIndex);
        const isAlreadySaved = favoriteKeys.has(suggestionKey);

        const nameCell = document.createElement('td');
        nameCell.className = 'compare-metric-table__label';
        nameCell.textContent = `Anstieg ${index + 1}`;

        const metricsCell = document.createElement('td');
        metricsCell.textContent = `+${formatMetricValue(climb.gainM, 'm', 0)} · ${formatMetricValue(climb.distanceKm, 'km', 2)} · ${formatMetricValue(climb.avgGrade, '%', 1)}`;

        const trackCell = document.createElement('td');
        trackCell.textContent = climb.displayName;

        const actionCell = document.createElement('td');

        const viewBtn = createPrActionButton('Ansehen', () => {
            focusPrSegmentOnMap(climb.filename, climb.startIndex, climb.endIndex, 'Anstieg-Vorschlag');
        });

        const saveBtn = createPrActionButton(isAlreadySaved ? 'Gespeichert' : 'Favorisieren', async () => {
            if (isAlreadySaved) {
                return;
            }

            try {
                const payload = {
                    filename: climb.filename,
                    startIndex: climb.startIndex,
                    endIndex: climb.endIndex,
                    label: `Anstieg ${getTrackDisplayName(climb.filename)}`.slice(0, 140),
                    source: 'suggested'
                };

                await createSegmentFavorite(currentProfile, payload);
                await loadSegmentFavorites(currentProfile, { force: true });
                await renderPrAnalysisModal();
                showToast('Segment als Favorit gespeichert.', 'success');
            } catch (error) {
                console.error(error);
                showToast(error.message || 'Segment-Favorit konnte nicht gespeichert werden.', 'error');
            }
        });

        if (isAlreadySaved) {
            saveBtn.disabled = true;
        }

        actionCell.appendChild(viewBtn);
        actionCell.appendChild(saveBtn);

        row.appendChild(nameCell);
        row.appendChild(metricsCell);
        row.appendChild(trackCell);
        row.appendChild(actionCell);
        tbody.appendChild(row);
    });

    table.appendChild(thead);
    table.appendChild(tbody);
    return table;
}

function createSegmentFavoriteEditor() {
    const files = tracksByProfile[currentProfile] || [];
    const draft = getSegmentFavoriteDraft(currentProfile);
    const isEditing = Number.isFinite(Number(draft?.favoriteId));

    const card = document.createElement('form');
    card.className = 'trim-editor-card segment-favorite-editor';

    const title = document.createElement('h4');
    title.className = 'trim-editor-title';
    title.textContent = isEditing ? 'Segment-Favorit korrigieren' : 'Segment-Favorit manuell hinzufügen';

    const hint = document.createElement('p');
    hint.className = 'trim-editor-hint';
    hint.textContent = 'Start- und Endpunkt können jederzeit angepasst werden. So lassen sich Vorschläge manuell korrigieren.';

    card.appendChild(title);
    card.appendChild(hint);

    if (!files.length) {
        const empty = document.createElement('p');
        empty.className = 'placeholder-text';
        empty.textContent = 'Keine Tracks für dieses Profil verfügbar.';
        card.appendChild(empty);
        return card;
    }

    const grid = document.createElement('div');
    grid.className = 'activity-note-grid';

    const trackField = document.createElement('label');
    trackField.className = 'activity-note-field activity-note-field--full';
    trackField.textContent = 'Track';

    const trackSelect = document.createElement('select');
    trackSelect.className = 'activity-note-select';
    const selectedFilename = (typeof draft?.filename === 'string' && files.includes(draft.filename))
        ? draft.filename
        : ((getEffectiveActiveTrackName() && files.includes(getEffectiveActiveTrackName())) ? getEffectiveActiveTrackName() : files[0]);

    files.forEach(filename => {
        const option = document.createElement('option');
        option.value = filename;
        option.textContent = getTrackDisplayName(filename);
        option.selected = filename === selectedFilename;
        trackSelect.appendChild(option);
    });
    trackField.appendChild(trackSelect);

    const startField = document.createElement('label');
    startField.className = 'activity-note-field';
    startField.textContent = 'Startpunkt (Index)';

    const startInput = document.createElement('input');
    startInput.type = 'number';
    startInput.min = '0';
    startInput.step = '1';
    startInput.className = 'activity-note-select';
    startInput.value = Number.isFinite(Number(draft?.startIndex)) ? String(Math.max(0, Number(draft.startIndex))) : '0';
    startField.appendChild(startInput);

    const endField = document.createElement('label');
    endField.className = 'activity-note-field';
    endField.textContent = 'Endpunkt (Index)';

    const endInput = document.createElement('input');
    endInput.type = 'number';
    endInput.min = '1';
    endInput.step = '1';
    endInput.className = 'activity-note-select';
    endInput.value = Number.isFinite(Number(draft?.endIndex)) ? String(Math.max(1, Number(draft.endIndex))) : '1';
    endField.appendChild(endInput);

    const labelField = document.createElement('label');
    labelField.className = 'activity-note-field activity-note-field--full';
    labelField.textContent = 'Bezeichnung (optional)';

    const labelInput = document.createElement('input');
    labelInput.type = 'text';
    labelInput.maxLength = 140;
    labelInput.className = 'activity-note-select';
    labelInput.placeholder = 'z. B. Lieblingsanstieg Marienberg';
    labelInput.value = typeof draft?.label === 'string' ? draft.label : '';
    labelField.appendChild(labelInput);

    grid.appendChild(trackField);
    grid.appendChild(startField);
    grid.appendChild(endField);
    grid.appendChild(labelField);
    card.appendChild(grid);

    const actions = document.createElement('div');
    actions.className = 'trim-editor-actions';

    const saveBtn = document.createElement('button');
    saveBtn.type = 'submit';
    saveBtn.className = 'action-btn-secondary trim-action-btn trim-action-btn--primary';
    saveBtn.textContent = isEditing ? 'Favorit aktualisieren' : 'Favorit speichern';

    const cancelBtn = document.createElement('button');
    cancelBtn.type = 'button';
    cancelBtn.className = 'action-btn-secondary trim-action-btn';
    cancelBtn.textContent = 'Eingabe zurücksetzen';
    cancelBtn.onclick = () => {
        clearSegmentFavoriteDraft(currentProfile);
        renderPrAnalysisModal().catch(error => {
            console.error(error);
            showToast('Editor konnte nicht zurückgesetzt werden.', 'error');
        });
    };

    actions.appendChild(saveBtn);
    actions.appendChild(cancelBtn);
    card.appendChild(actions);

    card.onsubmit = async (event) => {
        event.preventDefault();

        const payload = {
            filename: trackSelect.value,
            startIndex: Number.parseInt(startInput.value, 10),
            endIndex: Number.parseInt(endInput.value, 10),
            label: String(labelInput.value || '').trim().slice(0, 140),
            source: draft?.source === 'suggested' ? 'suggested' : 'manual'
        };

        if (!payload.filename) {
            showToast('Bitte einen Track auswählen.', 'warning');
            return;
        }

        if (!Number.isInteger(payload.startIndex) || payload.startIndex < 0) {
            showToast('Startpunkt ist ungültig.', 'warning');
            return;
        }

        if (!Number.isInteger(payload.endIndex) || payload.endIndex <= payload.startIndex) {
            showToast('Endpunkt muss größer als Startpunkt sein.', 'warning');
            return;
        }

        saveBtn.disabled = true;

        try {
            if (isEditing) {
                await updateSegmentFavorite(currentProfile, draft.favoriteId, payload);
            } else {
                await createSegmentFavorite(currentProfile, payload);
            }

            clearSegmentFavoriteDraft(currentProfile);
            await loadSegmentFavorites(currentProfile, { force: true });
            await renderPrAnalysisModal();
            showToast(isEditing ? 'Segment-Favorit aktualisiert.' : 'Segment-Favorit gespeichert.', 'success');
        } catch (error) {
            console.error(error);
            showToast(error.message || 'Segment-Favorit konnte nicht gespeichert werden.', 'error');
        } finally {
            saveBtn.disabled = false;
        }
    };

    return card;
}

function createSegmentFavoritesSection(entries, favorites) {
    const section = document.createElement('section');
    section.className = 'pr-section';

    const title = document.createElement('h3');
    title.className = 'ranking-title';
    title.textContent = 'Segment-Favoriten';

    const intro = document.createElement('p');
    intro.className = 'trim-editor-hint';
    intro.textContent = 'Vorschläge basieren auf deinen besten Anstiegen. Favoriten können manuell ergänzt und korrigiert werden.';

    section.appendChild(title);
    section.appendChild(intro);
    section.appendChild(createSegmentFavoriteEditor());

    const entriesByFilename = new Map(entries.map(entry => [entry.filename, entry]));
    const favoritesTitle = document.createElement('h5');
    favoritesTitle.className = 'segment-favorite-subtitle';
    favoritesTitle.textContent = 'Gespeicherte Favoriten';
    section.appendChild(favoritesTitle);
    section.appendChild(createSegmentFavoritesTable(favorites, entriesByFilename));

    const suggestions = buildTopClimbRanking(entries).slice(0, SEGMENT_FAVORITE_SUGGESTION_LIMIT);
    const favoriteKeys = new Set(
        favorites.map(favorite => buildSegmentFavoriteKey(favorite.filename, favorite.startIndex, favorite.endIndex))
    );

    const suggestionsTitle = document.createElement('h5');
    suggestionsTitle.className = 'segment-favorite-subtitle';
    suggestionsTitle.textContent = 'Vorgeschlagene Segmente';
    section.appendChild(suggestionsTitle);
    section.appendChild(createSegmentSuggestionsTable(suggestions, favoriteKeys));

    return section;
}

async function renderPrAnalysisModal() {
    return prAnalysisBridgeService.renderPrAnalysisModal();
}

function closeFloatingPanel() {
    return panelUiBridgeService.closeFloatingPanel();
}

function closeElevationPanel() {
    return panelUiBridgeService.closeElevationPanel();
}

function initFloatingPanelControls() {
    return panelUiBridgeService.initFloatingPanelControls();
}

function scheduleChartResize() {
    return panelUiBridgeService.scheduleChartResize();
}

function toggleDeleteAllButton(show) {
    return appNavigationBridgeService.toggleDeleteAllButton(show);
}

function showLoadingOverlay(show) {
    return panelUiBridgeService.showLoadingOverlay(show);
}

function getSpeedThresholdsForProfile(profile = currentProfile) {
    return speedThresholdService.getSpeedThresholdsForProfile(profile);
}

function updateSpeedLabels() {
    return analysisThresholdPresetBridgeService.updateSpeedLabels();
}

function updateElevationLabels() {
    return analysisThresholdPresetBridgeService.updateElevationLabels();
}

function initElevationPanel() {
    return panelUiBridgeService.initElevationPanel();
}

function initChartTabs() {
    return panelUiBridgeService.initChartTabs();
}

function refreshChartContainers() {
    return panelUiBridgeService.refreshChartContainers();
}

function initHeatmapToggle() {
    return heatmapLayerBridgeService.initHeatmapToggle();
}

function initHeatmapScopeToggle() {
    return heatmapLayerBridgeService.initHeatmapScopeToggle();
}

function initOverlayToggle() {
    return heatmapLayerBridgeService.initOverlayToggle();
}

function refreshOverlayVisibility() {
    return heatmapLayerBridgeService.refreshOverlayVisibility();
}

function initPlaybackUI() {
    return playbackControlBridgeService.initPlaybackUI();
}

function updatePlaybackControlState() {
    return playbackControlBridgeService.updatePlaybackControlState();
}

function setPlaybackIndex(nextIndex) {
    return playbackControlBridgeService.setPlaybackIndex(nextIndex);
}

function stepPlayback(stepDelta) {
    return playbackControlBridgeService.stepPlayback(stepDelta);
}

function togglePlayback() {
    return playbackControlBridgeService.togglePlayback();
}

function pausePlayback() {
    return playbackControlBridgeService.pausePlayback();
}

function startPlaybackLoop() {
    return playbackControlBridgeService.startPlaybackLoop();
}

function stopPlayback() {
    return playbackControlBridgeService.stopPlayback();
}

function ensureToastContainer() {
    return panelUiBridgeService.ensureToastContainer();
}

function dismissToast(toast, delayMs = 200) {
    return panelUiBridgeService.dismissToast(toast, delayMs);
}

function showToast(message, type = 'info') {
    return panelUiBridgeService.showToast(message, type);
}

function updateChartTabsVisibility(hasHR, hasPower) {
    return panelUiBridgeService.updateChartTabsVisibility(hasHR, hasPower);
}

function getHeatmapSourceEntries() {
    return heatmapLayerBridgeService.getHeatmapSourceEntries();
}

function getHeatmapPointsForEntry(entry) {
    return heatmapLayerBridgeService.getHeatmapPointsForEntry(entry);
}

function getHeatmapPointTimestampMs(point) {
    return heatmapLayerBridgeService.getHeatmapPointTimestampMs(point);
}

function getHeatmapSeason(dateValue) {
    return heatmapLayerBridgeService.getHeatmapSeason(dateValue);
}

function getHeatmapWeekdayToken(dateValue) {
    return heatmapLayerBridgeService.getHeatmapWeekdayToken(dateValue);
}

function isHeatmapPointMatchingTimeFilters(point) {
    return heatmapLayerBridgeService.isHeatmapPointMatchingTimeFilters(point);
}

function initHeatmapTimeFilters() {
    return heatmapLayerBridgeService.initHeatmapTimeFilters();
}

function sampleTrackPointsForHeatmap(points) {
    return heatmapLayerBridgeService.sampleTrackPointsForHeatmap(points);
}

function clearHeatmapLayers() {
    return heatmapLayerBridgeService.clearHeatmapLayers();
}

function parseColorToRgb(colorValue) {
    return heatmapLayerBridgeService.parseColorToRgb(colorValue);
}

function mixRgb(fromRgb, toRgb, ratio) {
    return heatmapLayerBridgeService.mixRgb(fromRgb, toRgb, ratio);
}

function rgbToCss(rgb, alpha = 1) {
    return heatmapLayerBridgeService.rgbToCss(rgb, alpha);
}

function getProfileBaseColor(profile) {
    return heatmapLayerBridgeService.getProfileBaseColor(profile);
}

function buildHeatmapGradientForProfile(profile) {
    return heatmapLayerBridgeService.buildHeatmapGradientForProfile(profile);
}

function buildHeatmapBucketsByProfile(sourceEntries) {
    return heatmapLayerBridgeService.buildHeatmapBucketsByProfile(sourceEntries);
}

function updateHeatmap() {
    return heatmapLayerBridgeService.updateHeatmap();
}

function getHealthDashboardViewApi() {
    return initializationBridgeService.getHealthDashboardViewApi();
}

async function renderHealthView() {
    return initializationBridgeService.renderHealthView();
}

async function handleHealthUpload(file) {
    return initializationBridgeService.handleHealthUpload(file);
}

async function refreshHealthDashboard() {
    return initializationBridgeService.refreshHealthDashboard();
}

function renderHealthKPIs(stats) {
    return initializationBridgeService.renderHealthKPIs(stats);
}

function renderHealthMainChart(data) {
    return initializationBridgeService.renderHealthMainChart(data);
}

async function renderHealthWeekdayChart() {
    return initializationBridgeService.renderHealthWeekdayChart();
}
