(function attachTrackSelectionManagerFactory(globalScope) {
    function createTrackSelectionManager(accessors = {}) {
        function read(name, fallback) {
            const getter = accessors[name];
            return typeof getter === 'function' ? getter() : fallback;
        }

        function write(name, value) {
            const setter = accessors[name];
            if (typeof setter === 'function') {
                setter(value);
            }
            return value;
        }

        function getActiveTrackName() {
            const trackName = read('getActiveTrackName', null);
            return typeof trackName === 'string' && trackName ? trackName : null;
        }

        function setActiveTrackName(nextValue) {
            const normalized = typeof nextValue === 'string' && nextValue ? nextValue : null;
            return write('setActiveTrackName', normalized);
        }

        function getSelectionRequestId() {
            const requestId = Number(read('getSelectionRequestId', 0));
            return Number.isFinite(requestId) && requestId >= 0 ? requestId : 0;
        }

        function setSelectionRequestId(nextValue) {
            const requestId = Number(nextValue);
            const normalized = Number.isFinite(requestId) && requestId >= 0 ? requestId : 0;
            return write('setSelectionRequestId', normalized);
        }

        function nextSelectionRequestId() {
            const nextRequestId = getSelectionRequestId() + 1;
            return write('setSelectionRequestId', nextRequestId);
        }

        function getLastSelectedTrackByProfile() {
            const byProfile = read('getLastSelectedTrackByProfile', {});
            return byProfile && typeof byProfile === 'object' ? byProfile : {};
        }

        function setLastSelectedTrackByProfile(nextValue) {
            const normalized = nextValue && typeof nextValue === 'object' ? nextValue : {};
            return write('setLastSelectedTrackByProfile', normalized);
        }

        return {
            getActiveTrackName,
            setActiveTrackName,
            getSelectionRequestId,
            setSelectionRequestId,
            nextSelectionRequestId,
            getLastSelectedTrackByProfile,
            setLastSelectedTrackByProfile
        };
    }

    globalScope.createTrackSelectionManager = createTrackSelectionManager;
})(window);
