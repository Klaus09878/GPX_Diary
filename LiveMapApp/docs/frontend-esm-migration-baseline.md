# Frontend ESM Migration Baseline

## Scope of wave 1
- Keep existing legacy script chain fully active.
- Add a module bootstrap entrypoint for incremental migration.
- Add a compatibility bridge for current global handler assumptions.

## Current runtime constraints
- Frontend currently depends on global `window.create...View` factories loaded via script tags.
- `app.js` orchestrates startup and owns mutable global state.
- Inline/global handler assumptions exist in UI markup (`setActiveView`, `toggleFloatingPanel`, `closeElevationPanel`).

## Implemented in wave 1
- Added module entrypoint in `public/index.html`:
  - `<script type="module" src="js/app/bootstrap.js"></script>`
- Added `public/js/app/bootstrap.js` as safe startup bridge initializer.
- Added `public/js/app/bridge/legacyWindowBridge.js` to verify required globals and expose migration metadata.

## Implemented in wave 2 (first slice)
- Added `public/js/app/registry/viewApiRegistry.js` as an ESM registry for view API resolution with cache keys and factory names.
- Bootstrap now initializes `window.__esmViewApiRegistry` in `public/js/app/bootstrap.js`.
- `app.js` now resolves these getters via ESM registry first, then falls back to legacy inline creation:
  - `getNavigationViewApi`
  - `getViewStateViewApi`
  - `getHomeTrackNavigationViewApi`
  - `getHomeViewApi`

## Implemented in wave 2 (second slice)
- Added shared helper `resolveViewApi(...)` in `public/app.js` to unify registry-first resolution plus legacy fallback.
- Migrated additional getters to use `resolveViewApi(...)`:
  - `getActivityNoteViewApi`
  - `getEquipmentTrackViewApi`
  - `getStartupOverlayViewApi`
  - `getProfileSwitcherViewApi`
  - `getMapInitViewApi`
  - `getAnalysisModeViewApi`
  - `getView3DToggleViewApi`
  - `getGpxParserViewApi`

## Implemented in wave 2 (third slice)
- Migrated remaining utility/support getters in `app.js` to `resolveViewApi(...)`:
  - `getTrackPointFallbackViewApi`
  - `getTrackPointLoadViewApi`
  - `getMapLayerCleanupViewApi`
  - `getDisplayFormatViewApi`
  - `getWeatherStateViewApi`
  - `getWeatherRequestPayloadViewApi`
  - `getWeatherLoadViewApi`
  - `getWeatherCardViewApi`
  - `getStatsAggregateViewApi`
  - `getHomeQuickActionsViewApi`
  - `getDeleteAllViewApi`
  - `getUploadViewApi`

## Implemented in wave 3 (feature-folder start: home)
- Added new feature folder `public/js/views/home/`.
- Migrated script loading in `public/index.html` to the new home paths:
  - `js/views/home/homeTrackNavigationView.js`
  - `js/views/home/homeView.js`
  - `js/views/home/homeQuickActionsView.js`
- No behavior changes in home logic; migration is path- and structure-focused.

## Implemented in wave 3 (feature-folder: weather)
- Added new feature folder `public/js/views/weather/`.
- Migrated script loading in `public/index.html` to new weather paths:
  - `js/views/weather/weatherStateView.js`
  - `js/views/weather/weatherRequestPayloadView.js`
  - `js/views/weather/weatherLoadView.js`
  - `js/views/weather/weatherCardView.js`
- No behavior changes in weather logic; migration is path- and structure-focused.

## Implemented in wave 3 (feature-folder: trim)
- Added new feature folder `public/js/views/trim/`.
- Migrated script loading in `public/index.html` to new trim paths:
  - `js/views/trim/trimModeStateView.js`
  - `js/views/trim/trimHandleIconView.js`
  - `js/views/trim/trimSummaryView.js`
  - `js/views/trim/trimPreviewView.js`
  - `js/views/trim/trimInteractionView.js`
  - `js/views/trim/trimLifecycleView.js`
  - `js/views/trim/trimBeginView.js`
  - `js/views/trim/trimCommitView.js`
- No behavior changes in trim logic; migration is path- and structure-focused.

## Implemented in wave 3 (feature-folder: outlier)
- Added new feature folder `public/js/views/outlier/`.
- Migrated script loading in `public/index.html` to new outlier paths:
  - `js/views/outlier/outlierRulesView.js`
  - `js/views/outlier/outlierLabelView.js`
  - `js/views/outlier/outlierSegmentsView.js`
  - `js/views/outlier/outlierCandidateAssemblyView.js`
  - `js/views/outlier/outlierDetectionView.js`
  - `js/views/outlier/outlierHighlightView.js`
  - `js/views/outlier/outlierModeView.js`
  - `js/views/outlier/outlierCleanupView.js`
- No behavior changes in outlier logic; migration is path- and structure-focused.

## Implemented in wave 3 (feature-folder: comparison)
- Added new feature folder `public/js/views/comparison/`.
- Migrated script loading in `public/index.html` to new comparison paths:
  - `js/views/comparison/comparisonSelectionView.js`
  - `js/views/comparison/comparisonSummaryView.js`
  - `js/views/comparison/comparisonView.js`
- No behavior changes in comparison logic; migration is path- and structure-focused.

## Implemented in wave 4 (cleanup)
- Removed obsolete duplicate files from `public/js/views/` root for already migrated features:
  - `home`, `weather`, `trim`, `outlier`, `comparison`
- Active script loading remains on feature-folder paths in `public/index.html`.

## Implemented in wave 4 (feature-folder: navigation)
- Added new feature folder `public/js/views/navigation/`.
- Migrated script loading in `public/index.html` to new navigation paths:
  - `js/views/navigation/navigationView.js`
  - `js/views/navigation/viewStateView.js`
  - `js/views/navigation/modalAccessibilityView.js`
- Removed old root duplicates:
  - `public/js/views/navigationView.js`
  - `public/js/views/viewStateView.js`
  - `public/js/views/modalAccessibilityView.js`
- No behavior changes in navigation logic; migration is path- and structure-focused.

## Implemented in wave 4 (feature-folder: map)
- Added new feature folder `public/js/views/map/`.
- Migrated script loading in `public/index.html` to new map paths:
  - `js/views/map/mapInitView.js`
  - `js/views/map/mapLayerCleanupView.js`
  - `js/views/map/trackVisualStateView.js`
- Removed old root duplicates:
  - `public/js/views/mapInitView.js`
  - `public/js/views/mapLayerCleanupView.js`
  - `public/js/views/trackVisualStateView.js`
- No behavior changes in map logic; migration is path- and structure-focused.

## Implemented in wave 4 (feature-folder: analysis)
- Added new feature folder `public/js/views/analysis/`.
- Migrated script loading in `public/index.html` to new analysis paths:
  - `js/views/analysis/analysisModeView.js`
  - `js/views/analysis/view3DToggleView.js`
  - `js/views/analysis/analysisDistributionView.js`
  - `js/views/analysis/analysisThresholdControlsView.js`
- Removed old root duplicates:
  - `public/js/views/analysisModeView.js`
  - `public/js/views/analysisDistributionView.js`
  - `public/js/views/analysisThresholdControlsView.js`
  - `public/js/views/view3DToggleView.js`
- No behavior changes in analysis logic; migration is path- and structure-focused.

## Implemented in wave 5 (app.js cleanup)
- Reduced duplicated getter boilerplate in `public/app.js` by routing additional view APIs through `resolveViewApi(...)`.
- Consolidated these getters to the shared resolver path:
  - `getComparisonViewApi`
  - `getNavigationViewApi`
  - `getViewStateViewApi`
  - `getHomeTrackNavigationViewApi`
  - `getHomeViewApi`
- No behavioral changes intended; cleanup focuses on consistency and maintainability.

## Implemented in wave 6 (app.js cleanup)
- Continued resolver standardization in `public/app.js` by migrating remaining legacy-style getters in the comparison/filter/equipment area to `resolveViewApi(...)`.
- Consolidated these getters to the shared resolver path:
  - `getComparisonSelectionViewApi`
  - `getComparisonSummaryViewApi`
  - `getPrAnalysisViewApi`
  - `getEquipmentViewApi`
  - `getFilterSearchViewApi`
- No behavioral changes intended; cleanup focuses on consistent initialization and lower duplication.

## Implemented in wave 7 (app.js cleanup)
- Completed resolver standardization for the remaining legacy-style getter cluster in `public/app.js`.
- Consolidated these getters to the shared resolver path:
  - `getModalAccessibilityViewApi`
  - `getStatisticsViewApi`
  - `getAnalysesViewApi`
  - `getAnalysisDistributionViewApi`
  - `getAnalysisThresholdControlsViewApi`
  - `getTrimSummaryViewApi`
  - `getTrimModeStateViewApi`
  - `getTrimHandleIconViewApi`
  - `getTrimPreviewViewApi`
  - `getTrackVisualStateViewApi`
  - `getTrimInteractionViewApi`
  - `getTrimLifecycleViewApi`
  - `getTrimBeginViewApi`
  - `getTrimCommitViewApi`
  - `getOutlierRulesViewApi`
  - `getOutlierLabelViewApi`
  - `getOutlierSegmentsViewApi`
  - `getOutlierCandidateAssemblyViewApi`
  - `getOutlierDetectionViewApi`
  - `getOutlierHighlightViewApi`
  - `getOutlierModeViewApi`
  - `getOutlierCleanupViewApi`
  - `getHealthDashboardViewApi`
- No behavioral changes intended; cleanup focuses on one consistent registry-first + fallback creation path.

## Implemented in wave 8 (feature-folder migration)
- Migrated remaining flat view files from `public/js/views/` root into feature folders and updated script paths in `public/index.html`.
- New paths by feature:
  - `analysis/`: `analysesView.js`, `prAnalysisView.js`
  - `statistics/`: `statisticsView.js`, `statsAggregateView.js`
  - `health/`: `healthDashboardView.js`
  - `home/`: `activityNoteView.js`
  - `equipment/`: `equipmentTrackView.js`, `equipmentView.js`
  - `navigation/`: `profileSwitcherView.js`, `filterSearchView.js`
  - `startup/`: `startupOverlayView.js`
  - `data/`: `gpxParserView.js`, `trackPointFallbackView.js`, `trackPointLoadView.js`
  - `shared/`: `displayFormatView.js`
  - `upload/`: `deleteAllView.js`, `uploadView.js`
- No behavioral changes intended; migration is path- and structure-focused.

## Implemented in wave 9 (app.js service extraction)
- Added new service module `public/js/app/services/activityDataService.js` to host activity-note, segment-favorites, and equipment API/cache logic.
- `public/app.js` now delegates the following function group to the service instead of hosting full inline implementations:
  - activity note state + API (`getActivityNoteSummary`, `loadActivityNoteSummaries`, `fetchActivityNote`, `saveActivityNote`, ...)
  - segment favorites state + API (`getSegmentFavorites`, `loadSegmentFavorites`, `create/update/deleteSegmentFavorite`, ...)
  - equipment state + API (`getEquipmentItems`, `loadEquipment`, `loadEquipmentAssignments`, `create/update/deleteEquipment`, `saveTrackEquipmentAssignment`, ...)
- Added script loading for the service in `public/index.html` before `app.js`.
- No behavioral changes intended; extraction focuses on reducing `app.js` size and improving service-layer separation.

