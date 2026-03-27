(function attachHeatmapGradientServiceFactory(globalScope) {
    function createHeatmapGradientService() {
        function parseColorToRgb(colorValue) {
            if (!colorValue) {
                return { r: 239, g: 68, b: 68 };
            }

            const probe = document.createElement('span');
            probe.style.color = colorValue;
            probe.style.display = 'none';
            document.body.appendChild(probe);
            const computed = window.getComputedStyle(probe).color;
            probe.remove();

            const matches = computed.match(/\d+/g);
            if (!matches || matches.length < 3) {
                return { r: 239, g: 68, b: 68 };
            }

            return {
                r: Number(matches[0]),
                g: Number(matches[1]),
                b: Number(matches[2])
            };
        }

        function mixRgb(fromRgb, toRgb, ratio) {
            const t = Math.max(0, Math.min(1, ratio));
            return {
                r: Math.round(fromRgb.r + (toRgb.r - fromRgb.r) * t),
                g: Math.round(fromRgb.g + (toRgb.g - fromRgb.g) * t),
                b: Math.round(fromRgb.b + (toRgb.b - fromRgb.b) * t)
            };
        }

        function rgbToCss(rgb, alpha = 1) {
            const safeAlpha = Math.max(0, Math.min(1, alpha));
            return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${safeAlpha})`;
        }

        function getProfileBaseColor(profile) {
            const cssColor = getComputedStyle(document.documentElement)
                .getPropertyValue(`--${profile}-color`)
                .trim();

            if (cssColor) {
                return cssColor;
            }

            return '#38bdf8';
        }

        function buildHeatmapGradientForProfile(profile) {
            const baseRgb = parseColorToRgb(getProfileBaseColor(profile));
            const redRgb = parseColorToRgb('#ef4444');
            const warmRgb = mixRgb(baseRgb, redRgb, 0.55);
            const hotRgb = mixRgb(baseRgb, redRgb, 0.78);

            return {
                0.12: rgbToCss(baseRgb, 0.35),
                0.45: rgbToCss(baseRgb, 0.82),
                0.72: rgbToCss(warmRgb, 0.94),
                0.9: rgbToCss(hotRgb, 1),
                1.0: '#ef4444'
            };
        }

        return {
            parseColorToRgb,
            mixRgb,
            rgbToCss,
            getProfileBaseColor,
            buildHeatmapGradientForProfile
        };
    }

    globalScope.createHeatmapGradientService = createHeatmapGradientService;
})(window);
