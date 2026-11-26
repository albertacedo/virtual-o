#!/usr/bin/env node
/**
 * Phase 0 — OCAD ingest probe.
 *
 * Reads an OCAD map and produces everything we need to judge whether the file
 * is a good input for the 3D pipeline:
 *
 *   info.json             file format, georeferencing, extent, counts
 *   symbols.json          every symbol defined in the file, with usage counts
 *   symbols.csv           the same, with an empty `mapped_to` column to fill in
 *   objects.geojson       one feature per map object, in projected metres
 *   objects-local.geojson the same in local metres: x east, z south, NW origin
 *   map.svg               vector rendering of the map
 *   map.png               raster rendering, for eyeballing
 *   report.md             human-readable summary and warnings
 *
 * Usage:
 *   node tools/phase0/inspect.mjs <map.ocd> [outDir]
 *   node tools/phase0/inspect.mjs            # first .ocd in data/input
 *
 * This script imports `ocad2geojson`, which is AGPL-3.0. That makes this file
 * AGPL-3.0 too. It is a local build tool, not shipped with the game; the
 * production reader decision is a Phase 4 concern (see README).
 */

import fs from 'node:fs/promises'
import path from 'node:path'
import crypto from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { Resvg } from '@resvg/resvg-js'
import ocad2geojson from 'ocad2geojson'

const { readOcad, ocadToGeoJson } = ocad2geojson
const require = createRequire(import.meta.url)

const ROOT = path.resolve(fileURLToPath(new URL('../..', import.meta.url)))
const INPUT_DIR = path.join(ROOT, 'data', 'input')
const OUT_ROOT = path.join(ROOT, 'data', 'out')

const SYMBOL_TYPES = {
  1: 'point',
  2: 'line',
  3: 'area',
  4: 'text',
  6: 'line-text',
  7: 'rectangle',
}

const OBJECT_TYPES = {
  1: 'point',
  2: 'line',
  3: 'area',
  4: 'text',
  5: 'text',
  6: 'line-text',
  7: 'rectangle',
}

/* ------------------------------------------------------------------ helpers */

function fail(message) {
  console.error(`\n  error: ${message}\n`)
  process.exit(1)
}

function sha256(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex')
}

function fmt(n, digits = 0) {
  return Number(n).toLocaleString('en-US', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })
}

/** OCAD symbol numbers look like "101.0" or "416.1"; the code is the integer part. */
function splitNumber(number) {
  const text = String(number ?? '')
  const [code, sub = '0'] = text.split('.')
  return { code: Number.parseInt(code, 10), sub }
}

/**
 * Symbols are grouped the way the pipeline will treat them:
 *   terrain    ISOM/ISSprOM symbols that describe the ground (1..599)
 *   technical  north lines, frame, legend (600..699)
 *   course     course setting symbols (700..899)
 *   text       text and line-text symbols (900+ or a text symbol type)
 *   unknown    unnumbered symbols
 */
function classifySymbol(symbol) {
  if (symbol.otp === 4 || symbol.otp === 6) return 'text'
  const { code } = splitNumber(symbol.number)
  if (!Number.isFinite(code)) return 'unknown'
  if (code >= 900) return 'text'
  if (code >= 700) return 'course'
  if (code >= 600) return 'technical'
  return 'terrain'
}

function ringArea(ring) {
  let sum = 0
  for (let i = 0; i < ring.length - 1; i++) {
    const [x1, y1] = ring[i]
    const [x2, y2] = ring[i + 1]
    sum += x1 * y2 - x2 * y1
  }
  return Math.abs(sum) / 2
}

function polygonArea(rings) {
  const [outer, ...holes] = rings
  return holes.reduce((area, hole) => area - ringArea(hole), ringArea(outer))
}

function geometryArea(geometry) {
  if (!geometry) return 0
  if (geometry.type === 'Polygon') return polygonArea(geometry.coordinates)
  if (geometry.type === 'MultiPolygon') {
    return geometry.coordinates.reduce((sum, poly) => sum + polygonArea(poly), 0)
  }
  return 0
}