## Implemented in wave 10 (app.js utils extraction)
- Added new utility service module `public/js/app/services/formatUtilsService.js` for pure formatting/percentage helpers.
- `public/app.js` now delegates these helper functions to the utility service:
  - `formatNumericInputValue`
  - `formatThresholdLabel`
  - `formatDistanceLabel`
  - `toPercentShare`
  - `formatDistanceKm`
  - `formatDashboardNumber`
  - `formatDashboardDate`
- Added script loading for the utility service in `public/index.html` before `app.js`.
- No behavioral changes intended; extraction focuses on shrinking `app.js` and isolating side-effect-free utility logic.

## Implemented in wave 11 (app.js PR-alert extraction)
- Added new service module `public/js/app/services/prAlertsService.js` for personal-record alert logic.
- `public/app.js` now delegates the PR-alert helper cluster to the service:
  - `buildPersonalRecordSnapshot`
  - `createPersonalRecordAlertMessages`
  - `runPersonalRecordAlertCheck`
- Added script loading for the PR-alert service in `public/index.html` before `app.js`.
- No behavioral changes intended; extraction focuses on reducing `app.js` orchestration density while keeping alert behavior unchanged.

## Implemented in wave 12 (app.js analysis-threshold preset extraction)
- Added new service module `public/js/app/services/analysisThresholdPresetService.js` for analysis-threshold preset and matching helpers.
- `public/app.js` now delegates the threshold helper cluster to the service:
  - `getDefaultAnalysisThresholds`
  - `getAnalysisSpeedPresetDelta`
  - `getAnalysisThresholdPreset`
  - `areAnalysisThresholdValuesEqual`
  - `areAnalysisThresholdsEqual`
  - `getAnalysisThresholdPresetKey`
  - `getAnalysisThresholdPresetLabel`
  - `getAnalysisThresholdPresetIcon`
  - `getAnalysisThresholdPresetStateMarkup`
- Added script loading for the analysis-threshold preset service in `public/index.html` before `app.js`.
- No behavioral changes intended; extraction focuses on shrinking `app.js` while preserving threshold-preset behavior.

## Implemented in wave 13 (app.js equipment-maintenance extraction)
- Added new service module `public/js/app/services/equipmentMaintenanceService.js` for equipment usage and service-reminder helpers.
- `public/app.js` now delegates the following helper cluster to the service:
  - `getTrackDistanceKm`
  - `buildEquipmentUsageMap`
  - `getEquipmentMaintenanceStatus`
  - `getEquipmentStatusClass`
  - `getEquipmentReminderSummary`
- Added script loading for the equipment-maintenance service in `public/index.html` before `app.js`.
- No behavioral changes intended; extraction focuses on reducing `app.js` size while preserving reminder/status behavior.

## Implemented in wave 14 (app.js persisted-selection extraction)
- Added new service module `public/js/app/services/persistedSelectionService.js` for persisted UI-control + track-selection restoration helpers.
- `public/app.js` now delegates the following helper cluster to the service:
  - `applyPersistedUiStateToControls`
  - `getPersistedTrackSelection`
  - `setPersistedTrackSelection`
  - `restorePersistedTrackSelection`
- Added script loading for the persisted-selection service in `public/index.html` before `app.js`.
- No behavioral changes intended; extraction focuses on shrinking `app.js` while preserving persisted-selection behavior.

## Implemented in wave 15 (app.js map-viewport safety extraction)
- Added new service module `public/js/app/services/mapViewportSafetyService.js` for map viewport readiness and safe map focus helpers.
- `public/app.js` now delegates the following helper cluster to the service:
  - `isMapViewportReady`
  - `isMapViewActive`
  - `canRenderMapOverlays`
  - `ensureMapViewportReady`
  - `isLeafletBoundsFinite`
  - `safeSetView`
  - `safeFocusBounds`
  - `safeFitBounds`
- Added script loading for the map-viewport safety service in `public/index.html` before `app.js`.
- No behavioral changes intended; extraction focuses on reducing `app.js` orchestration density while preserving safety checks.

## Implemented in wave 16 (app.js map-coordinate validation extraction)
- Added new service module `public/js/app/services/mapCoordinateValidationService.js` for coordinate and trackpoint validation helpers.
- `public/app.js` now delegates the following helper cluster to the service:
  - `isValidLatitude`
  - `isValidLongitude`
  - `isValidMapCoordinatePair`
  - `isFiniteTrackPoint`
  - `normalizeTrackPoints`
- Added script loading for the map-coordinate validation service in `public/index.html` before `app.js`.
- No behavioral changes intended; extraction focuses on shrinking `app.js` and isolating foundational validation helpers.

## Implemented in wave 17 (app.js analysis-normalization extraction)
- Added new service module `public/js/app/services/analysisNormalizationService.js` for threshold clamping and normalization helpers.
- `public/app.js` now delegates the following helper cluster to the service:
  - `clampNumber`
  - `normalizeAnalysisThresholdEntry`
  - `normalizeAnalysisThresholdsByProfile`
  - `normalizeHeatmapTimeFilters`
- Initialized the analysis-normalization service before global state initialization so existing early normalization calls remain unchanged in behavior.
- Added script loading for the analysis-normalization service in `public/index.html` before `app.js`.
- No behavioral changes intended; extraction focuses on shrinking `app.js` while preserving persisted-state normalization behavior.

## Implemented in wave 18 (app.js speed-threshold extraction)
- Added new service module `public/js/app/services/speedThresholdService.js` for profile speed thresholds and speed/elevation label updates.
- `public/app.js` now delegates the following helper cluster to the service:
  - `getSpeedThresholdsForProfile`
  - `updateSpeedLabels`
  - `updateElevationLabels`
- Added script loading for the speed-threshold service in `public/index.html` before `app.js`.
- No behavioral changes intended; extraction focuses on shrinking `app.js` while preserving threshold and label behavior.

## Implemented in wave 19 (app.js chart-panel extraction)
- Added new service module `public/js/app/services/chartPanelService.js` for chart-panel resize and tab-visibility logic.
- `public/app.js` now delegates the following helper cluster to the service:
  - `scheduleChartResize`
  - `initElevationPanel`
  - `initChartTabs`
  - `refreshChartContainers`
- Added script loading for the chart-panel service in `public/index.html` before `app.js`.
- No behavioral changes intended; extraction focuses on reducing `app.js` size while preserving chart-tab behavior.

## Implemented in wave 20 (app.js overlay-heatmap toggle extraction)
- Added new service module `public/js/app/services/overlayHeatmapToggleService.js` for overlay/heatmap toggle and visibility-sync helpers.
- `public/app.js` now delegates the following helper cluster to the service:
  - `initHeatmapToggle`
  - `initHeatmapScopeToggle`
  - `initOverlayToggle`
  - `refreshOverlayVisibility`
- Added script loading for the overlay-heatmap toggle service in `public/index.html` before `app.js`.
- No behavioral changes intended; extraction focuses on shrinking `app.js` while preserving toggle and visibility behavior.

## Implemented in wave 21 (app.js playback-control extraction)
- Added new service module `public/js/app/services/playbackControlService.js` for playback keyboard handling and playback lifecycle controls.
- `public/app.js` now delegates the following helper cluster to the service:
  - `initPlaybackUI`
  - `updatePlaybackControlState`
  - `setPlaybackIndex`
  - `stepPlayback`
  - `togglePlayback`
  - `pausePlayback`
  - `startPlaybackLoop`
  - `stopPlayback`
- Added script loading for the playback-control service in `public/index.html` before `app.js`.
- No behavioral changes intended; extraction focuses on reducing `app.js` size while preserving playback behavior.

## Implemented in wave 22 (app.js toast-notification extraction)
- Added new service module `public/js/app/services/toastNotificationService.js` for toast container, dismissal, and notification rendering helpers.
- `public/app.js` now delegates the following helper cluster to the service:
  - `ensureToastContainer`
  - `dismissToast`
  - `showToast`
- Added script loading for the toast-notification service in `public/index.html` before `app.js`.
- No behavioral changes intended; extraction focuses on shrinking `app.js` while preserving toast UX and sequencing.

## Implemented in wave 23 (app.js heatmap-time-filter extraction)
- Added new service module `public/js/app/services/heatmapTimeFilterService.js` for heatmap timestamp derivation and time-filter matching helpers.
- `public/app.js` now delegates the following helper cluster to the service:
  - `getHeatmapPointTimestampMs`
  - `getHeatmapSeason`
  - `getHeatmapWeekdayToken`
  - `isHeatmapPointMatchingTimeFilters`
  - `initHeatmapTimeFilters`
- Added script loading for the heatmap-time-filter service in `public/index.html` before `app.js`.
- No behavioral changes intended; extraction focuses on reducing `app.js` size while preserving heatmap time-filter behavior.

## Implemented in wave 24 (app.js heatmap-gradient extraction)
- Added new service module `public/js/app/services/heatmapGradientService.js` for heatmap color parsing, mixing, and gradient generation helpers.
- `public/app.js` now delegates the following helper cluster to the service:
  - `parseColorToRgb`
  - `mixRgb`
  - `rgbToCss`
  - `getProfileBaseColor`
  - `buildHeatmapGradientForProfile`
- Added script loading for the heatmap-gradient service in `public/index.html` before `app.js`.
- No behavioral changes intended; extraction focuses on shrinking `app.js` while preserving heatmap gradient behavior.

## Implemented in wave 25 (app.js heatmap-layer extraction)
- Added new service module `public/js/app/services/heatmapLayerService.js` for heatmap source selection, sampling, bucket building, layer cleanup, and layer rendering.
- `public/app.js` now delegates the following helper cluster to the service:
  - `getHeatmapSourceEntries`
  - `getHeatmapPointsForEntry`
  - `sampleTrackPointsForHeatmap`
  - `clearHeatmapLayers`
  - `buildHeatmapBucketsByProfile`
  - `updateHeatmap`
- Added script loading for the heatmap-layer service in `public/index.html` before `app.js`.
- No behavioral changes intended; extraction focuses on reducing `app.js` size while preserving heatmap rendering behavior.

## Implemented in wave 26 (app.js panel-ui extraction)
- Added new service module `public/js/app/services/panelUiService.js` for floating/elevation panel toggles and chart-tab visibility adjustments.
- `public/app.js` now delegates the following helper cluster to the service:
  - `closeFloatingPanel`
  - `toggleFloatingPanel`
  - `closeElevationPanel`
  - `updateChartTabsVisibility`
- Added script loading for the panel-UI service in `public/index.html` before `app.js`.
- No behavioral changes intended; extraction focuses on shrinking `app.js` while preserving panel and chart-tab UX behavior.

## Implemented in wave 27 (app.js loading-overlay extraction)
- Added new service module `public/js/app/services/loadingOverlayService.js` for app loading overlay rendering/toggle logic.
- `public/app.js` now delegates `showLoadingOverlay` to the service.
- Added script loading for the loading-overlay service in `public/index.html` before `app.js`.
- No behavioral changes intended; extraction focuses on incremental `app.js` reduction while preserving loading UX behavior.

## Implemented in wave 28 (app.js health-dashboard bridge extraction)
- Added new service module `public/js/app/services/healthDashboardBridgeService.js` for health-dashboard view API resolution and wrapper calls.
- `public/app.js` now delegates the following helper cluster to the service:
  - `getHealthDashboardViewApi`
  - `renderHealthView`
  - `handleHealthUpload`
  - `refreshHealthDashboard`
  - `renderHealthKPIs`
  - `renderHealthMainChart`
  - `renderHealthWeekdayChart`
- Added script loading for the health-dashboard bridge service in `public/index.html` before `app.js`.
- No behavioral changes intended; extraction focuses on shrinking `app.js` while preserving health dashboard behavior.

