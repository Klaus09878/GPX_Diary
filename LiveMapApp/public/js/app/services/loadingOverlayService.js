(function attachLoadingOverlayServiceFactory(globalScope) {
    function createLoadingOverlayService() {
        function showLoadingOverlay(show) {
            let overlay = document.getElementById('app-loading-overlay');

            if (!overlay) {
                overlay = document.createElement('div');
                overlay.id = 'app-loading-overlay';
                overlay.className = 'app-loading-overlay';

                const spinner = document.createElement('div');
                spinner.className = 'app-loading-overlay__spinner';

                const label = document.createElement('span');
                label.className = 'app-loading-overlay__label';
                label.textContent = 'Lade Routen...';

                overlay.appendChild(spinner);
                overlay.appendChild(label);
                document.body.appendChild(overlay);
            }

            overlay.style.display = show ? 'flex' : 'none';
        }

        return {
            showLoadingOverlay
        };
    }

    globalScope.createLoadingOverlayService = createLoadingOverlayService;
})(window);
