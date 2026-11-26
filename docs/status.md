# Status

_Last updated: **2026-11-26** (white-forest classification recorded as pending)_

This page is the single source of truth for **what is pending**. It is read at the start
of every session and updated at the end — see
[AGENTS.md](https://github.com/albertacedo/virtual-o/blob/main/AGENTS.md).

## Open tasks

### Next up

- [ ] Inspect Can Camps white-forest representation and classify only after confirming which blank cells are runnable forest versus unknown or outside-map area.
- [x] Add the Can Camps Catalonia `.ocd`, verify its extent and used symbols, and georeference it to EPSG:25831 from the AP-7/C-16 anchor.
- [x] Convert `Bugeat Nord.ocd` from OCAD 9 to OCAD 12/2018 and validate its extent and symbols.
- [x] Confirm `Bugeat Nord` as France / EPSG:27572 from its preserved projected coordinates and the Bugeat location.
- [ ] Extend DTM acquisition to additional countries and terrain-data providers beyond Catalonia and France.
- [ ] Generalise terrain-data selection so the map CRS/location selects the appropriate country provider instead of assuming ICGC/Catalonia.

### Compatibility

- [ ] Implement a reader or conversion path for OCAD editions older than OCAD 10; the current `ocad2geojson` reader rejects OCAD 9.

### Later

- [ ] Continue Phase 1: implement the Unity importer and export the first playable Unity terrain.

### Housekeeping

- [ ] Replace the remaining documentation placeholders with the actual Virtual-O architecture and Unity integration plan.

## Done

- [x] Integrated the Phase 0 OCAD pipeline and sample outputs into the Virtual-O repository; verified with `npm.cmd install` and `npm.cmd run phase0`.
- [x] Removed the npm audit vulnerabilities without breaking Phase 0; verified with `npm.cmd ci`, `npm.cmd run phase0` and `npm.cmd audit`.
- [x] Linked the Llinars sprint map provisionally to EPSG:25831 using the municipal football pitch as an anchor.
- [x] Requested and prepared the official ICGC 5 m DTM for the Llinars map; generated a Float32 heightmap and metadata under the ignored `data/out` directory.
- [x] Built the first ignored `map.bundle` containing the heightmap, georeferenced vectors, map drape and manifest; verified that the DTM covers the map extent.
- [x] Recorded the Bugeat legacy CRS override, downloaded the IGN RGE ALTI 5 m raster, and built a covered Bugeat `map.bundle`.
- [x] Generalised GeoTIFF preparation and bundle CRS checks for EPSG:27572, and added repeatable IGN download/provider commands.
- [x] Added the Kartverket/Geonorge WCS tile adapter for Norway and built the sample Langvatnet Phase 1 bundle with real DTM data.
- [x] Reviewed the Langvatnet Phase 0 outputs: EPSG:32632, 357 × 263 m, 149 objects and 146 terrain objects; valid as a pipeline smoke test, too small for a playable world.
- [x] Downloaded the ICGC 5 m terrain model for Can Camps, prepared its Float32 heightmap and built a covered `map.bundle`; see the terrain-class rasterisation entry below.
- [x] Rasterised Can Camps terrain symbols onto the aligned 5 m DTM grid and integrated the provisional classes and legend into `map.bundle`; Unity import and gameplay rules remain pending.
- [x] Added a resumable OCAD-to-bundle orchestrator that runs ingestion, available georeferencing/provider/DTM steps, class rasterisation and bundle creation, and pauses explicitly for missing or manual inputs.
- [x] Added colour-independent, geometric detection of regularly spaced north/south map-grid lines before class rasterisation; validated against all 17 Can Camps meridians.
- [x] Added external legend detection using a legend-title label and the dense map-content footprint; removed Can Camps legend samples and captions from the terrain-class raster.

- [x] Finished task — short note or commit.
- [x] Finished task.

## How to update this page

- When a task is finished, move it from **Open tasks** to **Done** with a short note.
- When a new idea appears, add it under the right heading.
- Bump the _Last updated_ line.
- [Roadmap](roadmap.md) explains the longer-term direction; this page tracks the
  actionable state.

## Archiving

The **Done** list is not a museum. When it passes roughly 50 items, or at the end of each
quarter, archive it:

1. Copy this file to `docs/archive/status-2026-11-25.md`.
2. Keep only the **Done** section in the copy.
3. Replace **Done** here with:
   `Archived on 2026-11-25: [snapshot](archive/status-2026-11-25.md).`
4. Add the snapshot to [the archive index](archive/index.md).
5. Run `python -m mkdocs build --strict`.

Archiving is mandatory: it keeps the page that every session reads short enough to be
useful.