## Implemented in wave 29 (app.js playback-chart-sync extraction)
- Added new service module `public/js/app/services/playbackChartSyncService.js` for playback timeline rebuilding, timeline-index lookup, chart sync updates, and chart-sync reset logic.
- `public/app.js` now delegates the following helper cluster to the service:
  - `rebuildPlaybackTimeline`
  - `getPlaybackIndexForVirtualTime`
  - `syncAllCharts`
  - `clearChartSync`
- Added script loading for the playback-chart-sync service in `public/index.html` before `app.js`.
- No behavioral changes intended; extraction focuses on reducing `app.js` size while preserving playback marker/chart sync behavior.

## Implemented in wave 30 (app.js playback-timeline extraction)
- Added new service module `public/js/app/services/playbackTimelineService.js` for playback speed fallback and timeline-building helpers.
- `public/app.js` now delegates the following helper cluster to the service:
  - `resolvePointSpeedKmh`
  - `buildPlaybackTimeline`
- Added script loading for the playback-timeline service in `public/index.html` before `app.js`.
- No behavioral changes intended; extraction focuses on shrinking `app.js` while preserving playback timing behavior.

## Implemented in wave 31 (app.js segment-favorite helper extraction)
- Added new service module `public/js/app/services/segmentFavoriteHelperService.js` for segment-favorite key, label, range, and range-info helper logic.
- `public/app.js` now delegates the following helper cluster to the service:
  - `buildSegmentFavoriteKey`
  - `getSegmentFavoriteLabel`
  - `formatSegmentPointRange`
  - `getSegmentFavoriteRangeInfo`
- Added script loading for the segment-favorite helper service in `public/index.html` before `app.js`.
- No behavioral changes intended; extraction focuses on reducing `app.js` size while preserving segment-favorite table behavior.

## Implemented in wave 32 (app.js chart-build extraction)
- Added new service module `public/js/app/services/chartBuildService.js` for chart panel rendering and chart option generation.
- `public/app.js` now delegates the following helper cluster to the service:
  - `showCharts`
  - `buildElevationChart`
  - `buildSpeedChart`
  - `buildHRChart`
  - `buildPowerChart`
  - `getCommonChartOptions`
- Added script loading for the chart-build service in `public/index.html` before `app.js`.
- No behavioral changes intended; extraction focuses on reducing `app.js` size while preserving chart rendering behavior.

## Implemented in wave 33 (app.js track-cache helper extraction)
- Added new service module `public/js/app/services/trackCacheService.js` for cache-key generation and cached-track read/write/remove helpers.
- `public/app.js` now delegates the following helper cluster to the service:
  - `getTrackCacheKey`
  - `getCachedTrack`
  - `setCachedTrack`
  - `removeCachedTrack`
- Added script loading for the track-cache helper service in `public/index.html` before `app.js`.
- No behavioral changes intended; extraction focuses on reducing `app.js` size while preserving cache behavior.

## Implemented in wave 34 (app.js startup-overlay bridge extraction)
- Added new service module `public/js/app/services/startupOverlayBridgeService.js` for startup-overlay progress and startup-experience wrapper helpers.
- `public/app.js` now delegates the following helper cluster to the service:
  - `updateStartupProgress`
  - `beginStartupExperience`
- Added script loading for the startup-overlay bridge service in `public/index.html` before `app.js`.
- No behavioral changes intended; extraction focuses on incremental `app.js` reduction while preserving startup UX behavior.

## Implemented in wave 35 (app.js chart-plugin extraction)
- Added new service module `public/js/app/services/chartPluginService.js` for Chart.js `syncLine` plugin registration.
- `public/app.js` now delegates the chart plugin registration step to the service:
  - `registerSyncLinePlugin`
- Added script loading for the chart-plugin service in `public/index.html` before `app.js`.
- No behavioral changes intended; extraction focuses on reducing `app.js` inline chart-plugin setup while preserving chart sync-line rendering.

## Implemented in wave 36 (app.js html-escape utility extraction)
- Added new service module `public/js/app/services/htmlEscapeService.js` for HTML entity escaping helper logic.
- `public/app.js` now delegates the following helper to the service:
  - `escapeHtml`
- Added script loading for the html-escape service in `public/index.html` before `app.js`.
- No behavioral changes intended; extraction focuses on reducing `app.js` utility inline logic while preserving safe text rendering behavior.

## Implemented in wave 37 (app.js display-format bridge extraction)
- Added new service module `public/js/app/services/displayFormatBridgeService.js` for display-format view-API bridge helpers.
- `public/app.js` now delegates the following wrapper cluster to the service:
  - `getCompareAccentColor`
  - `formatDurationMinutes`
  - `formatPace`
  - `formatMetricValue`
  - `formatWeatherNumber`
  - `describeWeatherCode`
  - `formatWindDirection`
- Added script loading for the display-format bridge service in `public/index.html` before `app.js`.
- No behavioral changes intended; extraction focuses on further `app.js` reduction while preserving existing display-format behavior.

## Implemented in wave 38 (app.js map-layer-cleanup bridge extraction)
- Added new service module `public/js/app/services/mapLayerCleanupBridgeService.js` for map-layer cleanup view-API bridge helpers.
- `public/app.js` now delegates the following wrapper cluster to the service:
  - `removeMapLayer`
  - `clearComparisonOverlay`
  - `clearPrHighlightLayer`
- Added script loading for the map-layer-cleanup bridge service in `public/index.html` before `app.js`.
- No behavioral changes intended; extraction focuses on continued `app.js` reduction while preserving map-layer cleanup behavior.

## Implemented in wave 39 (app.js gpx-parser bridge extraction)
- Added new service module `public/js/app/services/gpxParserBridgeService.js` for GPX parser view-API bridge helpers.
- `public/app.js` now delegates the following wrapper cluster to the service:
  - `getHeartRateValue`
  - `getPowerValue`
  - `countValidPowerSamples`
  - `parseTrackPointsFromGpxText`
  - `fetchTrackPoints`
- Added script loading for the GPX-parser bridge service in `public/index.html` before `app.js`.
- No behavioral changes intended; extraction focuses on further `app.js` reduction while preserving parser-wrapper behavior.

## Implemented in wave 40 (app.js weather bridge extraction)
- Added new service module `public/js/app/services/weatherBridgeService.js` for weather-related view-API bridge helpers.
- `public/app.js` now delegates the following wrapper cluster to the service:
  - `getTrackWeatherState`
  - `setTrackWeatherState`
  - `getWeatherRequestPayloadForTrack`
  - `loadWeatherForTrack`
  - `buildWeatherCard`
- Added script loading for the weather bridge service in `public/index.html` before `app.js`.
- No behavioral changes intended; extraction focuses on further `app.js` reduction while preserving weather-wrapper behavior.

## Implemented in wave 41 (app.js stats-aggregate bridge extraction)
- Added new service module `public/js/app/services/statsAggregateBridgeService.js` for stats-aggregate view-API bridge helpers.
- `public/app.js` now delegates the following wrapper cluster to the service:
  - `collectNumericValues`
  - `calculateAverage`
  - `calculateMax`
- Added script loading for the stats-aggregate bridge service in `public/index.html` before `app.js`.
- No behavioral changes intended; extraction focuses on further `app.js` reduction while preserving stats-aggregate wrapper behavior.

## Implemented in wave 42 (app.js comparison bridge extraction)
- Added new service module `public/js/app/services/comparisonBridgeService.js` for comparison-related view-API bridge helpers.
- `public/app.js` now delegates the following wrapper cluster to the service:
  - `collectComparisonSummary`
  - `ensureComparisonSelection`
- Added script loading for the comparison bridge service in `public/index.html` before `app.js`.
- No behavioral changes intended; extraction focuses on further `app.js` reduction while preserving comparison-wrapper behavior.

## Implemented in wave 43 (app.js trim-basics bridge extraction)
- Added new service module `public/js/app/services/trimBasicsBridgeService.js` for trim-related basic view-API bridge helpers.
- `public/app.js` now delegates the following wrapper cluster to the service:
  - `isTrimModeFor`
  - `createTrimHandleIcon`
  - `findNearestPlaybackPointIndex`
  - `calculateTrimSummary`
- Added script loading for the trim-basics bridge service in `public/index.html` before `app.js`.
- No behavioral changes intended; extraction focuses on further `app.js` reduction while preserving trim-basics wrapper behavior.

## Implemented in wave 44 (app.js trim-preview bridge extraction)
- Added new service module `public/js/app/services/trimPreviewBridgeService.js` for trim-preview view-API bridge helpers.
- `public/app.js` now delegates the following wrapper cluster to the service:
  - `clearTrimSelectionLayers`
  - `syncTrimMarkers`
  - `updateTrimPreview`
- Added script loading for the trim-preview bridge service in `public/index.html` before `app.js`.
- No behavioral changes intended; extraction focuses on further `app.js` reduction while preserving trim-preview wrapper behavior.

## Implemented in wave 45 (app.js track-visual-state bridge extraction)
- Added new service module `public/js/app/services/trackVisualStateBridgeService.js` for track-visual-state view-API bridge helpers.
- `public/app.js` now delegates the following wrapper cluster to the service:
  - `applyActiveTrackVisualState`
  - `applyTrimPreviewVisualState`
- Added script loading for the track-visual-state bridge service in `public/index.html` before `app.js`.
- No behavioral changes intended; extraction focuses on further `app.js` reduction while preserving track-visual-state wrapper behavior.

## Implemented in wave 46 (app.js trim-interaction bridge extraction)
- Added new service module `public/js/app/services/trimInteractionBridgeService.js` for trim-interaction view-API bridge helpers.
- `public/app.js` now delegates the following wrapper cluster to the service:
  - `refreshDetailsPanelIfPossible`
  - `setTrimBoundary`
  - `focusTrimSelection`
- Added script loading for the trim-interaction bridge service in `public/index.html` before `app.js`.
- No behavioral changes intended; extraction focuses on further `app.js` reduction while preserving trim-interaction wrapper behavior.

## Implemented in wave 47 (app.js trim-lifecycle bridge extraction)
- Added new service module `public/js/app/services/trimLifecycleBridgeService.js` for trim lifecycle/begin/commit view-API bridge helpers.
- `public/app.js` now delegates the following wrapper cluster to the service:
  - `endTrimMode`
  - `beginTrimMode`
  - `commitTrimSelection`
- Added script loading for the trim-lifecycle bridge service in `public/index.html` before `app.js`.
- No behavioral changes intended; extraction focuses on further `app.js` reduction while preserving trim-lifecycle wrapper behavior.

## Implemented in wave 48 (app.js outlier-detection bridge extraction)
- Added new service module `public/js/app/services/outlierDetectionBridgeService.js` for outlier-detection view-API bridge helpers.
- `public/app.js` now delegates the following wrapper cluster to the service:
  - `getOutlierDetectionRules`
  - `formatOutlierPointLabel`
  - `buildTrackSegments`
  - `mergeOutlierBases`
  - `finalizeOutlierCandidates`
  - `detectOutlierCandidates`
- Added script loading for the outlier-detection bridge service in `public/index.html` before `app.js`.
- No behavioral changes intended; extraction focuses on further `app.js` reduction while preserving outlier-detection wrapper behavior.

## Implemented in wave 49 (app.js outlier-highlight bridge extraction)
- Added new service module `public/js/app/services/outlierHighlightBridgeService.js` for outlier-highlight view-API bridge helpers.
- `public/app.js` now delegates the following wrapper cluster to the service:
  - `clearOutlierSelectionLayers`
  - `getOutlierCandidateColor`
  - `refreshOutlierHighlights`
  - `focusOutlierCandidate`
  - `setOutlierDecision`
