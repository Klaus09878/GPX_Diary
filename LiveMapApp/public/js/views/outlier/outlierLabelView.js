(function attachOutlierLabelViewFactory(globalScope) {
    function createOutlierLabelView({
        toFiniteNumber
    }) {
        function formatOutlierPointLabel(point, fallbackIndex) {
            const timeMs = toFiniteNumber(point?.meta?.timeMs);
            if (timeMs !== null) {
                return new Date(timeMs).toLocaleString('de-DE', { dateStyle: 'short', timeStyle: 'short' });
            }

            return `Punkt ${fallbackIndex + 1}`;
        }

        return {
            formatOutlierPointLabel
        };
    }

    globalScope.createOutlierLabelView = createOutlierLabelView;
})(window);
