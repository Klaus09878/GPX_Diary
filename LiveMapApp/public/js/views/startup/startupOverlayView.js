(function attachStartupOverlayViewFactory(globalScope) {
    function createStartupOverlayView({ startupLoadingMinMs, getStartupIntroDismissed, setStartupIntroDismissed }) {
        let startupLoadingShownAt = 0;
        let introPending = false;
        let resolveIntroAcknowledged = null;
        let introAcknowledgedPromise = Promise.resolve();

        function delay(ms) {
            return new Promise(resolve => window.setTimeout(resolve, ms));
        }

        function getStartupOverlayElements() {
            return {
                overlay: document.getElementById('startup-overlay'),
                status: document.getElementById('startup-status-text'),
                count: document.getElementById('startup-progress-count'),
                percent: document.getElementById('startup-progress-percent'),
                fill: document.getElementById('startup-progress-fill'),
                rider: document.getElementById('startup-journey-rider'),
                introContinueButton: document.getElementById('startup-intro-continue'),
                introHideNextCheckbox: document.getElementById('startup-intro-hide-next')
            };
        }

        function setStartupOverlayPhase(phase) {
            const { overlay } = getStartupOverlayElements();
            if (!overlay) return;

            const normalizedPhase = phase === 'intro' ? 'intro' : 'loading';
            overlay.classList.remove('is-intro', 'is-welcome', 'is-loading', 'is-hidden');
            overlay.classList.add(`is-${normalizedPhase}`);
        }

        function shouldShowStartupIntro() {
            return typeof getStartupIntroDismissed === 'function' ? getStartupIntroDismissed() !== true : true;
        }

        function rememberStartupIntroPreference(hideOnNextBoot) {
            if (typeof setStartupIntroDismissed === 'function') {
                setStartupIntroDismissed(hideOnNextBoot === true);
            }
        }

        function acknowledgeStartupIntro() {
            const { introHideNextCheckbox } = getStartupOverlayElements();
            rememberStartupIntroPreference(Boolean(introHideNextCheckbox?.checked));

            introPending = false;
            setStartupOverlayPhase('loading');
            ensureStartupLoadingPhase();

            if (typeof resolveIntroAcknowledged === 'function') {
                resolveIntroAcknowledged();
                resolveIntroAcknowledged = null;
            }
        }

        function setupStartupIntroInteraction() {
            const { introContinueButton, introHideNextCheckbox } = getStartupOverlayElements();
            if (introHideNextCheckbox) {
                introHideNextCheckbox.checked = false;
            }

            introAcknowledgedPromise = new Promise(resolve => {
                resolveIntroAcknowledged = resolve;
            });

            if (introContinueButton) {
                introContinueButton.onclick = acknowledgeStartupIntro;
            } else {
                acknowledgeStartupIntro();
            }
        }

        function ensureStartupLoadingPhase() {
            if (!startupLoadingShownAt) {
                startupLoadingShownAt = Date.now();
            }
        }

        function updateStartupProgress({ total = 0, processed = 0, statusText = '' } = {}) {
            const { status, count, percent, fill } = getStartupOverlayElements();
            const safeTotal = Math.max(0, total);
            const safeProcessed = Math.max(0, Math.min(processed, safeTotal || processed));
            const progressPercent = safeTotal > 0 ? Math.round((safeProcessed / safeTotal) * 100) : 0;

            if (!introPending) {
                ensureStartupLoadingPhase();
            }

            if (status && statusText) {
                status.textContent = statusText;
                status.title = statusText;
            }

            if (count) {
                if (safeTotal > 0) {
                    count.textContent = `${safeProcessed} / ${safeTotal} GPX-Dateien eingelesen`;
                } else {
                    count.textContent = statusText ? '' : 'Profile und GPX-Dateien werden gesucht...';
                }
            }

            if (percent) {
                percent.textContent = safeTotal > 0 ? `${progressPercent}%` : '';
            }

            if (fill) {
                fill.style.width = `${progressPercent}%`;
            }
        }

        function beginStartupExperience() {
            const { overlay } = getStartupOverlayElements();

            if (!overlay) {
                return {
                    finish: async () => {}
                };
            }

            overlay.classList.add('is-visible');
            startupLoadingShownAt = 0;
            introPending = shouldShowStartupIntro();

            if (introPending) {
                setStartupOverlayPhase('intro');
                setupStartupIntroInteraction();
            } else {
                setStartupOverlayPhase('loading');
                ensureStartupLoadingPhase();
            }

            updateStartupProgress({ statusText: 'Profile und GPX-Dateien werden gesucht...' });

            return {
                finish: async () => {
                    if (introPending) {
                        await introAcknowledgedPromise;
                    }

                    setStartupOverlayPhase('loading');
                    ensureStartupLoadingPhase();

                    if (startupLoadingShownAt) {
                        const visibleForMs = Date.now() - startupLoadingShownAt;
                        if (visibleForMs < startupLoadingMinMs) {
                            await delay(startupLoadingMinMs - visibleForMs);
                        }
                    }

                    overlay.classList.remove('is-visible', 'is-welcome', 'is-loading');
                    overlay.classList.add('is-hidden');
                }
            };
        }

        return {
            updateStartupProgress,
            beginStartupExperience
        };
    }

    globalScope.createStartupOverlayView = createStartupOverlayView;
})(window);
