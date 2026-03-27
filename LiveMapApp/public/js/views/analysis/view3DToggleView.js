(function attachView3DToggleViewFactory(globalScope) {
    function createView3DToggleView({ getMap, showToast }) {
        function initView3DToggle() {
            const btn = document.getElementById('view-3d-toggle');
            if (!btn) return;
            btn.onclick = () => {
                const container = document.querySelector('.map-container');
                const isActive = container.classList.toggle('view-3d-active');
                setTimeout(() => getMap()?.invalidateSize(), 800);
                if (isActive) showToast('3D-Ansicht aktiviert', 'success');
            };
        }

        return {
            initView3DToggle
        };
    }

    globalScope.createView3DToggleView = createView3DToggleView;
})(window);
