const { createGpxTransformService } = require('../src/server/gpx/gpxTransformService');

describe('GPX transform service', () => {
    const { trimGpxXml, removeGpxPointRanges } = createGpxTransformService();

    const sampleGpx = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="test">
  <metadata>
    <bounds minlat="50" minlon="8" maxlat="51" maxlon="9" />
  </metadata>
  <trk>
    <name>Test</name>
    <trkseg>
      <trkpt lat="50.0" lon="8.0"><time>2026-03-04T10:00:00Z</time></trkpt>
      <trkpt lat="50.1" lon="8.1"><time>2026-03-04T10:01:00Z</time></trkpt>
      <trkpt lat="50.2" lon="8.2"><time>2026-03-04T10:02:00Z</time></trkpt>
      <trkpt lat="50.3" lon="8.3"><time>2026-03-04T10:03:00Z</time></trkpt>
    </trkseg>
  </trk>
</gpx>`;

    it('trims a GPX document to the requested point range', async () => {
        const trimmed = await trimGpxXml(sampleGpx, 0, 1);

        expect(trimmed).toContain('lat="50.0" lon="8.0"');
        expect(trimmed).toContain('lat="50.1" lon="8.1"');
        expect(trimmed).not.toContain('lat="50.2" lon="8.2"');
        expect(trimmed).not.toContain('lat="50.3" lon="8.3"');
    });

    it('removes point ranges and reports the remaining count', async () => {
        const result = await removeGpxPointRanges(sampleGpx, [{ startIndex: 1, endIndex: 2 }]);

        expect(result.normalizedRanges).toEqual([{ startIndex: 1, endIndex: 2 }]);
        expect(result.removedPointCount).toBe(2);
        expect(result.remainingPointCount).toBe(2);
        expect(result.xml).toContain('lat="50.0" lon="8.0"');
        expect(result.xml).toContain('lat="50.3" lon="8.3"');
        expect(result.xml).not.toContain('lat="50.1" lon="8.1"');
        expect(result.xml).not.toContain('lat="50.2" lon="8.2"');
    });
});