#!/usr/bin/env node
/** Rasterise selected OCAD terrain symbols onto the DTM's cell-centre grid. */

import fs from 'node:fs/promises'
import path from 'node:path'

const [mapDirArg, dtmDirArg, outputDirArg] = process.argv.slice(2)
if (!mapDirArg || !dtmDirArg || !outputDirArg) {
  console.error('usage: rasterize-classes.mjs <phase0-output-dir> <dtm-dir> <output-dir>')
  process.exit(1)
}

const mapDir = path.resolve(mapDirArg)
const dtmDir = path.resolve(dtmDirArg)
const outputDir = path.resolve(outputDirArg)
const readJson = async (file) => JSON.parse(await fs.readFile(file, 'utf8'))
const dtm = await readJson(path.join(dtmDir, 'metadata.json'))
const collection = await readJson(path.join(mapDir, 'objects-georeferenced.geojson'))
if (!Number.isInteger(dtm.width) || !Number.isInteger(dtm.height) || !(dtm.resolution > 0)) {
  throw new Error('DTM metadata must contain integer width/height and a positive resolution')
}

// IDs are stable bundle values. Priorities resolve overlaps; larger values win.
const classes = [
  { id: 0, name: 'unclassified', priority: 0, color: '#777777' },
  { id: 1, name: 'open_land', priority: 10, color: '#e7d88b' },
  { id: 2, name: 'semi_open_land', priority: 12, color: '#cbd88b' },
  { id: 3, name: 'rough_open_land', priority: 14, color: '#d8b879' },
  { id: 4, name: 'scattered_trees', priority: 16, color: '#a9c77b' },
  { id: 5, name: 'forest_slow', priority: 20, color: '#6eaa63' },
  { id: 6, name: 'forest_difficult', priority: 22, color: '#39854b' },
  { id: 7, name: 'forest_impassable', priority: 24, color: '#185b38' },
  { id: 8, name: 'cultivated_land', priority: 18, color: '#e8c46d' },
  { id: 9, name: 'orchard', priority: 19, color: '#a9bd62' },
  { id: 10, name: 'water', priority: 40, color: '#47a9d1' },
  { id: 11, name: 'marsh', priority: 38, color: '#75c4bb' },
  { id: 12, name: 'rocky_ground', priority: 30, color: '#b1a495' },
  { id: 13, name: 'bare_rock', priority: 32, color: '#d2d1cc' },
  { id: 14, name: 'passable_cliff', priority: 48, color: '#986c55' },
  { id: 15, name: 'impassable_cliff', priority: 50, color: '#4e3a35' },
  { id: 16, name: 'earth_bank', priority: 42, color: '#ad8051' },
  { id: 17, name: 'major_road', priority: 70, color: '#393939' },
  { id: 18, name: 'road', priority: 68, color: '#595959' },
  { id: 19, name: 'vehicle_track', priority: 64, color: '#877451' },
  { id: 20, name: 'footpath', priority: 62, color: '#987e62' },
  { id: 21, name: 'building', priority: 80, color: '#6d5964' },
  { id: 22, name: 'settlement', priority: 55, color: '#b78d9a' },
  { id: 23, name: 'parking', priority: 58, color: '#a3a3a3' },
  { id: 24, name: 'wall', priority: 52, color: '#705a4c' },
  { id: 25, name: 'impassable_fence', priority: 54, color: '#563f38' },
  { id: 26, name: 'forbidden_area', priority: 84, color: '#d34242' },
  { id: 27, name: 'railway', priority: 66, color: '#3c5963' },
  { id: 28, name: 'paved_surface', priority: 60, color: '#777777' },
]
const byName = new Map(classes.map((item) => [item.name, item]))
const symbolClasses = new Map()
const symbolSubclasses = new Map()
const mapCode = (code, name) => symbolClasses.set(Number(code), name)
const mapSymbol = (code, sub, name) => symbolSubclasses.set(`${code}.${sub}`, name)