- Added script loading for the outlier-highlight bridge service in `public/index.html` before `app.js`.
- No behavioral changes intended; extraction focuses on further `app.js` reduction while preserving outlier-highlight wrapper behavior.

## Implemented in wave 50 (app.js outlier-mode bridge extraction)
- Added new service module `public/js/app/services/outlierModeBridgeService.js` for outlier-mode view-API bridge helpers.
- `public/app.js` now delegates the following wrapper cluster to the service:
  - `applyOutlierPreviewVisualState`
  - `endOutlierMode`
  - `beginOutlierMode`
- Added script loading for the outlier-mode bridge service in `public/index.html` before `app.js`.
- No behavioral changes intended; extraction focuses on further `app.js` reduction while preserving outlier-mode wrapper behavior.

## Implemented in wave 51 (app.js outlier-cleanup bridge extraction)
- Added new service module `public/js/app/services/outlierCleanupBridgeService.js` for outlier-cleanup view-API bridge helper logic.
- `public/app.js` now delegates the following wrapper to the service:
  - `applyOutlierCleanup`
- Added script loading for the outlier-cleanup bridge service in `public/index.html` before `app.js`.
- No behavioral changes intended; extraction focuses on further `app.js` reduction while preserving outlier-cleanup wrapper behavior.

## Implemented in wave 52 (app.js gpx-parser utility bridge extraction)
- Added new service module `public/js/app/services/gpxParserUtilityBridgeService.js` for GPX-parser utility view-API bridge helpers.
- `public/app.js` now delegates the following wrapper cluster to the service:
  - `parseNumericOrNull`
  - `findFirstDescendantText`
  - `parseSpeedToKmh`
  - `toFiniteNumber`
- Added script loading for the GPX-parser utility bridge service in `public/index.html` before `app.js`.
- No behavioral changes intended; extraction focuses on further `app.js` reduction while preserving GPX-parser utility wrapper behavior.

## Implemented in wave 53 (app.js track-point bridge extraction)
- Added new service module `public/js/app/services/trackPointBridgeService.js` for track-point load/fallback view-API bridge helpers.
- `public/app.js` now delegates the following wrapper cluster to the service:
  - `ensureTrackPoints`
  - `extractPointsSafely`
- Added script loading for the track-point bridge service in `public/index.html` before `app.js`.
- No behavioral changes intended; extraction focuses on further `app.js` reduction while preserving track-point wrapper behavior.

## Implemented in wave 54 (app.js home-track-navigation bridge extraction)
- Added new service module `public/js/app/services/homeTrackNavigationBridgeService.js` for home-track-navigation view-API bridge helpers.
- `public/app.js` now delegates the following wrapper cluster to the service:
  - `clearTrackFilters`
  - `openTrackFromHome`
- Added script loading for the home-track-navigation bridge service in `public/index.html` before `app.js`.
- No behavioral changes intended; extraction focuses on further `app.js` reduction while preserving home-track-navigation wrapper behavior.

## Implemented in wave 55 (app.js navigation bridge extraction)
- Added new service module `public/js/app/services/appNavigationBridgeService.js` for app-navigation view-API bridge helpers.
- `public/app.js` now delegates the following wrapper cluster to the service:
  - `setActiveView`
  - `initAppNavigation`
- Added script loading for the app-navigation bridge service in `public/index.html` before `app.js`.
- No behavioral changes intended; extraction focuses on further `app.js` reduction while preserving navigation wrapper behavior.

## Implemented in wave 56 (app.js modal-accessibility bridge extraction)
- Added new service module `public/js/app/services/modalAccessibilityBridgeService.js` for modal-accessibility view-API bridge helpers.
- `public/app.js` now delegates the following wrapper cluster to the service:
  - `openModalWithA11y`
  - `closeModalWithA11y`
  - `initModalAccessibility`
  - `initStandardModal`
- Added script loading for the modal-accessibility bridge service in `public/index.html` before `app.js`.
- No behavioral changes intended; extraction focuses on further `app.js` reduction while preserving modal-accessibility wrapper behavior.

## Implemented in wave 57 (app.js home-view bridge extraction)
- Added new service module `public/js/app/services/homeViewBridgeService.js` for home-view related view-API bridge helpers.
- `public/app.js` now delegates the following wrapper cluster to the service:
  - `bindHomeQuickActions`
  - `renderHomeView`
  - `populateActivityNoteCard`
  - `populateTrackEquipmentCard`
- Added script loading for the home-view bridge service in `public/index.html` before `app.js`.
- No behavioral changes intended; extraction focuses on further `app.js` reduction while preserving home-view wrapper behavior.

## Implemented in wave 58 (app.js analysis-mode bridge extraction)
- Added new service module `public/js/app/services/analysisModeBridgeService.js` for analysis-mode view-API bridge helpers.
- `public/app.js` now delegates the following wrapper cluster to the service:
  - `isAnalysisModeEnabled`
  - `isAnalysisAvailable`
  - `syncAnalysisToggleButtons`
  - `updateAnalysisControlAvailability`
  - `setAnalysisMode`
  - `initGradientToggle`
- Added script loading for the analysis-mode bridge service in `public/index.html` before `app.js`.
- No behavioral changes intended; extraction focuses on further `app.js` reduction while preserving analysis-mode wrapper behavior.

## Implemented in wave 59 (app.js filter-search bridge extraction)
- Added new service module `public/js/app/services/filterSearchBridgeService.js` for filter/search view-API bridge helpers.
- `public/app.js` now delegates the following wrapper cluster to the service:
  - `initFiltersAndSort`
  - `initSearch`
  - `initMapFilters`
  - `applyFiltersAndSort`
- Added script loading for the filter-search bridge service in `public/index.html` before `app.js`.
- No behavioral changes intended; extraction focuses on further `app.js` reduction while preserving filter/search wrapper behavior.

## Implemented in wave 60 (app.js upload bridge extraction)
- Added new service module `public/js/app/services/uploadBridgeService.js` for upload view-API bridge helpers.
- `public/app.js` now delegates the following wrapper cluster to the service:
  - `initDragAndDrop`
  - `handleFileUpload`
  - `resolveDuplicateConflict`
  - `showDuplicateModal`
- Added script loading for the upload bridge service in `public/index.html` before `app.js`.
- No behavioral changes intended; extraction focuses on further `app.js` reduction while preserving upload wrapper behavior.

## Implemented in wave 61 (app.js delete-all bridge extraction)
- Added new service module `public/js/app/services/deleteAllBridgeService.js` for delete-all view-API bridge helpers.
- `public/app.js` now delegates the following wrapper cluster to the service:
  - `initDeleteAll`
  - `toggleDeleteAllButton`
- Added script loading for the delete-all bridge service in `public/index.html` before `app.js`.
- No behavioral changes intended; extraction focuses on further `app.js` reduction while preserving delete-all wrapper behavior.

## Implemented in wave 62 (app.js statistics bridge extraction)
- Added new service module `public/js/app/services/statisticsBridgeService.js` for statistics view-API bridge helpers.
- `public/app.js` now delegates the following wrapper cluster to the service:
  - `renderDashboard`
  - `renderStatisticsPanel`
  - `renderStatisticsView`
- Added script loading for the statistics bridge service in `public/index.html` before `app.js`.
- No behavioral changes intended; extraction focuses on further `app.js` reduction while preserving statistics wrapper behavior.

## Implemented in wave 63 (app.js analysis-distribution bridge extraction)
- Added new service module `public/js/app/services/analysisDistributionBridgeService.js` for analysis-distribution view-API bridge helpers.
- `public/app.js` now delegates the following wrapper cluster to the service:
  - `mergeAnalysisBandTotals`
  - `summarizeAnalysisBands`
  - `createAnalysisBandRowsMarkup`
  - `createAnalysisDistributionCardMarkup`
- Added script loading for the analysis-distribution bridge service in `public/index.html` before `app.js`.
- No behavioral changes intended; extraction focuses on further `app.js` reduction while preserving analysis-distribution wrapper behavior.

## Implemented in wave 64 (app.js analysis-threshold-controls bridge extraction)
- Added new service module `public/js/app/services/analysisThresholdControlsBridgeService.js` for analysis-threshold-controls view-API bridge helpers.
- `public/app.js` now delegates the following wrapper cluster to the service:
  - `createAnalysisThresholdControlsMarkup`
  - `bindAnalysisThresholdControls`
- Added script loading for the analysis-threshold-controls bridge service in `public/index.html` before `app.js`.
- No behavioral changes intended; extraction focuses on further `app.js` reduction while preserving threshold-controls wrapper behavior.

## Implemented in wave 65 (app.js comparison-modal bridge delegation)
- Extended existing service module `public/js/app/services/comparisonBridgeService.js` with comparison-modal view-API bridge helpers.
- `public/app.js` now delegates the following wrapper cluster to the service:
  - `initComparisonModal`
  - `showComparisonOnMap`
  - `renderComparisonModal`
- Reused existing comparison bridge script loading in `public/index.html` (no additional script tag needed).
- No behavioral changes intended; extraction focuses on further `app.js` reduction while preserving comparison-modal wrapper behavior.

## Implemented in wave 66 (app.js PR-analysis bridge extraction)
- Added new service module `public/js/app/services/prAnalysisBridgeService.js` for PR-analysis view-API bridge helpers.
- `public/app.js` now delegates the following wrapper cluster to the service:
  - `initPrAnalysisModal`
  - `renderPrAnalysisModal`
- Added script loading for the PR-analysis bridge service in `public/index.html` before `app.js`.
- No behavioral changes intended; extraction focuses on further `app.js` reduction while preserving PR-analysis wrapper behavior.

## Implemented in wave 67 (app.js equipment-modal bridge extraction)
- Added new service module `public/js/app/services/equipmentBridgeService.js` for equipment-modal view-API bridge helpers.
- `public/app.js` now delegates the following wrapper cluster to the service:
  - `renderEquipmentModal`
  - `initEquipmentModal`
- Added script loading for the equipment bridge service in `public/index.html` before `app.js`.
- No behavioral changes intended; extraction focuses on further `app.js` reduction while preserving equipment-modal wrapper behavior.

## Implemented in wave 68 (app.js initialization bridge extraction)
- Added new service module `public/js/app/services/initializationBridgeService.js` for initialization view-API bridge helpers.
- `public/app.js` now delegates the following wrapper cluster to the service:
  - `initMap`
  - `initializeProfiles`
  - `initProfileSwitcher`
  - `initView3DToggle`
- Added script loading for the initialization bridge service in `public/index.html` before `app.js`.
- No behavioral changes intended; extraction focuses on further `app.js` reduction while preserving initialization wrapper behavior.

## Implemented in wave 69 (app.js weather-state bridge delegation)
- Extended existing service module `public/js/app/services/weatherBridgeService.js` with a weather-state view-API bridge helper.
- `public/app.js` now delegates the following wrapper to the service:
  - `findTrackStartAndEndTimeMs`
- Reused existing weather bridge script loading in `public/index.html` (no additional script tag needed).
- No behavioral changes intended; extraction focuses on further `app.js` reduction while preserving weather-state wrapper behavior.

## Implemented in wave 70 (app.js analyses bridge extraction)
- Added new service module `public/js/app/services/analysesBridgeService.js` for analyses view-API bridge helpers.
- `public/app.js` now delegates the following wrapper cluster to the service:
  - `renderAnalysesView`
