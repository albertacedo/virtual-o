# Status

_Last updated: **2026-11-26** (session N)_

This page is the single source of truth for **what is pending**. It is read at the start
of every session and updated at the end — see
[AGENTS.md](https://github.com/albertacedo/virtual-o/blob/main/AGENTS.md).

## Open tasks

### Next up

- [ ] Review `data/out/sample-langvatnet/report.md`, `map.png` and `symbols.csv`; confirm whether the sample input is suitable for the next phase.
- [ ] Add a real Catalonia `.ocd` map and verify its CRS, extent and used symbols.

### Later

- [ ] Start Phase 1: rasterise basic classes and export the first playable Unity terrain.

### Housekeeping

- [ ] Replace the remaining documentation placeholders with the actual Virtual-O architecture and Unity integration plan.

## Done

- [x] Integrated the Phase 0 OCAD pipeline and sample outputs into the Virtual-O repository; verified with `npm.cmd install` and `npm.cmd run phase0`.
- [x] Removed the npm audit vulnerabilities without breaking Phase 0; verified with `npm.cmd ci`, `npm.cmd run phase0` and `npm.cmd audit`.
- [x] Linked the Llinars sprint map provisionally to EPSG:25831 using the municipal football pitch as an anchor.
- [x] Requested and prepared the official ICGC 5 m DTM for the Llinars map; generated a Float32 heightmap and metadata under the ignored `data/out` directory.
- [x] Built the first ignored `map.bundle` containing the heightmap, georeferenced vectors, map drape and manifest; verified that the DTM covers the map extent.

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
