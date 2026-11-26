# 2026-11-26 · Automate Can Camps terrain bundle

**Duration:** evening
**Commits:** `2b4a387` — automate OCAD map bundle builds; `2151b96` — exclude map meridians from terrain classes; `2848a5a` — exclude detached map legends from terrain classes

## Objective

Automate the supported OCAD-to-bundle workflow, correct non-terrain map furniture in the
Can Camps class raster, and leave the next terrain-classification question recorded.

## What was done

- Added a resumable `npm run build-map` command for OCAD ingestion, verified/native
  georeferencing, registered DTM providers, terrain-class rasterisation and bundle creation.
- Added geometric, colour-independent detection of long north/south lines in regular grid
  families. The Can Camps pass excludes all 17 detected meridians.
- Added external-legend detection using a recognizable legend title and the densest map-content
  footprint. It excludes the detached Can Camps legend panel and its associated objects without
  treating ordinary isolated text as a legend.
- Regenerated the Can Camps bundle and one-off elevation and class preview PNGs under ignored
  `data/out/can-camps-automation-test/map.bundle/`.
- Added the unresolved Can Camps white-forest/background interpretation as the next task; no
  default terrain class was inferred for those cells.

## Files

### Added

- `tools/phase1/build-map.mjs`
- `tools/phase1/rasterize-classes.mjs`
- `docs/sessions/2026-11-26-can-camps-automation.md`
- `.opencode/skills/terrain-classification/SKILL.md`

### Modified

- `tools/phase1/build-bundle.mjs` and `package.json` — optional class-raster packaging and the
  one-command pipeline entry point.
- `docs/phase0-handoff.md` — pipeline, class format and filtering rules.
- `docs/status.md` — completed work and the pending white-forest investigation.
- `docs/index.md`, `docs/sessions/index.md` and `mkdocs.yml` — current state and session links.

### Deleted

- None.

## Verification

- End-to-end Can Camps pipeline resumed from its OCAD output with the verified anchor and
  prepared DTM; bundle coverage check passed.
- Class grid: 1,289 × 683 at 5 m; 17 meridians and 101 detached-legend features excluded;
  225,788 cells classified and 654,599 left unclassified.
- `./tasks.ps1 -Check` passed.
- One-off `height/heightmap-preview.png` and `terrain/terrain-preview.png` generated and viewed.

## Decisions

- Exclude map furniture from terrain classes only when a repeated geometric grid or an
  explicit external legend title provides evidence; do not decide that unclassified cells are
  white forest without checking map coverage and symbols.

## Pending

- [ ] Inspect Can Camps white-forest representation and determine whether any unclassified
  cells can safely use a white-forest class.
- [ ] Implement the Unity importer and export the first playable Unity terrain.

## Housekeeping

- [x] Backup verified: `Backups/2026-11-26_210220012/manifest.txt` (`Failed: 0`). The absent
  `tools/mapper/` target was temporarily omitted during the backup and restored in
  `backup.targets`; `data/input/` is tracked in Git but the backup script still reports its
  generic not-ignored warning.
- [ ] Release tagged (only if this session closed a milestone).
- [x] `docs/status.md` updated.

## Skills for the next session

| Skill | Why |
|---|---|
| `terrain-classification` | Review the Can Camps white-forest/background gap without weakening the meridian and external-legend filters. |
