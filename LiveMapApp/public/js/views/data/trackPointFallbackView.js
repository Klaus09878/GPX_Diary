(function attachTrackPointFallbackViewFactory(globalScope) {
    function createTrackPointFallbackView({ calculateSegmentDistanceMeters }) {
        function extractPointsSafely(gpxLayer) {
            let pts = [];
            const elData = gpxLayer.get_elevation_data ? gpxLayer.get_elevation_data() : [];

            if (elData && elData.length > 3) {
                return elData.map(d => ({
                    lat: d[2].lat,
                    lng: d[2].lng,
                    alt: d[1] || 0,
                    dist: d[0] || 0,
                    meta: d[2].meta || {}
                }));
            }

            const appendLatLngs = (latlngs) => {
                latlngs.forEach(ll => {
                    if (Array.isArray(ll)) {
                        appendLatLngs(ll);
                        return;
                    }

                    if (!ll || !Number.isFinite(ll.lat) || !Number.isFinite(ll.lng)) {
                        return;
                    }

                    pts.push({
                        lat: ll.lat,
                        lng: ll.lng,
                        alt: ll.alt || ll.ele || 0,
                        dist: 0,
                        meta: ll.meta || {}
                    });
                });
            };

            gpxLayer.eachLayer(layer => {
                if (layer instanceof L.Polyline) {
                    appendLatLngs(layer.getLatLngs());
                }
            });

            let currentDist = 0;
            for (let i = 0; i < pts.length; i++) {
                if (i > 0) {
                    currentDist += calculateSegmentDistanceMeters(pts[i - 1], pts[i]);
                }
                pts[i].dist = currentDist;
            }

            return pts;
        }

        return {
            extractPointsSafely
        };
    }

    globalScope.createTrackPointFallbackView = createTrackPointFallbackView;
})(window);
