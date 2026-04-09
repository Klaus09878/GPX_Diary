(function attachPlaybackStateManagerFactory(globalScope) {
    function createPlaybackStateManager(accessors = {}) {
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

        function getPlaybackKeybindingsInitialized() {
            return Boolean(read('getPlaybackKeybindingsInitialized', false));
        }

        function setPlaybackKeybindingsInitialized(nextValue) {
            const normalized = Boolean(nextValue);
            return write('setPlaybackKeybindingsInitialized', normalized);
        }

        function getPlaybackPoints() {
            const points = read('getPlaybackPoints', []);
            return Array.isArray(points) ? points : [];
        }

        function setPlaybackPoints(nextValue) {
            const normalized = Array.isArray(nextValue) ? nextValue : [];
            return write('setPlaybackPoints', normalized);
        }

        function getPlaybackSpeed() {
            const speed = Number(read('getPlaybackSpeed', 5));
            return Number.isFinite(speed) && speed > 0 ? speed : 5;
        }

        function setPlaybackSpeed(nextValue) {
            const speed = Number(nextValue);
            const normalized = Number.isFinite(speed) && speed > 0 ? speed : 5;
            return write('setPlaybackSpeed', normalized);
        }

        function getPlaybackIndex() {
            const index = Number(read('getPlaybackIndex', 0));
            return Number.isFinite(index) && index >= 0 ? index : 0;
        }

        function setPlaybackIndex(nextValue) {
            const index = Number(nextValue);
            const normalized = Number.isFinite(index) && index >= 0 ? index : 0;
            return write('setPlaybackIndex', normalized);
        }

        function getPlaybackTimelineSeconds() {
            const timeline = read('getPlaybackTimelineSeconds', []);
            return Array.isArray(timeline) ? timeline : [];
        }

        function setPlaybackTimelineSeconds(nextValue) {
            const normalized = Array.isArray(nextValue) ? nextValue : [];
            return write('setPlaybackTimelineSeconds', normalized);
        }

        function getPlaybackVirtualSeconds() {
            const value = Number(read('getPlaybackVirtualSeconds', 0));
            return Number.isFinite(value) ? value : 0;
        }

        function setPlaybackVirtualSeconds(nextValue) {
            const value = Number(nextValue);
            const normalized = Number.isFinite(value) ? value : 0;
            return write('setPlaybackVirtualSeconds', normalized);
        }

        function getPlaybackLastTickMs() {
            const value = Number(read('getPlaybackLastTickMs', 0));
            return Number.isFinite(value) ? value : 0;
        }

        function setPlaybackLastTickMs(nextValue) {
            const value = Number(nextValue);
            const normalized = Number.isFinite(value) ? value : 0;
            return write('setPlaybackLastTickMs', normalized);
        }

        function getPlaybackTimer() {
            return read('getPlaybackTimer', null);
        }

        function setPlaybackTimer(nextValue) {
            return write('setPlaybackTimer', nextValue);
        }

        function getPlaybackMarker() {
            return read('getPlaybackMarker', null);
        }

        function setPlaybackMarker(nextValue) {
            return write('setPlaybackMarker', nextValue);
        }

        function getIsPlaying() {
            return Boolean(read('getIsPlaying', false));
        }

        function setIsPlaying(nextValue) {
            const normalized = Boolean(nextValue);
            return write('setIsPlaying', normalized);
        }

        return {
            getPlaybackKeybindingsInitialized,
            setPlaybackKeybindingsInitialized,
            getPlaybackPoints,
            setPlaybackPoints,
            getPlaybackSpeed,
            setPlaybackSpeed,
            getPlaybackIndex,
            setPlaybackIndex,
            getPlaybackTimelineSeconds,
            setPlaybackTimelineSeconds,
            getPlaybackVirtualSeconds,
            setPlaybackVirtualSeconds,
            getPlaybackLastTickMs,
            setPlaybackLastTickMs,
            getPlaybackTimer,
            setPlaybackTimer,
            getPlaybackMarker,
            setPlaybackMarker,
            getIsPlaying,
            setIsPlaying
        };
    }

    globalScope.createPlaybackStateManager = createPlaybackStateManager;
})(window);
