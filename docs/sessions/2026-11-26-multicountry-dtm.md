# 2026-11-26 · Multi-country DTM providers

**Duration:** afternoon
**Commits:** pending

## Objective

Validate maps outside Catalonia and make Phase 1 select and acquire terrain data from the
provider appropriate to the map CRS.

## What was done

- Converted the legacy Bugeat map from OCAD 9 to OCAD 12 with the local OpenOrienteering
  Mapper bundle.
- Confirmed its preserved coordinates as France / EPSG:27572 and downloaded a 5 m IGN RGE
  ALTI GeoTIFF through the official Géoplateforme WMS.
- Added provider resolution, CRS overrides, dynamic Float32 GeoTIFF preparation and CRS
  compatibility checks in the bundle builder.
- Reused Terrain-O's Kartverket WCS approach to download a real 1 m Norwegian DTM tile for
  the Langvatnet sample and built its first Phase 1 bundle.
- Documented the local Mapper tool and the repeatable France/Norway commands.

## Files

### Added

- `data/georeferencing/bugeat-nord-crs.json`
- `data/georeferencing/sample-langvatnet-crs.json`
- `tools/phase0/apply-crs-override.mjs`
- `tools/phase1/download-ign-dtm.mjs`
- `tools/phase1/download-kartverket-dtm.mjs`
- `tools/phase1/resolve-terrain-source.mjs`
- This session note.

### Modified

- `tools/phase0/inspect.mjs` — reject invalid CRS code 0 and report incomplete georeferencing.
- `tools/phase1/prepare-dtm.mjs` — support dynamic CRS, uncompressed and raw tiled Float32
  GeoTIFFs.
- `tools/phase1/build-bundle.mjs` — support non-Catalonia CRS and explicit datum compatibility.
- `package.json` — add provider and override commands.
- `docs/phase0-handoff.md`, `docs/handover.md`, `docs/status.md`, `docs/index.md` and
  navigation — record the workflows and results.
- `backup.targets` — include the local Mapper bundle.

### Deleted

- None.

## Verification

- Bugeat: IGN RGE ALTI 5 m raster prepared; `map.bundle` coverage check passed.
- Langvatnet: Kartverket WCS 1 m tile downloaded; Float32 heightmap prepared; `map.bundle`
  coverage check passed.
- `powershell -NoProfile -ExecutionPolicy Bypass -File .\tasks.ps1 -Check` passed.
- `npm audit` remained at zero vulnerabilities during the project checks.

## Decisions

- Use provider adapters selected by verified CRS; never infer a terrain source from an
  unknown CRS.
- Follow Terrain-O's WCS/tile/cache design for Kartverket without copying its Python
  implementation or viewer.
- Treat EPSG:25832 terrain coordinates as compatible with the EPSG:32632 Norwegian sample
  for this 1 m test, and record that compatibility in the bundle manifest.

## Pending

- [ ] Rasterise terrain classes and export the first playable Unity terrain.
- [ ] Implement the Unity bundle importer.
- [ ] Add more countries/providers and a reader or conversion path for OCAD 9 and older.

## Housekeeping

- [ ] Backup run and verified by the session-end script.
- [ ] Release tagged (only if this session closed a milestone).
- [x] `docs/status.md` updated.

## Skills for the next session

| Skill | Why |
|---|---|
| Unity import workflow | Import and preview the verified Bugeat or Langvatnet bundle. |
| Terrain classification | Rasterise ISOM/ISSprOM symbols into playable terrain layers. |
