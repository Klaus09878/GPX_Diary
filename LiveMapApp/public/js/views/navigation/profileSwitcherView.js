(function attachProfileSwitcherViewFactory(globalScope) {
    function createProfileSwitcherView({
        apiBase,
        getCurrentProfile,
        setCurrentProfile,
        performProfileSwitch,
        getAvailableProfiles,
        setAvailableProfiles,
        nextProfileSwitchRequestId,
        getProfileSwitchRequestId,
        resetCompareSelectionProfile,
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
    }) {
        function getProfilesFromButtons() {
            return Array.from(document.querySelectorAll('.profile-btn'))
                .map(btn => btn.getAttribute('data-profile'))
                .filter(Boolean);
        }

        async function initializeProfiles() {
            const fallback = getProfilesFromButtons();
            let availableProfiles = getAvailableProfiles();

            try {
                const res = await fetch(`${apiBase}/profiles`);
                if (res.ok) {
                    const serverProfiles = await res.json();
                    if (Array.isArray(serverProfiles) && serverProfiles.length > 0) {
                        availableProfiles = serverProfiles;
                        setAvailableProfiles(availableProfiles);
                    }
                }
            } catch (err) {
                console.warn('Could not load profiles from API, fallback to UI defaults.', err);
            }

            if (!availableProfiles.length) {
                availableProfiles = fallback.length ? fallback : ['motorrad', 'rennrad', 'laufen', 'spazieren'];
                setAvailableProfiles(availableProfiles);
            }

            const profileSet = new Set(availableProfiles);
            const buttons = document.querySelectorAll('.profile-btn');
            buttons.forEach(btn => {
                const profile = btn.getAttribute('data-profile');
                btn.style.display = profileSet.has(profile) ? '' : 'none';
                btn.classList.remove('active');
            });

            let currentProfile = getCurrentProfile();
            if (!profileSet.has(currentProfile)) {
                currentProfile = availableProfiles[0];
                setCurrentProfile(currentProfile);
            }

            const activeBtn = document.querySelector(`.profile-btn[data-profile="${currentProfile}"]`);
            if (activeBtn) {
                activeBtn.classList.add('active');
            }

            document.documentElement.style.setProperty('--active-theme-color', `var(--${currentProfile}-color)`);
            persistUiState();
        }

        function initProfileSwitcher() {
            const buttons = document.querySelectorAll('.profile-btn');
            buttons.forEach(btn => {
                btn.onclick = async (e) => {
                    const currentProfile = getCurrentProfile();
                    const nextProfile = e.currentTarget?.getAttribute('data-profile');
                    if (!nextProfile || nextProfile === currentProfile) {
                        return;
                    }

                    const switchRequestId = nextProfileSwitchRequestId();
                    buttons.forEach(b => b.classList.toggle('active', b === e.currentTarget));

                    if (typeof performProfileSwitch === 'function') {
                        let switched = false;
                        try {
                            switched = await performProfileSwitch(nextProfile, { reloadData: false }) === true;
                        } catch (error) {
                            console.error(error);
                        }

                        if (!switched || switchRequestId !== getProfileSwitchRequestId()) {
                            buttons.forEach(b => {
                                const profile = b.getAttribute('data-profile');
                                b.classList.toggle('active', profile === currentProfile);
                            });
                            return;
                        }
                    }

                    clearComparisonOverlay();
                    clearPrHighlightLayer();
                    resetCompareSelectionProfile();

                    setCurrentProfile(nextProfile);
                    document.documentElement.style.setProperty('--active-theme-color', `var(--${nextProfile}-color)`);

                    updateSpeedLabels();
                    updateElevationLabels();
                    showProfileTracks(nextProfile);
                    persistUiState();

                    const loadResults = await Promise.allSettled([
                        loadActivityNoteSummaries(nextProfile),
                        loadEquipment(nextProfile),
                        loadEquipmentAssignments(nextProfile)
                    ]);

                    if (switchRequestId !== getProfileSwitchRequestId() || getCurrentProfile() !== nextProfile) {
                        return;
                    }

                    loadResults.forEach(result => {
                        if (result.status === 'rejected') {
                            console.error(result.reason);
                        }
                    });

                    renderHomeView();
                    renderAnalysesView();
                    renderStatisticsView();

                    const equipmentModal = document.getElementById('equipment-modal');
                    if (isModalOpen(equipmentModal)) {
                        renderEquipmentModal().catch(error => {
                            console.error(error);
                        });
                    }

                    if (isDashboardOpen()) {
                        renderDashboard();
                    }

                    await restorePersistedTrackSelection(nextProfile);
                    if (switchRequestId !== getProfileSwitchRequestId() || getCurrentProfile() !== nextProfile) {
                        return;
                    }

                    updateAnalysisControlAvailability();
                    runPersonalRecordAlertCheck();
                };
            });
        }

        return {
            initializeProfiles,
            initProfileSwitcher
        };
    }

    globalScope.createProfileSwitcherView = createProfileSwitcherView;
})(window);
