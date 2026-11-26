# Virtual-O — Handoff de sessió

Data: 2026-11-25

## Objectiu del projecte

Desenvolupar un joc 3D de curses d’orientació en Unity, amb mapes modelats en 3D. Els usuaris haurien de poder pujar mapes OCAD i convertir-los en mons 3D jugables.

## Decisions preses

- Separar el conversor offline del joc Unity.
- El conversor genera un paquet intermedi (`map.bundle`) que Unity només ha de carregar.
- Fer servir dades versionades per traduir símbols OCAD a elements 3D i paràmetres de gameplay.
- Fer servir LiDAR/DTM per al relleu real quan sigui possible.
- Començar amb `ocad2geojson` per validar el pipeline; més endavant revisar la qüestió AGPL i decidir entre executar-lo com a procés separat, obtenir una llicència alternativa o escriure un parser propi.
- Reutilitzar idees i parts del projecte Terrain-O, però no el seu viewer Three.js ni les seves fonts de dades noruegues.

## Projecte actual

Ruta:

```text
C:\Users\alber\OneDrive\Documents\Albert\OpenCode\Virtual-O
```

És un projecte Node.js independent del projecte Unity existent (`Documents\Unity Game`, que és un prototip 2D de deckbuilder).

Estructura important:

```text
Virtual-O/
  package.json
  package-lock.json
  README.md
  .gitignore
  data/
    input/                  mapes .ocd d’entrada
    out/                    resultats generats, ignorats per git
  tools/
    phase0/
      inspect.mjs           eina de la Fase 0
  docs/
    phase0-handoff.md       aquest document
```

## Fase 0 implementada

L’eina llegeix un `.ocd` i genera:

```text
data/out/<nom-mapa>/
  report.md
  info.json
  symbols.json
  symbols.csv
  objects.geojson
  objects-local.geojson
  map.svg
  map.png
```

La comanda és:

```powershell
cd "C:\Users\alber\OneDrive\Documents\Albert\OpenCode\Virtual-O"
npm.cmd install
npm.cmd run phase0
```

Sense arguments agafa el primer `.ocd` de `data/input`.
Amb un fitxer concret:

```powershell
npm.cmd run phase0 -- "data/input/el-teu-mapa.ocd"
```

A Windows, `npm` pot estar bloquejat per la política de PowerShell. En aquest cas usar `npm.cmd`.

## Mapa de prova

Actualment existeix:

```text
data/input/sample-langvatnet.ocd
```

És un retall de prova del projecte Terrain-O, no un mapa propi de Catalunya.
Resultat:

- OCAD 2018, file format 12
- Escala 1:10.000
- EPSG:32632 (WGS 84 / UTM zone 32N)
- 357,3 m × 262,8 m
- 9,4 ha
- 149 objectes
- 188 símbols definits, 35 usats
- Render SVG/PNG correcte

El resultat és a:

```text
data/out/sample-langvatnet/
```

Avisos esperats:

- El mapa és petit perquè és un retall.
- Té un objecte de text, que no té significat 3D.
- El parser ignora dos símbols rectangle de decoració.

## Funcionalitat de `inspect.mjs`

- Llegeix OCAD amb `ocad2geojson`.
- Extreu versió, escala, CRS, origen, extensió i warnings.
- Exporta una feature per objecte, no per element gràfic del símbol.
- Exporta geometria en metres projectats.
- Afegeix als atributs: número de símbol, codi, subcodi, descripció, tipus i categoria.
- Genera coordenades locals amb origen NW:
  - X creix cap a l’est.
  - Z equivalent creix cap al sud.
  - Això evita passar coordenades UTM enormes directament a Unity.
- Genera `symbols.csv` amb una columna `mapped_to` buida.
- Classifica provisionalment símbols:
  - `terrain`: codis < 600
  - `technical`: 600–699
  - `course`: 700–899
  - `text`: símbols de text o codis >= 900

## Arquitectura prevista

```text
.ocd
  -> ingesta i validació
  -> OCAD -> vectors GeoJSON/SVG
  -> DTM/LiDAR -> heightmap
  -> mapping de símbols
  -> rasterització de classes i objectes 3D
  -> map.bundle
  -> importer Unity
  -> terreny, vegetació, obstacles, mapa i cursa
```

Components:

