/**
 * Frontend State Orchestrators
 * 
 * Handles complex state transitions that involve multiple side effects:
 * - Profile switch (clears maps, caches, selections, reloads data)
 * - Analysis mode toggle (affects UI, charts, overlays)
 * - Track selection (affects cache, markers, panels)
 * 
 * These MUST be used instead of inline mutations to prevent race conditions,
 * partial state leaks, and unpredictable behavior.
 */

const frontendOrchestrators = (() => {
    /**
     * Atomically switch profile and its dependent state
     * 1. Clear previous profile's UI elements (maps, selections)
     * 2. Update core profile state
     * 3. Reload profile-specific data (tracks, equipment, notes)
     * 4. Rebuild UI accordingly
     */
    async function performProfileSwitch(newProfile, options = {}) {
        const { reloadData = true } = options;
        if (!newProfile) {
            console.warn('[Orchestrator] Profile switch requires valid profile');
            return false;
        }

        try {
            // Step 1: Clean up previous profile's UI
            const oldProfile = appStore.selectStateRaw('ui.currentProfile');
            if (oldProfile !== newProfile) {
                // Clear edit modes that belong to old profile
                const trimSelection = appStore.selectStateRaw('editModes.trimSelection');
                if (trimSelection && trimSelection.profile === oldProfile) {
                    appStore.setState({ 'editModes.trimSelection': null });
                }

                const outlierSelection = appStore.selectStateRaw('editModes.outlierSelection');
                if (outlierSelection && outlierSelection.profile === oldProfile) {
                    appStore.setState({ 'editModes.outlierSelection': null });
                }

                // Clear track selection
                appStore.setState({
                    'selectedTrack.profile': null,
                    'selectedTrack.filename': null
                });

                // Clear playback
                appStore.setState({
                    'playback.isPlaying': false,
                    'playback.currentIndex': 0
                });
            }

            // Step 2: Update profile state
            appStore.setState({
                'ui.currentProfile': newProfile,
                'features.profileSwitchRequestId': (appStore.selectStateRaw('features.profileSwitchRequestId') || 0) + 1
            });

            // Step 3: Reload profile-specific data in parallel
            // This will trigger data load via subscription listeners
            if (reloadData) {
                const [tracks, equipment, notes] = await Promise.all([
                    frontendApiClient.getTracks(newProfile).catch(err => {
                        console.error(`[Orchestrator] Failed to load tracks for ${newProfile}:`, err);
                        return [];
                    }),
                    frontendApiClient.getEquipment(newProfile).catch(err => {
                        console.error(`[Orchestrator] Failed to load equipment for ${newProfile}:`, err);
                        return [];
                    }),
                    frontendApiClient.getActivityNotes(newProfile).catch(err => {
                        console.error(`[Orchestrator] Failed to load activity notes for ${newProfile}:`, err);
                        return [];
                    })
                ]);

                // Step 4: Cache loaded data
                const dataCaches = appStore.selectStateRaw('dataCaches');
                dataCaches.equipment[newProfile] = equipment;
                dataCaches.activityNotes[newProfile] = notes;
            }

            console.log(`[Orchestrator] Profile switch to "${newProfile}" completed successfully`);
            return true;
        } catch (error) {
            console.error('[Orchestrator] Profile switch failed:', error);
            return false;
        }
    }

    /**
     * Atomically toggle analysis mode
     * Affects: UI indicators, overlay layers, chart rendering, cache invalidation
     */
    async function performAnalysisModeSwitch(newMode) {
        const validModes = ['off', 'speed', 'steep'];
        if (!validModes.includes(newMode)) {
            console.warn(`[Orchestrator] Invalid analysis mode: ${newMode}`);
            return false;
        }

        try {
            const oldMode = appStore.selectStateRaw('analysis.mode');

            // Step 1: Invalidate analysis cache when mode changes
            if (oldMode !== newMode) {
                appStore.setState({
                    'analysis.distributionCacheGeneration': -1,
                    'analysis.mode': newMode
                });
            }

            // Step 2: Log the transition for debugging
            console.log(`[Orchestrator] Analysis mode change: "${oldMode}" → "${newMode}"`);
            return true;
        } catch (error) {
            console.error('[Orchestrator] Analysis mode switch failed:', error);
            return false;
        }
    }

    /**
     * Atomically select a track
     * Affects: marker position, elevation panel, playback state
     */
    function performTrackSelection(profile, filename) {
        try {
            const oldProfile = appStore.selectStateRaw('selectedTrack.profile');
            const oldFilename = appStore.selectStateRaw('selectedTrack.filename');

            if (oldProfile === profile && oldFilename === filename) {
                // Already selected, no-op
                return true;
            }

            // Stop playback if switching tracks
            if (oldFilename !== filename) {
                appStore.setState({
                    'playback.isPlaying': false,
                    'playback.currentIndex': 0
                });
            }

            // Update selection
            appStore.setState({
                'selectedTrack.profile': profile,
                'selectedTrack.filename': filename
            });

            console.log(`[Orchestrator] Track selected: ${profile}/${filename}`);
            return true;
        } catch (error) {
            console.error('[Orchestrator] Track selection failed:', error);
            return false;
        }
    }

    /**
     * Atomically start/stop playback
     * Ensures playback state consistency
     */
    function performPlaybackToggle(shouldPlay) {
        try {
            const profile = appStore.selectStateRaw('selectedTrack.profile');
            const filename = appStore.selectStateRaw('selectedTrack.filename');

            if (shouldPlay && (!profile || !filename)) {
                console.warn('[Orchestrator] Cannot start playback: no track selected');
                return false;
            }

            appStore.setState({
                'playback.isPlaying': shouldPlay,
                'playback.currentIndex': shouldPlay ? appStore.selectStateRaw('playback.currentIndex') : 0
            });

            console.log(`[Orchestrator] Playback ${shouldPlay ? 'started' : 'stopped'}`);
            return true;
        } catch (error) {
            console.error('[Orchestrator] Playback toggle failed:', error);
            return false;
        }
    }

    /**
     * Atomically clear all edit modes and selections
     * Used during profile switch or cleanup
     */
    function performCleanupEditModes(profile = null) {
        try {
            appStore.setState({
                'editModes.trimSelection': null,
                'editModes.outlierSelection': null,
                'editModes.compareSelection': { profile: null, leftFilename: null, rightFilename: null },
                'editModes.prHighlightLayer': null
            });

            console.log(`[Orchestrator] Edit modes cleared${profile ? ` for profile ${profile}` : ''}`);
            return true;
        } catch (error) {
            console.error('[Orchestrator] Edit mode cleanup failed:', error);
            return false;
        }
    }

    return {
        performProfileSwitch,
        performAnalysisModeSwitch,
        performTrackSelection,
        performPlaybackToggle,
        performCleanupEditModes
    };
})();

// Expose to window for debugging and legacy compatibility
window.frontendOrchestrators = frontendOrchestrators;