- Added script loading for the analyses bridge service in `public/index.html` before `app.js`.
- No behavioral changes intended; extraction focuses on further `app.js` reduction while preserving analyses wrapper behavior.

## Implemented in wave 71 (app.js panel-ui bridge extraction)
- Added new service module `public/js/app/services/panelUiBridgeService.js` for panel-UI bridge helpers.
- `public/app.js` now delegates the following wrapper cluster to the service:
  - `closeFloatingPanel`
  - `toggleFloatingPanel`
  - `closeElevationPanel`
  - `updateChartTabsVisibility`
- Added script loading for the panel-UI bridge service in `public/index.html` before `app.js`.
- No behavioral changes intended; extraction focuses on further `app.js` reduction while preserving panel-UI wrapper behavior.

## Implemented in wave 72 (app.js playback-control bridge extraction)
- Added new service module `public/js/app/services/playbackControlBridgeService.js` for playback-control bridge helpers.
- `public/app.js` now delegates the following wrapper cluster to the service:
  - `initPlaybackUI`
  - `updatePlaybackControlState`
  - `setPlaybackIndex`
  - `stepPlayback`
  - `togglePlayback`
  - `pausePlayback`
  - `startPlaybackLoop`
  - `stopPlayback`
- Added script loading for the playback-control bridge service in `public/index.html` before `app.js`.
- No behavioral changes intended; extraction focuses on further `app.js` reduction while preserving playback-control wrapper behavior.

## Implemented in wave 73 (app.js toast-notification bridge extraction)
- Added new service module `public/js/app/services/toastNotificationBridgeService.js` for toast-notification bridge helpers.
- `public/app.js` now delegates the following wrapper cluster to the service:
  - `ensureToastContainer`
  - `dismissToast`
  - `showToast`
- Added script loading for the toast-notification bridge service in `public/index.html` before `app.js`.
- No behavioral changes intended; extraction focuses on further `app.js` reduction while preserving toast-notification wrapper behavior.

## Implemented in wave 74 (app.js heatmap-time-filter bridge extraction)
- Added new service module `public/js/app/services/heatmapTimeFilterBridgeService.js` for heatmap-time-filter bridge helpers.
- `public/app.js` now delegates the following wrapper cluster to the service:
  - `getHeatmapPointTimestampMs`
  - `getHeatmapSeason`
  - `getHeatmapWeekdayToken`
  - `isHeatmapPointMatchingTimeFilters`
  - `initHeatmapTimeFilters`
- Added script loading for the heatmap-time-filter bridge service in `public/index.html` before `app.js`.
- No behavioral changes intended; extraction focuses on further `app.js` reduction while preserving heatmap-time-filter wrapper behavior.

## Implemented in wave 75 (app.js heatmap-layer bridge extraction)
- Added new service module `public/js/app/services/heatmapLayerBridgeService.js` for heatmap-layer bridge helpers.
- `public/app.js` now delegates the following wrapper cluster to the service:
  - `getHeatmapSourceEntries`
  - `getHeatmapPointsForEntry`
  - `sampleTrackPointsForHeatmap`
  - `clearHeatmapLayers`
  - `buildHeatmapBucketsByProfile`
  - `updateHeatmap`
- Added script loading for the heatmap-layer bridge service in `public/index.html` before `app.js`.
- No behavioral changes intended; extraction focuses on further `app.js` reduction while preserving heatmap-layer wrapper behavior.

## Implemented in wave 76 (app.js heatmap-gradient bridge extraction)
- Added new service module `public/js/app/services/heatmapGradientBridgeService.js` for heatmap-gradient bridge helpers.
- `public/app.js` now delegates the following wrapper cluster to the service:
  - `parseColorToRgb`
  - `mixRgb`
  - `rgbToCss`
  - `getProfileBaseColor`
  - `buildHeatmapGradientForProfile`
- Added script loading for the heatmap-gradient bridge service in `public/index.html` before `app.js`.
- No behavioral changes intended; extraction focuses on further `app.js` reduction while preserving heatmap-gradient wrapper behavior.

## Implemented in wave 77 (app.js analysis-normalization bridge extraction)
- Added new service module `public/js/app/services/analysisNormalizationBridgeService.js` for analysis-normalization bridge helpers.
- `public/app.js` now delegates the following wrapper cluster to the service:
  - `clampNumber`
  - `normalizeAnalysisThresholdEntry`
  - `normalizeAnalysisThresholdsByProfile`
  - `normalizeHeatmapTimeFilters`
- Added script loading for the analysis-normalization bridge service in `public/index.html` before `app.js`.
- No behavioral changes intended; extraction focuses on further `app.js` reduction while preserving analysis-normalization wrapper behavior.

## Implemented in wave 78 (app.js analysis-threshold-preset bridge extraction)
- Added new service module `public/js/app/services/analysisThresholdPresetBridgeService.js` for analysis-threshold-preset bridge helpers.
- `public/app.js` now delegates the following wrapper cluster to the service:
  - `getDefaultAnalysisThresholds`
  - `getAnalysisSpeedPresetDelta`
  - `getAnalysisThresholdPreset`
  - `areAnalysisThresholdValuesEqual`
  - `areAnalysisThresholdsEqual`
  - `getAnalysisThresholdPresetKey`
  - `getAnalysisThresholdPresetLabel`
  - `getAnalysisThresholdPresetIcon`
  - `getAnalysisThresholdPresetStateMarkup`
- Added script loading for the analysis-threshold-preset bridge service in `public/index.html` before `app.js`.
- No behavioral changes intended; extraction focuses on further `app.js` reduction while preserving analysis-threshold-preset wrapper behavior.

## Implemented in wave 79 (app.js format-utils bridge extraction)
- Added new service module `public/js/app/services/formatUtilsBridgeService.js` for format-utils bridge helpers.
- `public/app.js` now delegates the following wrapper cluster to the service:
  - `formatNumericInputValue`
  - `formatThresholdLabel`
  - `formatDistanceLabel`
- Added script loading for the format-utils bridge service in `public/index.html` before `app.js`.
- No behavioral changes intended; extraction focuses on further `app.js` reduction while preserving format-utils wrapper behavior.

## Implemented in wave 80 (app.js PR-alerts bridge extraction)
- Added new service module `public/js/app/services/prAlertsBridgeService.js` for PR-alerts bridge helpers.
- `public/app.js` now delegates the following wrapper cluster to the service:
  - `buildPersonalRecordSnapshot`
  - `createPersonalRecordAlertMessages`
  - `runPersonalRecordAlertCheck`
- Added script loading for the PR-alerts bridge service in `public/index.html` before `app.js`.
- No behavioral changes intended; extraction focuses on further `app.js` reduction while preserving PR-alerts wrapper behavior.

## Implemented in wave 81 (app.js persisted-selection bridge extraction)
- Added new service module `public/js/app/services/persistedSelectionBridgeService.js` for persisted-selection bridge helpers.
- `public/app.js` now delegates the following wrapper cluster to the service:
  - `applyPersistedUiStateToControls`
  - `getPersistedTrackSelection`
  - `setPersistedTrackSelection`
  - `restorePersistedTrackSelection`
- Added script loading for the persisted-selection bridge service in `public/index.html` before `app.js`.
- No behavioral changes intended; extraction focuses on further `app.js` reduction while preserving persisted-selection wrapper behavior.

## Implemented in wave 82 (app.js activity-note-data bridge extraction)
- Added new service module `public/js/app/services/activityNoteDataBridgeService.js` for activity-note-data bridge helpers.
- `public/app.js` now delegates the following wrapper cluster to the service:
  - `getActivityNoteSummary`
  - `updateActivityNoteSummary`
  - `setActivityNoteSummaries`
  - `loadActivityNoteSummaries`
  - `fetchActivityNote`
  - `saveActivityNote`
- Added script loading for the activity-note-data bridge service in `public/index.html` before `app.js`.
- No behavioral changes intended; extraction focuses on further `app.js` reduction while preserving activity-note-data wrapper behavior.

## Implemented in wave 83 (app.js segment-favorites-data bridge extraction)
- Added new service module `public/js/app/services/segmentFavoritesDataBridgeService.js` for segment-favorites-data bridge helpers.
- `public/app.js` now delegates the following wrapper cluster to the service:
  - `getSegmentFavorites`
  - `setSegmentFavorites`
  - `upsertSegmentFavoriteInCache`
  - `removeSegmentFavoriteFromCache`
  - `getSegmentFavoriteDraft`
  - `setSegmentFavoriteDraft`
  - `clearSegmentFavoriteDraft`
  - `loadSegmentFavorites`
  - `createSegmentFavorite`
  - `updateSegmentFavorite`
  - `deleteSegmentFavorite`
- Added script loading for the segment-favorites-data bridge service in `public/index.html` before `app.js`.
- No behavioral changes intended; extraction focuses on further `app.js` reduction while preserving segment-favorites-data wrapper behavior.

## Implemented in wave 84 (app.js equipment-data bridge extraction)
- Added new service module `public/js/app/services/equipmentDataBridgeService.js` for equipment-data bridge helpers.
- `public/app.js` now delegates the following wrapper cluster to the service:
  - `getEquipmentItems`
  - `setEquipmentItems`
  - `getEquipmentEditorDraft`
  - `setEquipmentEditorDraft`
  - `clearEquipmentEditorDraft`
  - `getEquipmentAssignmentMap`
  - `setEquipmentAssignments`
  - `upsertEquipmentAssignment`
  - `getTrackEquipmentAssignment`
  - `loadEquipment`
  - `loadEquipmentAssignments`
  - `createEquipment`
  - `updateEquipment`
  - `deleteEquipment`
  - `saveTrackEquipmentAssignment`
- Added script loading for the equipment-data bridge service in `public/index.html` before `app.js`.
- No behavioral changes intended; extraction focuses on further `app.js` reduction while preserving equipment-data wrapper behavior.

## Implemented in wave 85 (app.js equipment-maintenance bridge extraction)
- Added new service module `public/js/app/services/equipmentMaintenanceBridgeService.js` for equipment-maintenance bridge helpers.
- `public/app.js` now delegates the following wrapper cluster to the service:
  - `getTrackDistanceKm`
  - `buildEquipmentUsageMap`
  - `getEquipmentMaintenanceStatus`
  - `getEquipmentStatusClass`
  - `getEquipmentReminderSummary`
- Added script loading for the equipment-maintenance bridge service in `public/index.html` before `app.js`.
- No behavioral changes intended; extraction focuses on further `app.js` reduction while preserving equipment-maintenance wrapper behavior.

## Implemented in wave 86 (app.js map-safety bridge extraction)
- Added new service module `public/js/app/services/mapSafetyBridgeService.js` for map-safety bridge helpers.
- `public/app.js` now delegates the following wrapper cluster to the service:
  - `isFiniteTrackPoint`
  - `isValidLatitude`
  - `isValidLongitude`
  - `isValidMapCoordinatePair`
  - `normalizeTrackPoints`
  - `isMapViewportReady`
  - `isMapViewActive`
  - `canRenderMapOverlays`
  - `ensureMapViewportReady`
  - `isLeafletBoundsFinite`
  - `safeSetView`
  - `safeFocusBounds`
  - `safeFitBounds`
- Added script loading for the map-safety bridge service in `public/index.html` before `app.js`.
- No behavioral changes intended; extraction focuses on further `app.js` reduction while preserving map-safety wrapper behavior.