1. Ingesta OCAD: comprovar format, escala, CRS i extensió.
2. Vectorització: obtenir punts, línies i polígons amb el número de símbol.
3. Terreny: DTM/LiDAR com a font principal; corbes de nivell com a fallback.
4. Semàntica: convertir símbols en classes (`forest`, `marsh`, `cliff`, etc.) i velocitats.
5. Empaquetat: tiles, heightmap, classes, objectes, mapa i manifest.
6. Unity: importar el bundle i construir el món jugable.

## Format `map.bundle` proposat

Inspirat en el directori `worlds/<name>/` de Terrain-O:

```text
manifest.json
height/{cx}_{cy}.bin
layers/{cx}_{cy}.png
trees/{cx}_{cy}.bin
features.json
tracks.json
buildings.json
drape/{cx}_{cy}.jpg
map.jpg
vectors/objects.geojson
```

El manifest hauria d’incloure com a mínim:

- versió del bundle
- hash de l’entrada
- CRS original
- origen local
- amplada/altura
- resolució
- mida dels tiles
- seed de generació
- versió del mapping de símbols
- informació de l’estàndard ISOM/ISSprOM

## Terrain-O: què reutilitzar

Projecte: `arnesor/terraino`.

Reutilitzable/conceptualment útil:

- lectura i exportació OCAD
- pipeline d’ingesta/processament
- taules `isom2000.toml` i `isom2017.toml`
- generació d’arbres amb LiDAR
- fusió de terreny, vegetació i objectes
- tractament de penya-segats, roques, camins i aigua
- sistema de chunks i LOD
- format d’exportació del món

No reutilitzar directament:

- viewer Three.js, perquè el runtime final serà Unity
- fetchers noruecs (Kartverket, NIBIO, etc.)
- dades o assets sense revisar llicència

Important: el projecte Terrain-O és MIT, però el seu `tools/ocad-export` fa servir `ocad2geojson`, que és AGPL-3.0. Cal mantenir aquesta part separada o revisar la solució abans de fer un servei públic/producte comercial.

## Proper pas recomanat

For the Llinars del Vallès sprint map, Phase 0 was followed by a provisional
georeferencing step using the municipal football pitch as a known anchor. The
configuration is tracked in `data/georeferencing/mapa-esprint-llinars.json` and the
repeatable command is:

```powershell
npm.cmd run georeference -- "data/out/mapa Esprint llinars-converted" "data/georeferencing/mapa-esprint-llinars.json"
```

This writes `objects-georeferenced.geojson` in EPSG:25831. It is suitable for an initial
DTM/OSM comparison, but must be validated against additional roads or buildings before
being treated as survey-grade georeferencing.

## ICGC DTM preparation

The official ICGC 5 m terrain model was downloaded for the map extent. The source TIFF is
kept under the ignored `data/out/llinars-mdt-source/` directory. It is already in
EPSG:25831 and does not need reprojection. Prepare the local heightmap with:

```powershell
npm.cmd run prepare-dtm -- "data/out/llinars-mdt-source/<downloaded>.tif" "data/out/mapa Esprint llinars-converted/dtm"
```

The command writes `heightmap.bin` (row-major little-endian Float32 values),
`heightmap.pgm` for a quick preview, and `metadata.json`. The current 5 m raster is
236 × 166 cells, covers 1,180 × 830 m, and has elevations from approximately 171.14 m
to 222.71 m.

The first Unity-facing bundle can now be built with:

```powershell
npm.cmd run build-bundle -- "data/out/mapa Esprint llinars-converted" "data/out/mapa Esprint llinars-converted/dtm" "data/out/mapa Esprint llinars-converted/map.bundle"
```

The bundle contains the heightmap, its metadata, georeferenced OCAD vectors, the map
drape and `manifest.json`. Terrain classes and the Unity importer are still pending.

1. Posar un `.ocd` real de l’usuari a `data/input`.
2. Executar la Fase 0.
3. Revisar `report.md`, `map.png` i `symbols.csv`.
4. Confirmar:
   - si el mapa està georeferenciat;
   - quin CRS utilitza, probablement EPSG:25831 si és Catalunya;
   - l’extensió real;
   - quins símbols usa de veritat.
5. Començar la Fase 1 amb un mapa petit i un DTM/heightmap local, encara sense LiDAR complex:
   - generar `heightmap`;
   - rasteritzar classes bàsiques;
   - exportar el primer `map.bundle`;
   - crear un importer mínim a Unity.

## Notes per continuar en un altre ordinador

