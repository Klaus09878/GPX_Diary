(function attachHtmlEscapeServiceFactory(globalScope) {
    function createHtmlEscapeService() {
        function escapeHtml(value) {
            return String(value ?? '')
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#39;');
        }

        return {
            escapeHtml
        };
    }

    globalScope.createHtmlEscapeService = createHtmlEscapeService;
})(window);