## Implemented in wave 87 (app.js track-cache bridge extraction)
- Added new service module `public/js/app/services/trackCacheBridgeService.js` for track-cache bridge helpers.
- `public/app.js` now delegates the following wrapper cluster to the service:
  - `getTrackCacheKey`
  - `getCachedTrack`
  - `setCachedTrack`
  - `removeCachedTrack`
- Added script loading for the track-cache bridge service in `public/index.html` before `app.js`.
- No behavioral changes intended; extraction focuses on further `app.js` reduction while preserving track-cache wrapper behavior.

## Implemented in wave 88 (app.js format-utils bridge extension)
- Extended existing service module `public/js/app/services/formatUtilsBridgeService.js` with additional format-utils bridge helpers.
- `public/app.js` now delegates the following wrapper cluster to the service:
  - `toPercentShare`
  - `formatDistanceKm`
  - `formatDashboardNumber`
  - `formatDashboardDate`
- Reused existing format-utils bridge script loading in `public/index.html` (no additional script tag needed).
- No behavioral changes intended; extraction focuses on further `app.js` reduction while preserving format-utils wrapper behavior.

## Implemented in wave 89 (app.js chart-build bridge extraction)
- Added new service module `public/js/app/services/chartBuildBridgeService.js` for chart-build bridge helpers.
- `public/app.js` now delegates the following wrapper cluster to the service:
  - `showCharts`
  - `buildElevationChart`
  - `buildSpeedChart`
  - `buildHRChart`
  - `buildPowerChart`
  - `getCommonChartOptions`
- Added script loading for the chart-build bridge service in `public/index.html` before `app.js`.
- No behavioral changes intended; extraction focuses on further `app.js` reduction while preserving chart-build wrapper behavior.

## Implemented in wave 90 (app.js playback-chart-sync bridge extraction)
- Added new service module `public/js/app/services/playbackChartSyncBridgeService.js` for playback-timeline and playback-chart-sync bridge helpers.
- `public/app.js` now delegates the following wrapper cluster to the service:
  - `resolvePointSpeedKmh`
  - `buildPlaybackTimeline`
  - `rebuildPlaybackTimeline`
  - `getPlaybackIndexForVirtualTime`
  - `syncAllCharts`
  - `clearChartSync`
- Added script loading for the playback-chart-sync bridge service in `public/index.html` before `app.js`.
- No behavioral changes intended; extraction focuses on further `app.js` reduction while preserving playback chart/timeline wrapper behavior.

## Implemented in wave 91 (app.js segment-favorite-helper bridge extraction)
- Added new service module `public/js/app/services/segmentFavoriteHelperBridgeService.js` for segment-favorite helper bridge wrappers.
- `public/app.js` now delegates the following wrapper cluster to the service:
  - `buildSegmentFavoriteKey`
  - `getSegmentFavoriteLabel`
  - `formatSegmentPointRange`
  - `getSegmentFavoriteRangeInfo`
- Added script loading for the segment-favorite-helper bridge service in `public/index.html` before `app.js`.
- No behavioral changes intended; extraction focuses on further `app.js` reduction while preserving segment-favorite helper wrapper behavior.

## Implemented in wave 92 (app.js overlay-heatmap-toggle bridge extraction)
- Added new service module `public/js/app/services/overlayHeatmapToggleBridgeService.js` for overlay-heatmap toggle bridge wrappers.
- `public/app.js` now delegates the following wrapper cluster to the service:
  - `initHeatmapToggle`
  - `initHeatmapScopeToggle`
  - `initOverlayToggle`
  - `refreshOverlayVisibility`
- Added script loading for the overlay-heatmap-toggle bridge service in `public/index.html` before `app.js`.
- No behavioral changes intended; extraction focuses on further `app.js` reduction while preserving overlay-heatmap toggle wrapper behavior.

## Implemented in wave 93 (app.js chart-panel bridge extraction)
- Added new service module `public/js/app/services/chartPanelBridgeService.js` for chart-panel bridge wrappers.
- `public/app.js` now delegates the following wrapper cluster to the service:
  - `scheduleChartResize`
  - `initElevationPanel`
  - `initChartTabs`
  - `refreshChartContainers`
- Added script loading for the chart-panel bridge service in `public/index.html` before `app.js`.
- No behavioral changes intended; extraction focuses on further `app.js` reduction while preserving chart-panel wrapper behavior.

## Implemented in wave 94 (app.js speed-threshold bridge extraction)
- Added new service module `public/js/app/services/speedThresholdBridgeService.js` for speed-threshold bridge wrappers.
- `public/app.js` now delegates the following wrapper cluster to the service:
  - `getSpeedThresholdsForProfile`
  - `updateSpeedLabels`
  - `updateElevationLabels`
- Added script loading for the speed-threshold bridge service in `public/index.html` before `app.js`.
- No behavioral changes intended; extraction focuses on further `app.js` reduction while preserving speed-threshold wrapper behavior.

## Implemented in wave 95 (app.js loading-overlay bridge extraction)
- Added new service module `public/js/app/services/loadingOverlayBridgeService.js` for loading-overlay bridge wrappers.
- `public/app.js` now delegates the following wrapper cluster to the service:
  - `showLoadingOverlay`
- Added script loading for the loading-overlay bridge service in `public/index.html` before `app.js`.
- No behavioral changes intended; extraction focuses on further `app.js` reduction while preserving loading-overlay wrapper behavior.

## Implemented in wave 96 (app.js html-escape bridge extraction)
- Added new service module `public/js/app/services/htmlEscapeBridgeService.js` for html-escape bridge wrappers.
- `public/app.js` now delegates the following wrapper cluster to the service:
  - `escapeHtml`
- Added script loading for the html-escape bridge service in `public/index.html` before `app.js`.
- No behavioral changes intended; extraction focuses on further `app.js` reduction while preserving html-escape wrapper behavior.

## Implemented in wave 97 (index bridge-order cleanup)
- Kept behavior unchanged and cleaned script organization in `public/index.html` by moving misplaced bridge includes (`healthDashboardBridgeService`, `htmlEscapeBridgeService`) into the contiguous bridge-service chain.
- No service APIs changed; this wave is strictly structural to keep the load chain easier to scan and maintain.

## Implemented in wave 98 (index script-chain sectioning)
- Kept behavior unchanged and added lightweight section comments in `public/index.html` to mark core services, bridge services, and view-factory script groups.
- Script order and runtime dependencies remain unchanged; this wave is purely readability/maintainability cleanup.

## Implemented in wave 99 (index bridge-script alphabetical order)
- Kept behavior unchanged and reordered the bridge-service script includes in `public/index.html` alphabetically within the bridge block.
- No service APIs changed; this wave is purely structural to improve scanability and reduce merge friction in the script chain.

## Implemented in wave 100 (migration status snapshot)
- Captured an explicit migration status checkpoint after the bridge extraction sequence and index cleanup waves.
- Verification snapshot:
  - `public/app.js`: no remaining direct `return <...Service>.<...>` wrapper delegations outside `...BridgeService` matches (grep-based check).
  - `public/js/app/services/*BridgeService.js`: 59 bridge-service files currently present.
  - Baseline wave log is now continued through wave 100.
- No runtime behavior changes in this wave; this is documentation/status bookkeeping only.

## Implemented in wave 101 (bridge include integrity audit)
- Ran a consistency audit comparing bridge-service files on disk with bridge-service script includes in `public/index.html`.
- Audit result snapshot:
  - Bridge files on disk: `59`
  - Bridge script references in `index.html`: `59`
  - Missing includes: `none`
  - Extra includes without file: `none`
- No runtime behavior changes in this wave; this is verification/documentation only.

## Implemented in wave 102 (prioritized next steps)
- Added a focused post-bridge roadmap to keep momentum after wrapper extraction completion.
- Priority order:
  1. **Bridge consolidation candidates:** merge ultra-thin one-function bridge modules where this does not increase coupling.
  2. **Script-chain simplification:** evaluate a staged move from long script-tag chains toward feature entrypoints (while preserving current fallback behavior).
  3. **`app.js` orchestration trim:** split remaining orchestration hotspots into domain coordinators (playback, overlays, modals) with unchanged public behavior.
  4. **Test coverage uplift:** add lightweight regression checks around startup/bootstrap and key endpoints to protect further refactors.
  5. **Dead-code sweep:** run symbol-usage checks to identify obsolete helpers and remove only fully unreferenced paths.
- No runtime behavior changes in this wave; this is planning/documentation only.

## Implemented in wave 103 (bridge consolidation: segment favorites)
- Consolidated `segmentFavoriteHelperBridgeService` into `segmentFavoritesDataBridgeService` to reduce ultra-thin bridge-module fragmentation in the same domain.
- Updated `public/js/app/services/segmentFavoritesDataBridgeService.js` to expose the helper wrappers:
  - `buildSegmentFavoriteKey`
  - `getSegmentFavoriteLabel`
  - `formatSegmentPointRange`
  - `getSegmentFavoriteRangeInfo`
- Updated `public/app.js` to route those wrappers through `segmentFavoritesDataBridgeService` and pass `segmentFavoriteHelperService` into its bridge factory deps.
- Removed obsolete standalone file `public/js/app/services/segmentFavoriteHelperBridgeService.js` and its script include from `public/index.html`.
- Intended behavior remains unchanged; this wave is structural consolidation.

## Implemented in wave 104 (bridge consolidation: loading overlay)
- Consolidated `loadingOverlayBridgeService` into `panelUiBridgeService` to reduce single-purpose bridge fragmentation in UI/panel orchestration.
- Updated `public/js/app/services/panelUiBridgeService.js` to expose `showLoadingOverlay(show)` via `loadingOverlayService` dependency.
- Updated `public/app.js` to route `showLoadingOverlay` through `panelUiBridgeService` and removed standalone `loadingOverlayBridgeService` initialization.
- Removed obsolete standalone file `public/js/app/services/loadingOverlayBridgeService.js` and its script include from `public/index.html`.
- Intended behavior remains unchanged; this wave is structural consolidation.

## Implemented in wave 105 (bridge consolidation: html-escape)
- Consolidated `htmlEscapeBridgeService` into `formatUtilsBridgeService` to reduce single-purpose utility bridge fragmentation.
- Updated `public/js/app/services/formatUtilsBridgeService.js` to expose `escapeHtml(value)` via `htmlEscapeService` dependency.
- Updated `public/app.js` to route `escapeHtml` through `formatUtilsBridgeService` and removed standalone `htmlEscapeBridgeService` initialization.
- Removed obsolete standalone file `public/js/app/services/htmlEscapeBridgeService.js` and its script include from `public/index.html`.
- Intended behavior remains unchanged; this wave is structural consolidation.

## Implemented in wave 106 (bridge consolidation: outlier cleanup)
- Consolidated `outlierCleanupBridgeService` into `outlierModeBridgeService` to reduce single-purpose bridge fragmentation in the outlier domain.
- Updated `public/js/app/services/outlierModeBridgeService.js` to expose `applyOutlierCleanup()` via `getOutlierCleanupViewApi` dependency.
- Updated `public/app.js` to route `applyOutlierCleanup` through `outlierModeBridgeService` and removed standalone `outlierCleanupBridgeService` initialization.
- Removed obsolete standalone file `public/js/app/services/outlierCleanupBridgeService.js` and its script include from `public/index.html`.
- Intended behavior remains unchanged; this wave is structural consolidation.