- Copiar tota la carpeta `Virtual-O`.
- Executar `npm.cmd install`.
- Posar el mapa `.ocd` a `data/input`.
- Executar `npm.cmd run phase0`.
- Per a mapes OCAD 9 o anteriors, obrir-los amb OpenOrienteering Mapper i desar una còpia
  en OCAD 12 abans d’executar la Fase 0. En aquesta màquina el conversor local és a
  `tools/mapper/` (està ignorat per Git; cal restaurar-lo des de la còpia local o instal·lar
  Mapper de nou).
- No cal copiar `data/out`, perquè són fitxers generats i estan ignorats per git.
- Si es vol continuar amb Unity, el projecte actual de Unity és una carpeta separada i no és encara el projecte 3D final.

## Bugeat Nord validation

The legacy `Bugeat Nord.ocd` file was converted with OpenOrienteering Mapper 0.9.6 and
Phase 0 now reads the resulting OCAD 12 file successfully. The map is 1,701.2 m ×
1,510.5 m, contains 2,364 objects and uses 79 symbols. The converted file preserves a
projected origin (567,000 E, 2,068,000 N), but its CRS catalog/code is empty.
OpenOrienteering Mapper labels the map as `- local -`, so its displayed geographic values
are not useful. Interpreting the preserved coordinates as historic French Lambert II
étendu (EPSG:27572) gives 45.6116046 N, 1.9142267 E, which is north-west of Bugeat and
matches the `Bugeat Nord` map name. This is sufficient to select France's
IGN/Géoplateforme terrain source, but the pipeline still needs an explicit legacy CRS
override because the OCAD metadata itself does not contain the EPSG code.

The verified legacy CRS is recorded in `data/georeferencing/bugeat-nord-crs.json`. Resolve
the first terrain provider with:

```powershell
npm.cmd run resolve-terrain -- "data/out/bugeat-nord/info.json" "data/georeferencing/bugeat-nord-crs.json"
```

This writes `terrain-source.json` next to the Phase 0 report and selects IGN/Géoplateforme
for France.

Download and prepare the IGN raster with:

```powershell
npm.cmd run download-ign-dtm -- "data/out/bugeat-nord/info.json" "data/out/bugeat-nord/ign-source/bugeat-rge-alti.tif" "data/georeferencing/bugeat-nord-crs.json"
npm.cmd run prepare-dtm -- "data/out/bugeat-nord/ign-source/bugeat-rge-alti.tif" "data/out/bugeat-nord/dtm" "EPSG:27572"
npm.cmd run apply-crs-override -- "data/out/bugeat-nord" "data/georeferencing/bugeat-nord-crs.json"
npm.cmd run build-bundle -- "data/out/bugeat-nord" "data/out/bugeat-nord/dtm" "data/out/bugeat-nord/map.bundle"
```

The resulting bundle contains the 5 m Float32 heightmap, EPSG:27572 vectors, the map drape
and a manifest confirming that the terrain covers the full map extent.

## Terrain-O and Norwegian terrain

Terrain-O does not use its WMS for elevation values. Its `fetch/kartverket.py` adapter
uses Kartverket's WCS 1.0 service:

```text
https://wcs.geonorge.no/skwms1/wcs.hoyde-{kind}-nhm-{epsg}
coverage=nhm_{kind}_topo_{epsg}
```

It requests 1 km GeoTIFF tiles at 1 m resolution, caches them, mosaics the tiles into a
north-up Float32 grid, and can fill gaps from neighbouring UTM zones. The useful design
can be reimplemented in this Node pipeline; the Python/rasterio implementation and the
Terrain-O viewer are not copied. The Norwegian sample currently uses EPSG:32632 while
Kartverket's service is normally requested with ETRS89 / UTM 32N (EPSG:25832), so the
provider adapter must record and validate that datum compatibility before building a
bundle.

The working commands for the sample are:

```powershell
npm.cmd run resolve-terrain -- "data/out/sample-langvatnet/info.json"
npm.cmd run download-kartverket-dtm -- "data/out/sample-langvatnet/info.json" "data/out/sample-langvatnet/kartverket"
npm.cmd run prepare-dtm -- "data/out/sample-langvatnet/kartverket/666000_6646000.tif" "data/out/sample-langvatnet/dtm" "EPSG:25832"
npm.cmd run apply-crs-override -- "data/out/sample-langvatnet" "data/georeferencing/sample-langvatnet-crs.json"
npm.cmd run build-bundle -- "data/out/sample-langvatnet" "data/out/sample-langvatnet/dtm" "data/out/sample-langvatnet/map.bundle"
```

The bundle is covered by the real Kartverket DTM and records the source CRS compatibility
in its manifest.
