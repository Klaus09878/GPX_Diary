(function attachMapInitViewFactory(globalScope) {
    function createMapInitView({ setMap }) {
        function initMap() {
            const map = L.map('map', { zoomControl: false }).setView([51.1657, 10.4515], 6);
            setMap(map);

            const baseLayers = {
                "dark": L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', { attribution: '&copy; CARTO' }),
                "standard": L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '&copy; OpenStreetMap' }),
                "standard-dim": L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '&copy; OpenStreetMap' }),
                "voyager": L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', { attribution: '&copy; CARTO, OpenStreetMap' }),
                "satellit": L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', { attribution: '&copy; Esri' }),
                "outdoor": L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', { attribution: '&copy; OpenTopoMap' })
            };

            baseLayers["dark"].addTo(map);
            let activeBaseLayer = "dark";
            const mapElement = map.getContainer();

            const updateBaseLayerMood = (layerKey) => {
                if (!mapElement) {
                    return;
                }

                mapElement.classList.toggle('layer-mood-osm-dim', layerKey === 'standard-dim');
            };

            updateBaseLayerMood(activeBaseLayer);

            document.querySelectorAll('.layer-btn').forEach(btn => {
                const layerKey = btn.getAttribute('data-layer');
                if (layerKey === 'dark') btn.classList.add('active');

                btn.addEventListener('click', () => {
                    if (!layerKey || !baseLayers[layerKey]) return;
                    if (activeBaseLayer === layerKey) return;
                    map.removeLayer(baseLayers[activeBaseLayer]);
                    baseLayers[layerKey].addTo(map);
                    activeBaseLayer = layerKey;
                    updateBaseLayerMood(activeBaseLayer);
                    document.querySelectorAll('.layer-btn').forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                });
            });

            L.control.zoom({ position: 'bottomright' }).addTo(map);
        }

        return {
            initMap
        };
    }

    globalScope.createMapInitView = createMapInitView;
})(window);
