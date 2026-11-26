---
name: terrain-classification
description: Use when changing OCAD terrain-symbol mapping, class rasterisation, overlap handling, map-grid-line filtering, or unclassified areas.
---

# Terrain classification

- The rasterizer is `tools/phase1/rasterize-classes.mjs`; class IDs and provisional colours
  are written to `legend.json`, and each raster cell is one unsigned byte in `classes.bin`.
- The class grid must match DTM dimensions, resolution, CRS and origin. The bundle builder
  validates this before packaging.
- Larger class priority wins overlaps. A cell stays `unclassified` unless a supported symbol
  explicitly assigns it a class.
- Contour lines are not a terrain class; elevation comes from the DTM.
- Long, nearly vertical lines are excluded only when at least five form a repeated x-spacing
  lattice. This detection is independent of symbol code and colour.
- An external legend is excluded only when a recognizable legend-title text lies outside the
  densest map-content footprint; nearby out-of-footprint features are then treated as map
  furniture, not terrain.
- **Open Can Camps question:** determine whether blank areas within the real map boundary mean
  the standard white forest or remain genuinely unknown. Do not blanket-fill class ID 0 until
  the map boundary, legend and source symbols support that interpretation.
- After changing either filter, rerun the Can Camps pipeline and inspect the class preview to
  ensure real water, paths and terrain remain represented.