function bboxOf(features) {
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  const visit = ([x, y]) => {
    if (x < minX) minX = x
    if (y < minY) minY = y
    if (x > maxX) maxX = x
    if (y > maxY) maxY = y
  }
  const walk = (coordinates) => {
    if (typeof coordinates[0] === 'number') visit(coordinates)
    else coordinates.forEach(walk)
  }
  for (const feature of features) {
    if (feature.geometry) walk(feature.geometry.coordinates)
  }
  if (!Number.isFinite(minX)) return null
  return { minX, minY, maxX, maxY, width: maxX - minX, height: maxY - minY }
}

/** Resolve the ocad-tool entry point inside node_modules, cross-platform. */
function ocadToolPath() {
  const pkg = require.resolve('ocad2geojson/package.json')
  return path.join(path.dirname(pkg), 'src', 'ocad-tool.js')
}

function exportSvg(inputPath, outputPath) {
  execFileSync(process.execPath, [ocadToolPath(), 'export', inputPath, outputPath], {
    stdio: 'pipe',
  })
}

/* --------------------------------------------------------------------- main */

async function main() {
  const args = process.argv.slice(2)
  let inputPath = args[0]

  if (!inputPath) {
    const entries = await fs.readdir(INPUT_DIR).catch(() => [])
    const first = entries.filter((name) => name.toLowerCase().endsWith('.ocd')).sort()[0]
    if (!first) {
      fail(`no .ocd given and none found in ${path.relative(ROOT, INPUT_DIR)}`)
    }
    inputPath = path.join(INPUT_DIR, first)
    console.log(`  no input given, using ${path.relative(ROOT, inputPath)}`)
  }

  inputPath = path.resolve(inputPath)
  const buffer = await fs.readFile(inputPath).catch(() => null)
  if (!buffer) fail(`cannot read ${inputPath}`)

  const slug = path.basename(inputPath, path.extname(inputPath))
  const outDir = args[1] ? path.resolve(args[1]) : path.join(OUT_ROOT, slug)
  await fs.mkdir(outDir, { recursive: true })

  console.log(`\n  reading ${path.relative(ROOT, inputPath)}`)

  let file
  try {
    file = await readOcad(inputPath)
  } catch (error) {
    fail(`ocad2geojson could not read this file: ${error.message}`)
  }

  const header = file.header
  let rawCrs = null
  try {
    rawCrs = file.getCrs()
  } catch {
    rawCrs = null
  }
  // Older OCAD files can preserve an origin without a usable CRS identifier.
  // Do not treat catalog:null/code:0 as georeferencing: downstream downloads
  // need a real CRS and a false positive would select the wrong terrain source.
  const crs = rawCrs && typeof rawCrs.catalog === 'string' && Number.isInteger(rawCrs.code) && rawCrs.code > 0
    ? rawCrs
    : null

  /* ---- objects: one feature per map object, in projected metres ---- */

  const objectsGeoJson = ocadToGeoJson(file, {
     applyCrs: Boolean(rawCrs),
    generateSymbolElements: false,
    coordinatePrecision: 3,
  })

  const objectsBySym = new Map()
  for (const object of file.objects) {
    objectsBySym.set(object.sym, (objectsBySym.get(object.sym) ?? 0) + 1)
  }

  const symbolsBySymNum = new Map(file.symbols.map((symbol) => [symbol.symNum, symbol]))

  /* ---- enrich features so the file is self-describing downstream ---- */

  for (const feature of objectsGeoJson.features) {
    const symNum = feature.properties.sym
    const symbol = symbolsBySymNum.get(symNum)
    const { code, sub } = splitNumber(symbol?.number)
    Object.assign(feature.properties, {
      code: Number.isFinite(code) ? code : null,
      sub,
      description: symbol?.description ?? null,
      kind: OBJECT_TYPES[feature.properties.otp] ?? 'unknown',
      category: symbol ? classifySymbol(symbol) : 'unknown',
    })
  }

  const bounds = bboxOf(objectsGeoJson.features)
  if (!bounds) fail('the map has no geometry')

  /* ---- local coordinates: x east, z south, origin at the north-west corner ---- */

  const localGeoJson = {
    type: 'FeatureCollection',
    features: objectsGeoJson.features.map((feature) => ({
      ...feature,
      geometry: transformGeometry(feature.geometry, bounds),
    })),
  }

  /* ---- symbol table ---- */

  const symbols = file.symbols
    .map((symbol) => {
      const { code, sub } = splitNumber(symbol.number)
      return {
        symNum: symbol.symNum,
        number: symbol.number,
        code: Number.isFinite(code) ? code : null,
        sub,
        description: symbol.description ?? '',
        type: SYMBOL_TYPES[symbol.otp] ?? 'unknown',
        category: classifySymbol(symbol),
        hidden: typeof symbol.isHidden === 'function' ? symbol.isHidden() : false,
        objects: objectsBySym.get(symbol.symNum) ?? 0,
      }
    })
    .sort((a, b) => (a.code ?? 9999) - (b.code ?? 9999) || a.sub.localeCompare(b.sub))

  const usedSymbols = symbols.filter((symbol) => symbol.objects > 0)
  const orphanObjects = file.objects.filter((object) => !symbolsBySymNum.has(object.sym))

  /* ---- stats ---- */

  const byCategory = {}
  for (const symbol of symbols) {
    const bucket = (byCategory[symbol.category] ??= { defined: 0, used: 0, objects: 0 })
    bucket.defined += 1
    if (symbol.objects > 0) bucket.used += 1
    bucket.objects += symbol.objects
  }

  const featuresByKind = {}
  for (const feature of objectsGeoJson.features) {
    const kind = feature.properties.kind ?? 'unknown'
    featuresByKind[kind] = (featuresByKind[kind] ?? 0) + 1
  }

  const polygonArea = objectsGeoJson.features
    .filter((feature) => feature.properties.category === 'terrain')
    .reduce((sum, feature) => sum + geometryArea(feature.geometry), 0)
  const bboxArea = bounds.width * bounds.height

  /* ---- files ---- */

  const info = {
    source: {
      file: path.basename(inputPath),
      bytes: buffer.length,
      sha256: sha256(buffer),
    },
    format: {
      ocadVersion: header.version,
      fileVersion: header.currentFileVersion,
      subVersion: header.subVersion,
      subSubVersion: header.subSubVersion,
    },
     scale: rawCrs?.scale ?? null,
    georeferencing: crs
      ? {
          catalog: crs.catalog,
          code: crs.code,
          name: crs.name,
          origin: { easting: crs.easting, northing: crs.northing },
          grivation: crs.grivation,
        }
      : null,
    extent: {
      projected: {
        minX: round(bounds.minX),
        minY: round(bounds.minY),
        maxX: round(bounds.maxX),
        maxY: round(bounds.maxY),
      },
      metres: { width: round(bounds.width, 1), height: round(bounds.height, 1) },
      areaHectares: round(bboxArea / 10000, 1),
    },
    counts: {
      symbolsDefined: symbols.length,
      symbolsUsed: usedSymbols.length,
      objects: file.objects.length,
      features: objectsGeoJson.features.length,
      featuresByKind,
      orphanObjects: orphanObjects.length,
      polygonCoverage: round(bboxArea > 0 ? polygonArea / bboxArea : 0, 3),
    },
    parserWarnings: file.warnings,
  }

  await writeJson(path.join(outDir, 'info.json'), info)
  await writeJson(path.join(outDir, 'symbols.json'), symbols)
  await fs.writeFile(path.join(outDir, 'symbols.csv'), toSymbolsCsv(symbols), 'utf8')
  await writeJson(path.join(outDir, 'objects.geojson'), objectsGeoJson)
  await writeJson(path.join(outDir, 'objects-local.geojson'), localGeoJson)

  /* ---- rendering ---- */

  const svgPath = path.join(outDir, 'map.svg')
  let pngNote = 'not generated'
  try {
    exportSvg(inputPath, svgPath)
    const svg = await fs.readFile(svgPath, 'utf8')
    const widthPx = Math.min(4096, Math.max(1024, Math.round(bounds.width * 2)))
    const png = new Resvg(svg, {
      fitTo: { mode: 'width', value: widthPx },
      background: 'white',
    })
      .render()
      .asPng()
    await fs.writeFile(path.join(outDir, 'map.png'), png)
    pngNote = `${widthPx}px wide`
  } catch (error) {
    pngNote = `failed: ${error.message}`
  }

  /* ---- report ---- */

  const warnings = buildWarnings({ info, symbols, usedSymbols, crs, rawCrs, bounds, orphanObjects })
  const report = buildReport({ info, symbols, usedSymbols, byCategory, warnings, pngNote })
  await fs.writeFile(path.join(outDir, 'report.md'), report, 'utf8')

  /* ---- console ---- */

  const rel = path.relative(ROOT, outDir)
  console.log(`
  OCAD ${header.version}  ·  scale 1:${rawCrs?.scale ?? '?'}  ·  ${crs ? `${crs.catalog}:${crs.code} ${crs.name}` : 'INCOMPLETE GEOREFERENCING'}
  extent ${fmt(bounds.width, 1)} m × ${fmt(bounds.height, 1)} m  (${fmt(bboxArea / 10000, 1)} ha)
  ${file.objects.length} objects  ·  ${symbols.length} symbols defined, ${usedSymbols.length} used
  map.png ${pngNote}

  written to ${rel}\\
    report.md  info.json  symbols.json  symbols.csv
    objects.geojson  objects-local.geojson  map.svg  map.png
`)

  if (warnings.length) {
    console.log('  warnings:')
    for (const warning of warnings) console.log(`    - ${warning}`)
    console.log('')
  }
}