## Implemented in wave 107 (bridge consolidation: analyses + PR-analysis)
- Consolidated `analysesBridgeService` into `prAnalysisBridgeService` to reduce thin bridge fragmentation inside the analysis domain.
- Updated `public/js/app/services/prAnalysisBridgeService.js` to expose `renderAnalysesView()` via `getAnalysesViewApi` dependency, alongside PR-analysis modal methods.
- Updated `public/app.js` to route `renderAnalysesView` through `prAnalysisBridgeService` and removed standalone `analysesBridgeService` initialization.
- Removed obsolete standalone file `public/js/app/services/analysesBridgeService.js` and its script include from `public/index.html`.
- Intended behavior remains unchanged; this wave is structural consolidation.

## Implemented in wave 108 (bridge consolidation: home track navigation)
- Consolidated `homeTrackNavigationBridgeService` into `homeViewBridgeService` to reduce thin bridge fragmentation in the home domain.
- Updated `public/js/app/services/homeViewBridgeService.js` to expose:
  - `clearTrackFilters`
  - `openTrackFromHome`
  via `getHomeTrackNavigationViewApi` dependency.
- Updated `public/app.js` to route `clearTrackFilters` and `openTrackFromHome` through `homeViewBridgeService` and removed standalone `homeTrackNavigationBridgeService` initialization.
- Removed obsolete standalone file `public/js/app/services/homeTrackNavigationBridgeService.js` and its script include from `public/index.html`.
- Intended behavior remains unchanged; this wave is structural consolidation.

## Implemented in wave 109 (bridge consolidation: track-point)
- Consolidated `trackPointBridgeService` into `gpxParserBridgeService` to reduce thin bridge fragmentation in GPX/track-point handling.
- Updated `public/js/app/services/gpxParserBridgeService.js` to expose:
  - `ensureTrackPoints`
  - `extractPointsSafely`
  via `getTrackPointLoadViewApi` and `getTrackPointFallbackViewApi` dependencies.
- Updated `public/app.js` to route `ensureTrackPoints` and `extractPointsSafely` through `gpxParserBridgeService` and removed standalone `trackPointBridgeService` initialization.
- Removed obsolete standalone file `public/js/app/services/trackPointBridgeService.js` and its script include from `public/index.html`.
- Intended behavior remains unchanged; this wave is structural consolidation.

## Implemented in wave 110 (bridge consolidation: equipment modal)
- Consolidated `equipmentBridgeService` into `equipmentDataBridgeService` to reduce thin bridge fragmentation in the equipment domain.
- Updated `public/js/app/services/equipmentDataBridgeService.js` to expose:
  - `renderEquipmentModal`
  - `initEquipmentModal`
  via `getEquipmentViewApi` dependency, alongside equipment data helpers.
- Updated `public/app.js` to route equipment modal wrappers through `equipmentDataBridgeService` and removed standalone `equipmentBridgeService` initialization.
- Removed obsolete standalone file `public/js/app/services/equipmentBridgeService.js` and its script include from `public/index.html`.
- Intended behavior remains unchanged; this wave is structural consolidation.

## Implemented in wave 111 (bridge consolidation: upload + delete-all)
- Consolidated `deleteAllBridgeService` into `uploadBridgeService` to reduce thin bridge fragmentation in the upload/manage domain.
- Updated `public/js/app/services/uploadBridgeService.js` to expose:
  - `initDeleteAll`
  - `toggleDeleteAllButton`
  via `getDeleteAllViewApi` dependency, alongside upload helpers.
- Updated `public/app.js` to route delete-all wrappers through `uploadBridgeService` and removed standalone `deleteAllBridgeService` initialization.
- Removed obsolete standalone file `public/js/app/services/deleteAllBridgeService.js` and its script include from `public/index.html`.
- Intended behavior remains unchanged; this wave is structural consolidation.

## Implemented in wave 112 (bridge consolidation: startup overlay + initialization)
- Consolidated `startupOverlayBridgeService` into `initializationBridgeService` to reduce thin bridge fragmentation in startup/initialization orchestration.
- Updated `public/js/app/services/initializationBridgeService.js` to expose:
  - `updateStartupProgress`
  - `beginStartupExperience`
  via `getStartupOverlayViewApi` dependency, alongside map/profile/view initialization methods.
- Updated `public/app.js` to route startup overlay wrappers through `initializationBridgeService` and removed standalone `startupOverlayBridgeService` initialization.
- Removed obsolete standalone file `public/js/app/services/startupOverlayBridgeService.js` and its script include from `public/index.html`.
- Intended behavior remains unchanged; this wave is structural consolidation.

## Implemented in wave 113 (bridge consolidation: speed-threshold + analysis-threshold preset)
- Consolidated `speedThresholdBridgeService` into `analysisThresholdPresetBridgeService` to reduce thin bridge fragmentation around threshold orchestration.
- Updated `public/js/app/services/analysisThresholdPresetBridgeService.js` to additionally expose:
  - `getSpeedThresholdsForProfile`
  - `updateSpeedLabels`
  - `updateElevationLabels`
  via `speedThresholdService` dependency, alongside existing analysis-threshold preset helpers.
- Updated `public/app.js` to route speed-threshold wrappers through `analysisThresholdPresetBridgeService` and removed standalone `speedThresholdBridgeService` initialization.
- Removed obsolete standalone file `public/js/app/services/speedThresholdBridgeService.js` and its script include from `public/index.html`.
- Intended behavior remains unchanged; this wave is structural consolidation.

## Implemented in wave 114 (bridge consolidation: modal accessibility + app navigation)
- Consolidated `modalAccessibilityBridgeService` into `appNavigationBridgeService` to reduce thin bridge fragmentation in navigation/modal orchestration.
- Updated `public/js/app/services/appNavigationBridgeService.js` to additionally expose:
  - `openModalWithA11y`
  - `closeModalWithA11y`
  - `initModalAccessibility`
  - `initStandardModal`
  via `getModalAccessibilityViewApi` dependency, alongside existing app-navigation methods.
- Updated `public/app.js` to route modal accessibility wrappers through `appNavigationBridgeService` and removed standalone `modalAccessibilityBridgeService` initialization.
- Removed obsolete standalone file `public/js/app/services/modalAccessibilityBridgeService.js` and its script include from `public/index.html`.
- Intended behavior remains unchanged; this wave is structural consolidation.

## Implemented in wave 115 (bridge consolidation: track visual state + map-layer cleanup)
- Consolidated `trackVisualStateBridgeService` into `mapLayerCleanupBridgeService` to reduce thin bridge fragmentation in map-layer/visual-state orchestration.
- Updated `public/js/app/services/mapLayerCleanupBridgeService.js` to additionally expose:
  - `applyActiveTrackVisualState`
  - `applyTrimPreviewVisualState`
  via `getTrackVisualStateViewApi` dependency, alongside map-layer cleanup methods.
- Updated `public/app.js` to route track visual state wrappers through `mapLayerCleanupBridgeService` and removed standalone `trackVisualStateBridgeService` initialization.
- Removed obsolete standalone file `public/js/app/services/trackVisualStateBridgeService.js` and its script include from `public/index.html`.
- Intended behavior remains unchanged; this wave is structural consolidation.

## Implemented in wave 116 (bridge consolidation: stats-aggregate + statistics)
- Consolidated `statsAggregateBridgeService` into `statisticsBridgeService` to reduce thin bridge fragmentation in statistics orchestration.
- Updated `public/js/app/services/statisticsBridgeService.js` to additionally expose:
  - `collectNumericValues`
  - `calculateAverage`
  - `calculateMax`
  via `getStatsAggregateViewApi` dependency, alongside statistics view rendering methods.
- Updated `public/app.js` to route aggregate helper wrappers through `statisticsBridgeService` and removed standalone `statsAggregateBridgeService` initialization.
- Removed obsolete standalone file `public/js/app/services/statsAggregateBridgeService.js` and its script include from `public/index.html`.
- Intended behavior remains unchanged; this wave is structural consolidation.

## Implemented in wave 117 (batch start: analysis threshold-controls + distribution)
- Added automated migration smoke gate script `scripts/migrationSmokeGate.js` and npm command `npm run verify:migration` for repeatable per-wave validation (syntax checks, bridge include parity, `/` + `/api/tracks/rennrad` smoke requests).
- Consolidated `analysisThresholdControlsBridgeService` into `analysisDistributionBridgeService` to reduce thin bridge fragmentation in analysis rendering/control orchestration.
- Updated `public/js/app/services/analysisDistributionBridgeService.js` to additionally expose:
  - `createAnalysisThresholdControlsMarkup`
  - `bindAnalysisThresholdControls`
  via `getAnalysisThresholdControlsViewApi` dependency, alongside analysis distribution helpers.
- Updated `public/app.js` to route threshold-controls wrappers through `analysisDistributionBridgeService` and removed standalone `analysisThresholdControlsBridgeService` initialization.
- Removed obsolete standalone file `public/js/app/services/analysisThresholdControlsBridgeService.js` and its script include from `public/index.html`.
- Intended behavior remains unchanged; this wave is structural consolidation and starts accelerated batch execution.

## Implemented in wave 118 (batch consolidation: utility + UI + cache bridges)
- Consolidated `displayFormatBridgeService` into `formatUtilsBridgeService` by extending formatting delegations via `getDisplayFormatViewApi` dependency.
- Consolidated `chartPanelBridgeService` and `toastNotificationBridgeService` into `panelUiBridgeService` by extending panel/toast delegation methods via `chartPanelService` and `toastNotificationService` dependencies.
- Consolidated `trackCacheBridgeService` into `gpxParserBridgeService` by extending cache delegation methods via `trackCacheService` dependency.
- Updated `public/app.js` wrappers to route through the consolidated target bridges and removed standalone initializations for all four absorbed bridges.
- Removed obsolete standalone files and `public/index.html` script includes:
  - `public/js/app/services/displayFormatBridgeService.js`
  - `public/js/app/services/chartPanelBridgeService.js`
  - `public/js/app/services/toastNotificationBridgeService.js`
  - `public/js/app/services/trackCacheBridgeService.js`
- Intended behavior remains unchanged; this wave is structural consolidation with accelerated batch scope.

## Implemented in wave 119 (batch consolidation: heatmap bridges)
- Consolidated `overlayHeatmapToggleBridgeService`, `heatmapTimeFilterBridgeService`, and `heatmapGradientBridgeService` into `heatmapLayerBridgeService` to reduce bridge fragmentation in heatmap orchestration.
- Updated `public/js/app/services/heatmapLayerBridgeService.js` to additionally expose:
  - overlay/toggle methods: `initHeatmapToggle`, `initHeatmapScopeToggle`, `initOverlayToggle`, `refreshOverlayVisibility`
  - time-filter methods: `getHeatmapPointTimestampMs`, `getHeatmapSeason`, `getHeatmapWeekdayToken`, `isHeatmapPointMatchingTimeFilters`, `initHeatmapTimeFilters`
  - gradient methods: `parseColorToRgb`, `mixRgb`, `rgbToCss`, `getProfileBaseColor`, `buildHeatmapGradientForProfile`
  via `overlayHeatmapToggleService`, `heatmapTimeFilterService`, and `heatmapGradientService` dependencies.
- Updated `public/app.js` wrappers to route all affected heatmap toggle/time-filter/gradient delegations through `heatmapLayerBridgeService` and removed standalone initializations for the three absorbed bridges.
- Removed obsolete standalone files and `public/index.html` script includes:
  - `public/js/app/services/overlayHeatmapToggleBridgeService.js`
  - `public/js/app/services/heatmapTimeFilterBridgeService.js`
  - `public/js/app/services/heatmapGradientBridgeService.js`
- Intended behavior remains unchanged; this wave is structural consolidation with accelerated batch scope.

