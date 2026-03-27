(function attachTrimHandleIconViewFactory(globalScope) {
    function createTrimHandleIconView({
        leaflet
    }) {
        function createTrimHandleIcon(kind) {
            const label = kind === 'start' ? 'Start' : 'Ende';
            return leaflet.divIcon({
                className: `trim-handle-icon trim-handle-icon--${kind}`,
                html: `<span class="trim-handle trim-handle--${kind}">${label}</span>`,
                iconSize: [62, 28],
                iconAnchor: [31, 14]
            });
        }

        return {
            createTrimHandleIcon
        };
    }

    globalScope.createTrimHandleIconView = createTrimHandleIconView;
})(window);