/* ---------------------------------------------------------------- utilities */

function round(value, digits = 3) {
  const factor = 10 ** digits
  return Math.round(value * factor) / factor
}

function transformGeometry(geometry, bounds) {
  if (!geometry) return geometry
  const mapPoint = ([x, y]) => [round(x - bounds.minX, 2), round(bounds.maxY - y, 2)]
  const walk = (coordinates) =>
    typeof coordinates[0] === 'number' ? mapPoint(coordinates) : coordinates.map(walk)
  return { ...geometry, coordinates: walk(geometry.coordinates) }
}

async function writeJson(filePath, value) {
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8')
}

function toSymbolsCsv(symbols) {
  const escape = (value) => {
    const text = String(value ?? '')
    return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text
  }
  const header = ['number', 'description', 'type', 'category', 'objects', 'mapped_to']
  const rows = symbols.map((symbol) =>
    [symbol.number, symbol.description, symbol.type, symbol.category, symbol.objects, '']
      .map(escape)
      .join(',')
  )
  return `${[header.join(','), ...rows].join('\n')}\n`
}

function buildWarnings({ info, symbols, usedSymbols, crs, rawCrs, bounds, orphanObjects }) {
  const warnings = []

  if (!crs) {
    if (rawCrs && Number.isFinite(rawCrs.easting) && Number.isFinite(rawCrs.northing)) {
      warnings.push(
        `INCOMPLETE GEOREFERENCING: the map has an origin (${rawCrs.easting}, ${rawCrs.northing}) but no valid CRS identifier. Confirm the projection before selecting terrain data.`
      )
    } else {
      warnings.push(
        'NO GEOREFERENCING: the map has no CRS/origin, so it cannot be aligned with LiDAR or OSM. Phase 1 will need a manual alignment step.'
      )
    }
  } else if (crs.grivation) {
    warnings.push(
      `Map grivation is ${crs.grivation}°: the map is rotated against the CRS grid. Keep it in mind when aligning with the DEM.`
    )
  }

  if (bounds.width < 500 || bounds.height < 500) {
    warnings.push(
      `Small extent (${fmt(bounds.width)} m × ${fmt(bounds.height)} m). This looks like an excerpt or a symbol test file, not a race map.`
    )
  }

  if (orphanObjects.length) {
    warnings.push(
      `${orphanObjects.length} objects reference a symbol that is not defined in the file; they will be skipped.`
    )
  }

  const unnamed = usedSymbols.filter((symbol) => !symbol.description)
  if (unnamed.length) {
    warnings.push(
      `${unnamed.length} used symbols have no description (${unnamed
        .slice(0, 5)
        .map((symbol) => symbol.number)
        .join(', ')}${unnamed.length > 5 ? ', …' : ''}). The mapping table will need another way to identify them.`
    )
  }

  const technical = info.counts.featuresByKind.text ?? 0
  if (technical) {
    warnings.push(
      `${technical} text objects: they are drawn on the paper map but carry no 3D meaning and will be filtered out.`
    )
  }

  if (info.counts.polygonCoverage < 0.5) {
    warnings.push(
      `Terrain polygons only cover ${Math.round(
        info.counts.polygonCoverage * 100
      )}% of the bounding box. Expect gaps in the ground classification; the pipeline will need a base class.`
    )
  }

  for (const warning of info.parserWarnings) {
    warnings.push(`parser: ${warning}`)
  }

  return warnings
}

