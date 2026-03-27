(function attachPlaybackControlServiceFactory(globalScope) {
    function createPlaybackControlService({
        getPlaybackKeybindingsInitialized,
        setPlaybackKeybindingsInitialized,
        getActiveTrackName,
        getPlaybackPoints,
        getIsPlaying,
        getPlaybackSpeed,
        getPlaybackIndex,
        setPlaybackIndexState,
        getPlaybackTimelineSeconds,
        setPlaybackTimelineSeconds,
        getPlaybackVirtualSeconds,
        setPlaybackVirtualSeconds,
        getPlaybackLastTickMs,
        setPlaybackLastTickMs,
        getPlaybackTimer,
        setPlaybackTimer,
        setIsPlaying,
        syncAllCharts,
        rebuildPlaybackTimeline,
        getPlaybackIndexForVirtualTime,
        showToast,
        clearChartSync
        ,
        setPlaybackMarker
    }) {
        function updatePlaybackControlState() {
            const button = document.getElementById('playback-toggle-btn');
            const speedSelect = document.getElementById('playback-speed-select');
            const status = document.getElementById('playback-status');
            const isPlaying = getIsPlaying();
            const playbackPoints = getPlaybackPoints();
            const playbackIndex = getPlaybackIndex();
            const playbackSpeed = getPlaybackSpeed();

            if (button) {
                button.classList.toggle('playing', isPlaying);
                button.textContent = isPlaying ? '⏸' : '▶';
            }

            if (speedSelect) {
                speedSelect.value = String(playbackSpeed);
                speedSelect.disabled = !playbackPoints.length;
            }

            if (status) {
                if (!playbackPoints.length) {
                    status.textContent = 'Keine Playback-Daten';
                } else {
                    status.textContent = `Punkt ${Math.min(playbackIndex + 1, playbackPoints.length)}/${playbackPoints.length}`;
                }
            }
        }

        function setPlaybackIndex(nextIndex) {
            const playbackPoints = getPlaybackPoints();
            if (!playbackPoints.length) {
                return;
            }

            const clamped = Math.max(0, Math.min(playbackPoints.length - 1, nextIndex));
            const playbackTimelineSeconds = getPlaybackTimelineSeconds();
            if (playbackTimelineSeconds.length === playbackPoints.length) {
                setPlaybackVirtualSeconds(playbackTimelineSeconds[clamped] || getPlaybackVirtualSeconds());
            }

            setPlaybackIndexState(clamped);
            syncAllCharts(clamped);
        }

        function stepPlayback(stepDelta) {
            const playbackPoints = getPlaybackPoints();
            if (!playbackPoints.length) {
                showToast('Keine Punkte für Playback verfügbar.', 'warning');
                return;
            }

            setPlaybackIndex(getPlaybackIndex() + stepDelta);
        }

        function pausePlayback() {
            const playbackTimer = getPlaybackTimer();
            if (playbackTimer) {
                clearInterval(playbackTimer);
                setPlaybackTimer(null);
            }
            setPlaybackLastTickMs(0);
            setIsPlaying(false);
            updatePlaybackControlState();
        }

        function startPlaybackLoop() {
            const playbackPoints = getPlaybackPoints();
            if (!playbackPoints.length) {
                return;
            }

            pausePlayback();

            let playbackTimelineSeconds = getPlaybackTimelineSeconds();
            if (playbackTimelineSeconds.length !== playbackPoints.length) {
                rebuildPlaybackTimeline();
                playbackTimelineSeconds = getPlaybackTimelineSeconds();
            }

            const playbackDurationSeconds = playbackTimelineSeconds[playbackTimelineSeconds.length - 1] || 0;

            setIsPlaying(true);
            updatePlaybackControlState();
            syncAllCharts(getPlaybackIndex());

            setPlaybackVirtualSeconds(playbackTimelineSeconds[getPlaybackIndex()] || 0);
            setPlaybackLastTickMs(performance.now());

            const intervalMs = 40;
            const playbackTimer = window.setInterval(() => {
                const now = performance.now();
                const elapsedSeconds = Math.max(0, Math.min((now - getPlaybackLastTickMs()) / 1000, 0.8));
                setPlaybackLastTickMs(now);

                setPlaybackVirtualSeconds(getPlaybackVirtualSeconds() + elapsedSeconds * getPlaybackSpeed());

                const nextIndex = getPlaybackIndexForVirtualTime(getPlaybackVirtualSeconds());
                if (nextIndex !== getPlaybackIndex()) {
                    setPlaybackIndex(nextIndex);
                }

                const latestPlaybackPoints = getPlaybackPoints();
                if (nextIndex >= latestPlaybackPoints.length - 1 || getPlaybackVirtualSeconds() >= playbackDurationSeconds) {
                    setPlaybackIndex(latestPlaybackPoints.length - 1);
                    pausePlayback();
                    showToast('Playback beendet.', 'info');
                }
            }, intervalMs);

            setPlaybackTimer(playbackTimer);
        }

        function togglePlayback() {
            if (getIsPlaying()) {
                pausePlayback();
                return;
            }

            const playbackPoints = getPlaybackPoints();
            if (!playbackPoints.length) {
                showToast('Keine Playback-Daten im ausgewählten Track.', 'warning');
                return;
            }

            if (getPlaybackIndex() >= playbackPoints.length - 1) {
                setPlaybackIndexState(0);
            }

            startPlaybackLoop();
        }

        function stopPlayback() {
            pausePlayback();
            setPlaybackIndexState(0);
            setPlaybackVirtualSeconds(0);
            setPlaybackTimelineSeconds([]);
            clearChartSync();
            setPlaybackMarker(null);
            updatePlaybackControlState();
        }

        function initPlaybackUI() {
            if (getPlaybackKeybindingsInitialized()) {
                return;
            }

            document.addEventListener('keydown', (event) => {
                const targetTag = event.target?.tagName?.toLowerCase();
                const isTextInput = targetTag === 'input' || targetTag === 'textarea' || targetTag === 'select';
                if (isTextInput) {
                    return;
                }

                if (!getActiveTrackName() || !getPlaybackPoints().length) {
                    return;
                }

                if (event.code === 'Space') {
                    event.preventDefault();
                    togglePlayback();
                    return;
                }

                if (event.code === 'ArrowRight') {
                    event.preventDefault();
                    pausePlayback();
                    stepPlayback(1);
                    return;
                }

                if (event.code === 'ArrowLeft') {
                    event.preventDefault();
                    pausePlayback();
                    stepPlayback(-1);
                    return;
                }

                if (event.code === 'Escape') {
                    stopPlayback();
                }
            });

            setPlaybackKeybindingsInitialized(true);
        }

        return {
            initPlaybackUI,
            updatePlaybackControlState,
            setPlaybackIndex,
            stepPlayback,
            togglePlayback,
            pausePlayback,
            startPlaybackLoop,
            stopPlayback
        };
    }

    globalScope.createPlaybackControlService = createPlaybackControlService;
})(window);
