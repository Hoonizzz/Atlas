# Full Greenland stream lines

`streams-lines.geojson.gz` is gzip-compressed GeoJSON extracted from the
user-provided `streams.gpkg`, layer `streams`.

- Source CRS: EPSG:3413; web coordinates: EPSG:4326, longitude/latitude.
- Includes 313,924 usable line features and 7,575,745 vertices.
- Excludes 319,217 point features and 52 lines with insufficient or coincident coordinates.
- No length threshold or geometry simplification is applied. Coordinates use six decimal places.
- Retains feature IDs and the original `length` property in metres.

`scrollytelling.html` decompresses this file with `DecompressionStream` and
uses it for both the stream layer and particle paths. The existing layer ID
`stream-ice-8000` is retained for chapter visibility compatibility; the data
now includes all usable lines, with lengths starting at 100 metres.

Particles follow downstream endpoint connections across line features. There
are 308,631 connections and 5,293 terminal lines, with no directed cycles.
Matching uses the exported six-decimal coordinates; disconnected endpoints
are not joined by proximity. A terminal line means no downstream line exists
in this dataset, not necessarily a confirmed physical outlet.

All particles use the same ground speed (1,000 metres per second at 1×,
illustrative rather than measured water velocity), using spherical segment
distances. The speed slider applies a shared 0–20× multiplier immediately,
including across junctions; 0× pauses motion. Particles are re-seeded only at
terminal endpoints. Count and chapter activation are unchanged.

The detail chapter's upper-right controls are three vertical sliders without
numeric readouts: background darkness, speed, and particle count (0–10,000,
default 3,000). Increasing density retains existing particle positions.
The darkness control dims raster backgrounds only,
leaving streams and particles unchanged. Original raster brightness returns
on chapter exit; the slider setting is retained for re-entry.

No length slider is included. The compressed file is approximately 55 MB, so initial loading
and processing will take longer than with the previous filtered dataset.