function buildReport({ info, symbols, usedSymbols, byCategory, warnings, pngNote }) {
  const lines = []
  const push = (line = '') => lines.push(line)

  const georef = info.georeferencing
  const top = [...usedSymbols].sort((a, b) => b.objects - a.objects).slice(0, 20)

  push(`# Phase 0 report — ${info.source.file}`)
  push()
  push(`Generated by \`tools/phase0/inspect.mjs\`.`)
  push()
  push('## File')
  push()
  push('| | |')
  push('|---|---|')
  push(`| File | \`${info.source.file}\` |`)
  push(`| Size | ${fmt(info.source.bytes)} bytes |`)
  push(`| SHA-256 | \`${info.source.sha256.slice(0, 16)}…\` |`)
  push(`| OCAD version | ${info.format.ocadVersion} (file format ${info.format.fileVersion}) |`)
  push(`| Scale | 1:${info.scale ?? '?'} |`)
  push()
  push('## Georeferencing')
  push()
  if (georef) {
    push('| | |')
    push('|---|---|')
    push(`| CRS | ${georef.catalog}:${georef.code} — ${georef.name} |`)
    push(`| Origin | ${fmt(georef.origin.easting)} E, ${fmt(georef.origin.northing)} N |`)
    push(`| Grivation | ${georef.grivation}° |`)
  } else {
    push('**No georeferencing.** The file has no CRS, so it cannot be aligned with LiDAR automatically.')
  }
  push()
  push('## Extent')
  push()
  push('| | |')
  push('|---|---|')
  push(`| Width | ${fmt(info.extent.metres.width, 1)} m |`)
  push(`| Height | ${fmt(info.extent.metres.height, 1)} m |`)
  push(`| Bounding box | ${fmt(info.extent.areaHectares, 1)} ha |`)
  push()
  push('## Objects')
  push()
  push('| Kind | Objects |')
  push('|---|---:|')
  for (const [kind, count] of Object.entries(info.counts.featuresByKind).sort((a, b) => b[1] - a[1])) {
    push(`| ${kind} | ${fmt(count)} |`)
  }
  push(`| **Total** | **${fmt(info.counts.features)}** |`)
  push()
  push('## Symbols')
  push()
  push('| Category | Defined | Used | Objects |')
  push('|---|---:|---:|---:|')
  for (const category of ['terrain', 'technical', 'course', 'text', 'unknown']) {
    const bucket = byCategory[category]
    if (!bucket) continue
    push(`| ${category} | ${bucket.defined} | ${bucket.used} | ${fmt(bucket.objects)} |`)
  }
  push()
  push('### Most used symbols')
  push()
  push('| # | Description | Type | Objects | Category |')
  push('|---:|---|---|---:|---|')
  for (const symbol of top) {
    push(
      `| ${symbol.number} | ${symbol.description || '—'} | ${symbol.type} | ${fmt(
        symbol.objects
      )} | ${symbol.category} |`
    )
  }
  push()
  push('## Warnings')
  push()
  if (warnings.length === 0) {
    push('None. The file looks clean.')
  } else {
    for (const warning of warnings) push(`- ${warning}`)
  }
  push()
  push('## Output files')
  push()
  push('| File | Contents |')
  push('|---|---|')
  push('| `info.json` | Everything above, machine-readable |')
  push('| `symbols.json` | Every symbol defined, with usage counts |')
  push('| `symbols.csv` | Same, plus an empty `mapped_to` column for the Phase 2 mapping |')
  push('| `objects.geojson` | One feature per object, projected metres |')
  push('| `objects-local.geojson` | Same, local metres: x east, z south, origin at NW corner |')
  push(`| \`map.svg\` | Vector rendering (${pngNote === 'not generated' ? '—' : 'see map.png'}) |`)
  push(`| \`map.png\` | Raster rendering, ${pngNote} |`)
  push()
  push('## Phase 1 readiness')
  push()
  push(`- ${georef ? '✅' : '❌'} Georeferenced (required to align with LiDAR)`)
  push(`- ${info.extent.metres.width >= 500 ? '✅' : '⚠️'} Race-sized map`)
  push(`- ${(byCategory.terrain?.used ?? 0) > 0 ? '✅' : '❌'} Terrain symbols present`)
  push(`- ${info.counts.polygonCoverage >= 0.5 ? '✅' : '⚠️'} Ground polygons cover the map`)
  push()

  return `${lines.join('\n')}\n`
}

await main()