for (const code of [401]) mapCode(code, 'open_land')
mapCode(402, 'semi_open_land')
mapCode(403, 'rough_open_land')
mapCode(404, 'scattered_trees')
for (const code of [406, 407]) mapCode(code, 'forest_slow')
for (const code of [408, 409]) mapCode(code, 'forest_difficult')
mapCode(410, 'forest_impassable')
mapCode(415, 'cultivated_land')
for (const code of [301, 302, 306, 307]) mapCode(code, 'water')
for (const code of [308, 309, 310, 311]) mapCode(code, 'marsh')
for (const code of [202, 206, 207, 208, 209, 210]) mapCode(code, 'rocky_ground')
mapCode(211, 'open_land')
mapCode(212, 'bare_rock')
mapCode(201, 'impassable_cliff')
mapCode(203, 'passable_cliff')
for (const code of [106, 107, 109, 110]) mapCode(code, 'earth_bank')
for (const code of [501, 502]) mapCode(code, 'major_road')
for (const code of [503, 504]) mapCode(code, 'road')
for (const code of [505]) mapCode(code, 'vehicle_track')
for (const code of [506, 507, 508, 509]) mapCode(code, 'footpath')
mapCode(516, 'railway')
for (const code of [520, 521, 522, 523, 524]) mapCode(code, 'wall')
mapCode(525, 'impassable_fence')
for (const code of [527]) mapCode(code, 'building')
mapCode(528, 'settlement')
mapCode(607, 'forbidden_area')
mapSymbol(1, '3', 'paved_surface')
mapSymbol(412, '0', 'orchard')
mapSymbol(530, '0', 'parking')
mapSymbol(530, '2', 'parking')

const width = dtm.width
const height = dtm.height
const resolution = dtm.resolution
const west = dtm.extent.west
const north = dtm.extent.north
const pixels = Buffer.alloc(width * height)
const priorities = new Uint8Array(width * height)
const touchedClasses = new Uint32Array(classes.length)
let mappedFeatures = 0
let unmappedFeatures = 0

function pixelIndex(x, y) {
  const col = Math.floor((x - west) / resolution)
  const row = Math.floor((north - y) / resolution)
  if (col < 0 || col >= width || row < 0 || row >= height) return -1
  return row * width + col
}

function burn(x, y, klass) {
  const index = pixelIndex(x, y)
  if (index < 0 || klass.priority < priorities[index]) return
  pixels[index] = klass.id
  priorities[index] = klass.priority
}

function walkCoordinates(coords, visit) {
  if (!Array.isArray(coords)) return
  if (typeof coords[0] === 'number') visit(coords)
  else for (const child of coords) walkCoordinates(child, visit)
}

function boundsOf(coords) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
  walkCoordinates(coords, ([x, y]) => {
    minX = Math.min(minX, x); minY = Math.min(minY, y)
    maxX = Math.max(maxX, x); maxY = Math.max(maxY, y)
  })
  return { minX, minY, maxX, maxY }
}

function cellRange(bounds, padding = 0) {
  const minCol = Math.max(0, Math.floor((bounds.minX - padding - west) / resolution))
  const maxCol = Math.min(width - 1, Math.floor((bounds.maxX + padding - west) / resolution))
  const minRow = Math.max(0, Math.floor((north - bounds.maxY - padding) / resolution))
  const maxRow = Math.min(height - 1, Math.floor((north - bounds.minY + padding) / resolution))
  return { minCol, maxCol, minRow, maxRow }
}

function pointInRing(x, y, ring) {
  let inside = false
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i], [xj, yj] = ring[j]
    const crosses = (yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi
    if (crosses) inside = !inside
  }
  return inside
}

function fillPolygon(rings, klass) {
  const bounds = boundsOf(rings)
  const { minCol, maxCol, minRow, maxRow } = cellRange(bounds)
  if (minCol > maxCol || minRow > maxRow) return
  for (let row = minRow; row <= maxRow; row += 1) {
    const y = north - (row + 0.5) * resolution
    for (let col = minCol; col <= maxCol; col += 1) {
      const x = west + (col + 0.5) * resolution
      if (pointInRing(x, y, rings[0]) && !rings.slice(1).some((ring) => pointInRing(x, y, ring))) {
        burn(x, y, klass)
      }
    }
  }
}

