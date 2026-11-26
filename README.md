# Virtual-O — OCAD → 3D pipeline

Build tooling that turns an OCAD orienteering map into a 3D world a game engine can load.

**Phase 0 (this repo state):** read an OCAD file, export its geometry and a rendering, and
produce a report that tells us whether the file is a usable input. Nothing 3D yet.

## Requirements

- Node.js 20 or newer (tested on 24)
- An `.ocd` file

## Quick start

```powershell
npm.cmd install
npm.cmd run phase0 -- "data/input/my-map.ocd"
```

Without an argument it picks the first `.ocd` in `data/input/`:

```powershell
npm.cmd run phase0
```

## What it writes

Everything goes to `data/out/<map-name>/`:

| File | Contents |
|---|---|
| `report.md` | Human-readable summary: format, georeferencing, extent, symbols, warnings |
| `info.json` | The same, machine-readable |
| `symbols.json` | Every symbol defined in the file, with how many objects use it |
| `symbols.csv` | Same, plus an empty `mapped_to` column for the Phase 2 symbol table |
| `objects.geojson` | One feature per map object, in projected metres (the map's own CRS) |
| `objects-local.geojson` | Same, in local metres: `x` east, `z` south, origin at the NW corner |
| `map.svg` | Vector rendering of the map |
| `map.png` | Raster rendering, for eyeballing |

## What Phase 0 answers

1. **Does the reader work with our files?** `ocad2geojson` supports OCAD 10, 11, 12 and 2018.
   Older files need re-saving from OCAD or Mapper.
2. **Is the map georeferenced?** Without a CRS and origin, the map cannot be aligned with
   LiDAR, and Phase 1 needs a manual alignment step.
3. **What symbols does it actually use?** `symbols.csv` is the seed of the symbol mapping:
   the `mapped_to` column is where `forest_dense`, `marsh`, `cliff`, … will go.
4. **Is it a race map or an excerpt?** Extent, polygon coverage and object counts.

## Coordinates

- `objects.geojson` keeps the file's projected CRS (e.g. EPSG:32632, EPSG:25831).
  Values are metres, but the numbers are large (~400 000, ~4 600 000), which is bad for
  `float32` in a game engine.
- `objects-local.geojson` subtracts the bounding box and flips the Y axis, so the origin is
  the north-west corner and `z` grows southward. This is the frame the `map.bundle` will use
  in Phase 1.

## Licence

`tools/phase0/inspect.mjs` imports [`ocad2geojson`](https://github.com/perliedman/ocad2geojson),
which is **AGPL-3.0**, so this tool is AGPL-3.0 as well. It is a local build tool, not shipped
with the game. Before this runs as a public service, Phase 4 has to decide between:

- keeping it as a separate program (the approach Terrain-O uses), or
- writing our own reader from the published OCAD file format, or
- asking the author for a different licence.

## Dependency security

The current `ocad2geojson` release still declares vulnerable `uuid` and `xmldom`
transitive dependencies. The project uses the maintained `@xmldom/xmldom` package and a
small vendored `uuid` compatibility package under `vendor/uuid-compat`; the latter keeps
the legacy `uuid/v4` import used by `ocad2geojson` while retaining the security fixes.
Run `npm audit` after dependency changes.

The sample map in `data/input/` is `LangvatnetUtsnitt.ocd`, a small excerpt from the
[Terrain-O](https://github.com/arnesor/terraino) test fixtures (MIT repository).