## Implemented in wave 120 (batch consolidation: trim bridges)
- Consolidated `trimBasicsBridgeService`, `trimPreviewBridgeService`, and `trimInteractionBridgeService` into `trimLifecycleBridgeService` to reduce bridge fragmentation across trim mode orchestration.
- Updated `public/js/app/services/trimLifecycleBridgeService.js` to additionally expose:
  - basics methods: `isTrimModeFor`, `createTrimHandleIcon`, `findNearestPlaybackPointIndex`, `calculateTrimSummary`
  - preview methods: `clearTrimSelectionLayers`, `syncTrimMarkers`, `updateTrimPreview`
  - interaction methods: `refreshDetailsPanelIfPossible`, `setTrimBoundary`, `focusTrimSelection`
  via existing trim view API dependencies plus added `getTrimModeStateViewApi`, `getTrimHandleIconViewApi`, `getTrimSummaryViewApi`, `getTrimPreviewViewApi`, and `getTrimInteractionViewApi` dependencies.
- Updated `public/app.js` wrappers to route all affected trim delegations through `trimLifecycleBridgeService` and removed standalone initializations for the three absorbed bridges.
- Removed obsolete standalone files and `public/index.html` script includes:
  - `public/js/app/services/trimBasicsBridgeService.js`
  - `public/js/app/services/trimPreviewBridgeService.js`
  - `public/js/app/services/trimInteractionBridgeService.js`
- Intended behavior remains unchanged; this wave is structural consolidation with accelerated batch scope.

## Implemented in wave 121 (batch consolidation: outlier bridges)
- Consolidated `outlierHighlightBridgeService` and `outlierModeBridgeService` into `outlierDetectionBridgeService` to reduce bridge fragmentation across outlier detection/highlight/mode orchestration.
- Updated `public/js/app/services/outlierDetectionBridgeService.js` to additionally expose:
  - highlight methods: `clearOutlierSelectionLayers`, `getOutlierCandidateColor`, `refreshOutlierHighlights`, `focusOutlierCandidate`, `setOutlierDecision`
  - mode methods: `applyOutlierPreviewVisualState`, `endOutlierMode`, `beginOutlierMode`, `applyOutlierCleanup`
  via added `getOutlierHighlightViewApi`, `getOutlierModeViewApi`, and `getOutlierCleanupViewApi` dependencies.
- Updated `public/app.js` wrappers to route all affected outlier highlight/mode delegations through `outlierDetectionBridgeService` and removed standalone initializations for the two absorbed bridges.
- Removed obsolete standalone files and `public/index.html` script includes:
  - `public/js/app/services/outlierHighlightBridgeService.js`
  - `public/js/app/services/outlierModeBridgeService.js`
- Intended behavior remains unchanged; this wave is structural consolidation with accelerated batch scope.

## Implemented in wave 122 (batch consolidation: navigation + parser utils + PR alerts)
- Consolidated `filterSearchBridgeService` into `appNavigationBridgeService` by adding filter/search delegation methods (`initFiltersAndSort`, `initSearch`, `initMapFilters`, `applyFiltersAndSort`) via `getFilterSearchViewApi` dependency.
- Consolidated `gpxParserUtilityBridgeService` into `gpxParserBridgeService` by adding parser utility delegation methods (`parseNumericOrNull`, `findFirstDescendantText`, `parseSpeedToKmh`, `toFiniteNumber`) via `getGpxParserViewApi` dependency.
- Consolidated `prAlertsBridgeService` into `prAnalysisBridgeService` by adding PR-alert delegation methods (`buildPersonalRecordSnapshot`, `createPersonalRecordAlertMessages`, `runPersonalRecordAlertCheck`) via `prAlertsService` dependency.
- Updated `public/app.js` wrappers to route all affected filter/search, parser-utility, and PR-alert calls through the consolidated target bridges and removed standalone initializations for the three absorbed bridges.
- Removed obsolete standalone files and `public/index.html` script includes:
  - `public/js/app/services/filterSearchBridgeService.js`
  - `public/js/app/services/gpxParserUtilityBridgeService.js`
  - `public/js/app/services/prAlertsBridgeService.js`
- Intended behavior remains unchanged; this wave is structural consolidation with accelerated batch scope.

## Implemented in wave 123 (batch consolidation: activity/segment/maintenance data)
- Consolidated `activityNoteDataBridgeService`, `segmentFavoritesDataBridgeService`, and `equipmentMaintenanceBridgeService` into `equipmentDataBridgeService` to reduce bridge fragmentation around activity/equipment data orchestration.
- Updated `public/js/app/services/equipmentDataBridgeService.js` to additionally expose:
  - activity-note methods: `getActivityNoteSummary`, `updateActivityNoteSummary`, `setActivityNoteSummaries`, `loadActivityNoteSummaries`, `fetchActivityNote`, `saveActivityNote`
  - segment-favorites methods: `getSegmentFavorites`, `setSegmentFavorites`, `upsertSegmentFavoriteInCache`, `removeSegmentFavoriteFromCache`, `getSegmentFavoriteDraft`, `setSegmentFavoriteDraft`, `clearSegmentFavoriteDraft`, `loadSegmentFavorites`, `createSegmentFavorite`, `updateSegmentFavorite`, `deleteSegmentFavorite`, `buildSegmentFavoriteKey`, `getSegmentFavoriteLabel`, `formatSegmentPointRange`, `getSegmentFavoriteRangeInfo`
  - equipment-maintenance methods: `getTrackDistanceKm`, `buildEquipmentUsageMap`, `getEquipmentMaintenanceStatus`, `getEquipmentStatusClass`, `getEquipmentReminderSummary`
  via added `segmentFavoriteHelperService` and `equipmentMaintenanceService` dependencies plus existing `activityDataService`.
- Updated `public/app.js` wrappers to route all affected activity-note/segment-favorites/maintenance delegations through `equipmentDataBridgeService` and removed standalone initializations for the three absorbed bridges.
- Removed obsolete standalone files and `public/index.html` script includes:
  - `public/js/app/services/activityNoteDataBridgeService.js`
  - `public/js/app/services/segmentFavoritesDataBridgeService.js`
  - `public/js/app/services/equipmentMaintenanceBridgeService.js`
- Intended behavior remains unchanged; this wave is structural consolidation with accelerated batch scope.

## Implemented in wave 124 (batch consolidation: analysis mode + normalization)
- Consolidated `analysisModeBridgeService` and `analysisNormalizationBridgeService` into `analysisDistributionBridgeService` to reduce bridge fragmentation in analysis orchestration.
- Updated `public/js/app/services/analysisDistributionBridgeService.js` to additionally expose:
  - analysis-normalization methods: `clampNumber`, `normalizeAnalysisThresholdEntry`, `normalizeAnalysisThresholdsByProfile`, `normalizeHeatmapTimeFilters`
  - analysis-mode methods: `isAnalysisModeEnabled`, `isAnalysisAvailable`, `syncAnalysisToggleButtons`, `updateAnalysisControlAvailability`, `setAnalysisMode`, `initGradientToggle`
  via added `analysisNormalizationService` and `getAnalysisModeViewApi` dependencies.
- Updated `public/app.js` wrappers to route all affected analysis mode/normalization delegations through `analysisDistributionBridgeService` and removed standalone initializations for the two absorbed bridges.
- Removed obsolete standalone files and `public/index.html` script includes:
  - `public/js/app/services/analysisModeBridgeService.js`
  - `public/js/app/services/analysisNormalizationBridgeService.js`
- Intended behavior remains unchanged; this wave is structural consolidation with accelerated batch scope.

## Implemented in wave 125 (batch consolidation: comparison + persisted selection)
- Consolidated `comparisonBridgeService` into `statisticsBridgeService` by adding comparison delegation methods (`collectComparisonSummary`, `ensureComparisonSelection`, `initComparisonModal`, `showComparisonOnMap`, `renderComparisonModal`) via `getComparisonSummaryViewApi`, `getComparisonSelectionViewApi`, and `getComparisonViewApi` dependencies.
- Consolidated `persistedSelectionBridgeService` into `appNavigationBridgeService` by adding persisted-selection delegation methods (`applyPersistedUiStateToControls`, `getPersistedTrackSelection`, `setPersistedTrackSelection`, `restorePersistedTrackSelection`) via `persistedSelectionService` dependency.
- Updated `public/app.js` wrappers to route all affected comparison/persisted-selection delegations through the consolidated target bridges and removed standalone initializations for the two absorbed bridges.
- Removed obsolete standalone files and `public/index.html` script includes:
  - `public/js/app/services/comparisonBridgeService.js`
  - `public/js/app/services/persistedSelectionBridgeService.js`
- Intended behavior remains unchanged; this wave is structural consolidation with accelerated batch scope.

## Implemented in wave 126 (batch consolidation: home + upload into navigation)
- Consolidated `homeViewBridgeService` and `uploadBridgeService` into `appNavigationBridgeService` to reduce bridge fragmentation around navigation/home/upload orchestration.
- Updated `public/js/app/services/appNavigationBridgeService.js` to additionally expose:
  - home methods: `bindHomeQuickActions`, `renderHomeView`, `populateActivityNoteCard`, `populateTrackEquipmentCard`, `clearTrackFilters`, `openTrackFromHome`
  - upload methods: `initDragAndDrop`, `handleFileUpload`, `resolveDuplicateConflict`, `showDuplicateModal`, `initDeleteAll`, `toggleDeleteAllButton`
  via added `getHomeQuickActionsViewApi`, `getHomeViewApi`, `getHomeTrackNavigationViewApi`, `getActivityNoteViewApi`, `getEquipmentTrackViewApi`, `getUploadViewApi`, and `getDeleteAllViewApi` dependencies.
- Updated `public/app.js` wrappers to route all affected home/upload delegations through `appNavigationBridgeService` and removed standalone initializations for the two absorbed bridges.
- Removed obsolete standalone files and `public/index.html` script includes:
  - `public/js/app/services/homeViewBridgeService.js`
  - `public/js/app/services/uploadBridgeService.js`
- Intended behavior remains unchanged; this wave is structural consolidation with accelerated batch scope.

## Implemented in wave 127 (batch consolidation: health into initialization)
- Consolidated `healthDashboardBridgeService` into `initializationBridgeService` to reduce bridge fragmentation across startup/initialization/health orchestration.
- Updated `public/js/app/services/initializationBridgeService.js` to additionally expose:
  - `getHealthDashboardViewApi`
  - `renderHealthView`
  - `handleHealthUpload`
  - `refreshHealthDashboard`
  - `renderHealthKPIs`
  - `renderHealthMainChart`
  - `renderHealthWeekdayChart`
  via added `resolveViewApi`, `showToast`, and `formatDashboardNumber` dependencies.
- Updated `public/app.js` wrappers to route all affected health delegations through `initializationBridgeService` and removed standalone `healthDashboardBridgeService` initialization.
- Removed obsolete standalone file and `public/index.html` script include:
  - `public/js/app/services/healthDashboardBridgeService.js`
- Intended behavior remains unchanged; this wave is structural consolidation with accelerated batch scope.

## Non-goals in wave 1
- No behavior changes in map, modal, trim, outlier, upload, comparison, equipment, or PR flows.
- No conversion of legacy views to `import/export` yet.
- No removal of any existing script tag.

## Next wave candidates
1. Continue `app.js` getter consolidation for any remaining legacy-style wrappers.
2. Run symbol-usage pass to identify obsolete bridge/dead-code paths after migrated folders.
3. Replace inline/global handlers with explicit event binding to reduce bridge dependency.