function drawLine(points, klass) {
  for (let i = 1; i < points.length; i += 1) {
    const [x1, y1] = points[i - 1], [x2, y2] = points[i]
    const steps = Math.max(1, Math.ceil(Math.hypot(x2 - x1, y2 - y1) / (resolution * 0.45)))
    for (let step = 0; step <= steps; step += 1) {
      const t = step / steps
      const x = x1 + (x2 - x1) * t, y = y1 + (y2 - y1) * t
      const col = Math.floor((x - west) / resolution)
      const row = Math.floor((north - y) / resolution)
      if (col >= 0 && col < width && row >= 0 && row < height) {
        burn(west + (col + 0.5) * resolution, north - (row + 0.5) * resolution, klass)
      }
    }
  }
}

function rasterizeGeometry(geometry, klass) {
  if (!geometry) return
  switch (geometry.type) {
    case 'Polygon':
      fillPolygon(geometry.coordinates, klass)
      break
    case 'MultiPolygon':
      for (const polygon of geometry.coordinates) fillPolygon(polygon, klass)
      break
    case 'LineString':
      drawLine(geometry.coordinates, klass)
      break
    case 'MultiLineString':
      for (const line of geometry.coordinates) drawLine(line, klass)
      break
    case 'Point':
      burn(...geometry.coordinates, klass)
      break
    case 'MultiPoint':
      for (const point of geometry.coordinates) burn(...point, klass)
      break
  }
}

for (const feature of collection.features) {
  const code = Number(feature.properties?.code)
  const sub = String(feature.properties?.sub ?? '0')
  const klass = byName.get(symbolSubclasses.get(`${code}.${sub}`) ?? symbolClasses.get(code))
  if (!klass) {
    unmappedFeatures += 1
    continue
  }
  mappedFeatures += 1
  rasterizeGeometry(feature.geometry, klass)
}

for (const id of pixels) if (id > 0) touchedClasses[id] += 1
touchedClasses[0] = pixels.length - touchedClasses.reduce((sum, count) => sum + count, 0)
await fs.mkdir(outputDir, { recursive: true })
await fs.writeFile(path.join(outputDir, 'classes.bin'), pixels)
const legend = {
  formatVersion: 1,
  encoding: 'unsigned 8-bit class ID; row-major; rows north to south',
  rasterization: 'polygon cell-centre fill; lines sampled at less than half-cell intervals; points assigned to containing cell',
  defaultClass: 0,
  overlapRule: 'higher class priority wins; equal priority uses the later OCAD feature',
  classes: classes.map((item) => ({ ...item, cells: touchedClasses[item.id] })),
  symbolMapping: Object.fromEntries([...symbolClasses].sort(([a], [b]) => a - b)),
  symbolSubclasses: Object.fromEntries([...symbolSubclasses].sort(([a], [b]) => a.localeCompare(b, undefined, { numeric: true }))),
}
const metadata = {
  source: path.basename(mapDir),
  width, height, resolution,
  crs: dtm.crs,
  origin: dtm.origin,
  extent: dtm.extent,
  file: 'classes.bin',
  legend: 'legend.json',
  mappedFeatures,
  unmappedFeatures,
  classifiedCells: touchedClasses.reduce((sum, count, id) => sum + (id ? count : 0), 0),
  unclassifiedCells: touchedClasses[0],
  totalCells: width * height,
}
await fs.writeFile(path.join(outputDir, 'legend.json'), `${JSON.stringify(legend, null, 2)}\n`)
await fs.writeFile(path.join(outputDir, 'metadata.json'), `${JSON.stringify(metadata, null, 2)}\n`)
console.log(`  rasterised ${mappedFeatures} mapped features; ${metadata.classifiedCells}/${metadata.totalCells} cells classified`)
console.log(`  wrote ${path.join(outputDir, 'classes.bin')}`)
