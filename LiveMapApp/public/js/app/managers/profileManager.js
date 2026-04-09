(function attachProfileManagerFactory(globalScope) {
    function createProfileManager({
        initialProfile = 'motorrad',
        initialAvailableProfiles = [],
        initialSwitchRequestId = 0
    } = {}) {
        let currentProfile = typeof initialProfile === 'string' && initialProfile ? initialProfile : 'motorrad';
        let availableProfiles = Array.isArray(initialAvailableProfiles) ? [...initialAvailableProfiles] : [];
        let switchRequestId = Number.isInteger(initialSwitchRequestId) && initialSwitchRequestId >= 0
            ? initialSwitchRequestId
            : 0;

        function getCurrentProfile() {
            return currentProfile;
        }

        function setCurrentProfile(nextProfile) {
            if (typeof nextProfile === 'string' && nextProfile) {
                currentProfile = nextProfile;
            }
            return currentProfile;
        }

        function getAvailableProfiles() {
            return [...availableProfiles];
        }

        function setAvailableProfiles(nextProfiles) {
            availableProfiles = Array.isArray(nextProfiles)
                ? nextProfiles.filter(profile => typeof profile === 'string' && profile)
                : [];
            return getAvailableProfiles();
        }

        function getProfileSwitchRequestId() {
            return switchRequestId;
        }

        function setProfileSwitchRequestId(nextRequestId) {
            if (Number.isInteger(nextRequestId) && nextRequestId >= 0) {
                switchRequestId = nextRequestId;
            }
            return switchRequestId;
        }

        function nextProfileSwitchRequestId() {
            switchRequestId += 1;
            return switchRequestId;
        }

        return {
            getCurrentProfile,
            setCurrentProfile,
            getAvailableProfiles,
            setAvailableProfiles,
            getProfileSwitchRequestId,
            setProfileSwitchRequestId,
            nextProfileSwitchRequestId
        };
    }

    globalScope.createProfileManager = createProfileManager;
})(window);
