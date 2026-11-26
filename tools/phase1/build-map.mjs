#!/usr/bin/env node
/** Orchestrate OCAD ingestion through terrain-class rasterisation and map.bundle. */

import fs from 'node:fs/promises'
import path from 'node:path'
import crypto from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'

const ROOT = path.resolve(fileURLToPath(new URL('../..', import.meta.url)))
const args = process.argv.slice(2)
const options = { input: null, output: null, georeference: null, crsOverride: null, dtm: null }

function usage() {
  console.log(`Usage: npm run build-map -- [map.ocd] [options]

Options:
  --output <dir>             Pipeline output directory (default: data/out/<map>-pipeline)
  --georeference <json>      Verified anchor config for a map needing georeferencing
  --crs-override <json>      Verified CRS for a map with preserved projected coordinates
  --dtm <file-or-dir>        Source GeoTIFF or prepared DTM directory; otherwise auto-select provider
  --help                     Show this help

The command stops rather than guessing when georeferencing or a terrain source needs
human input. It does not convert OCAD 9 or older files.`)
}

for (let index = 0; index < args.length; index += 1) {
  const arg = args[index]
  if (arg === '--help' || arg === '-h') { usage(); process.exit(0) }
  if (arg.startsWith('--')) {
    const key = { '--output': 'output', '--georeference': 'georeference', '--crs-override': 'crsOverride', '--dtm': 'dtm' }[arg]
    if (!key) throw new Error(`unknown option: ${arg}`)
    const value = args[++index]
    if (!value || value.startsWith('--')) throw new Error(`${arg} requires a value`)
    options[key] = path.resolve(value)
  } else if (options.input) {
    throw new Error(`unexpected argument: ${arg}`)
  } else {
    options.input = path.resolve(arg)
  }
}

if (!options.input) {
  const inputDir = path.join(ROOT, 'data', 'input')
  const maps = (await fs.readdir(inputDir).catch(() => []))
    .filter((name) => name.toLowerCase().endsWith('.ocd'))
    .sort()
  if (maps.length === 1) {
    options.input = path.join(inputDir, maps[0])
    console.log(`Using the only .ocd file in data/input: ${maps[0]}`)
  } else if (maps.length > 1) {
    throw new Error(`Found ${maps.length} .ocd files in data/input. Specify which one to build as the first argument.`)
  } else {
    usage()
    throw new Error('No .ocd input provided and no .ocd file found in data/input')
  }
}
if (options.georeference && options.crsOverride) throw new Error('choose either --georeference or --crs-override, not both')
if (path.extname(options.input).toLowerCase() !== '.ocd') throw new Error('input must be an .ocd file')
const slug = path.basename(options.input, path.extname(options.input)).replace(/[^\p{L}\p{N}._-]+/gu, '-')
const outputDir = options.output ?? path.join(ROOT, 'data', 'out', `${slug}-pipeline`)
const mapDir = outputDir
const dtmDir = path.join(outputDir, 'dtm')
const classesDir = path.join(outputDir, 'classes')
const bundleDir = path.join(outputDir, 'map.bundle')
const node = process.execPath

function run(label, script, scriptArgs) {
  console.log(`\n== ${label} ==`)
  const result = spawnSync(node, [path.join(ROOT, script), ...scriptArgs], { cwd: ROOT, stdio: 'inherit' })
  if (result.error) throw result.error
  if (result.status !== 0) {
    const detail = label === 'OCAD ingestion'
      ? '\nIf this is an OCAD 9 or older file, convert it to a supported OCAD 12/2018 file first.'
      : ''
    throw new Error(`${label} failed${result.status === null ? '' : ` (exit ${result.status})`}${detail}`)
  }
}

async function readJson(file) {
  return JSON.parse(await fs.readFile(file, 'utf8'))
}

async function exists(file) {
  try { await fs.access(file); return true } catch { return false }
}

await fs.mkdir(outputDir, { recursive: true })
const existingInfoPath = path.join(mapDir, 'info.json')
if (await exists(existingInfoPath)) {
  const existingInfo = await readJson(existingInfoPath)
  const inputHash = crypto.createHash('sha256').update(await fs.readFile(options.input)).digest('hex')
  if (existingInfo.source?.sha256 !== inputHash) {
    throw new Error(`output directory belongs to a different map: ${outputDir}\nChoose a fresh --output directory; existing output was not modified.`)
  }
  console.log(`Resuming from existing OCAD ingestion: ${mapDir}`)
} else {
  const entries = await fs.readdir(outputDir)
  if (entries.length) throw new Error(`output directory is not empty: ${outputDir}\nChoose a fresh --output directory; existing output was not modified.`)
  console.log(`Building map bundle for ${options.input}`)
  run('OCAD ingestion', 'tools/phase0/inspect.mjs', [options.input, mapDir])
}
console.log(`Output: ${outputDir}`)

if (options.georeference) {
  run('Apply verified map anchor', 'tools/phase0/georeference.mjs', [mapDir, options.georeference])
} else if (options.crsOverride) {
  run('Apply verified CRS override', 'tools/phase0/apply-crs-override.mjs', [mapDir, options.crsOverride])
} else {
  const info = await readJson(path.join(mapDir, 'info.json'))
  if (!info.georeferencing?.code) {
    throw new Error(`Pipeline paused after OCAD ingestion: this map has no usable CRS.\nProvide --georeference <config.json> with a verified CRS and anchor, or --crs-override <config.json> if projected coordinates are already present. No coordinates were guessed.\nIngest outputs: ${mapDir}`)
  }
  const extent = info.extent.projected
  const georef = {
    source: path.basename(mapDir),
    crs: info.georeferencing,
    anchor: { x: extent.minX, z: 0, easting: extent.minX, northing: extent.maxY },
    method: 'native projected coordinates from OCAD; map north-west corner used as local origin',
    outputs: ['objects-georeferenced.geojson'],
  }
  await fs.copyFile(path.join(mapDir, 'objects.geojson'), path.join(mapDir, 'objects-georeferenced.geojson'))
  await fs.writeFile(path.join(mapDir, 'georeference.json'), `${JSON.stringify(georef, null, 2)}\n`)
  console.log('\n== Native OCAD georeferencing ==\nUsing the map CRS and projected coordinates recorded in OCAD.')
}

const info = await readJson(path.join(mapDir, 'info.json'))
const georef = await readJson(path.join(mapDir, 'georeference.json'))
const width = info.extent.metres.width
const height = info.extent.metres.height
const west = georef.anchor.easting - georef.anchor.x
const north = georef.anchor.northing + georef.anchor.z
const pipelineInfo = {
  ...info,
  georeferencing: georef.crs,
  extent: {
    ...info.extent,
    projected: { minX: west, minY: north - height, maxX: west + width, maxY: north },
  },
}
const pipelineInfoPath = path.join(outputDir, 'pipeline-info.json')
await fs.writeFile(pipelineInfoPath, `${JSON.stringify(pipelineInfo, null, 2)}\n`)

if (options.dtm) {
  const dtmStat = await fs.stat(options.dtm)
  if (dtmStat.isDirectory()) {
    const suppliedMetadata = await readJson(path.join(options.dtm, 'metadata.json'))
    if (await exists(path.join(dtmDir, 'metadata.json'))) {
      const existingMetadata = await readJson(path.join(dtmDir, 'metadata.json'))
      const gridFields = ['source', 'crs', 'width', 'height', 'resolution', 'origin', 'extent']
      if (gridFields.some((field) => JSON.stringify(existingMetadata[field]) !== JSON.stringify(suppliedMetadata[field]))) {
        throw new Error(`output already contains a different prepared DTM: ${dtmDir}\nChoose a fresh --output directory.`)
      }
      console.log(`\n== Reuse prepared DTM ==\n${dtmDir}`)
    } else {
      await fs.cp(options.dtm, dtmDir, { recursive: true, errorOnExist: true })
    }
  } else {
    run('Prepare supplied DTM', 'tools/phase1/prepare-dtm.mjs', [options.dtm, dtmDir, `EPSG:${georef.crs.code}`])
  }
} else {
  run('Select terrain provider', 'tools/phase1/resolve-terrain-source.mjs', [pipelineInfoPath])
  const provider = await readJson(path.join(outputDir, 'terrain-source.json'))
  const sourceDir = path.join(outputDir, 'terrain-source')
  const sourceTif = path.join(sourceDir, 'terrain.tif')
  if (provider.provider === 'IGN') {
    run('Download IGN terrain', 'tools/phase1/download-ign-dtm.mjs', [pipelineInfoPath, sourceTif])
    run('Prepare downloaded terrain', 'tools/phase1/prepare-dtm.mjs', [sourceTif, dtmDir, `EPSG:${georef.crs.code}`])
  } else if (provider.provider === 'Kartverket') {
    const extent = pipelineInfo.extent.projected
    const tileCount = (Math.ceil(extent.maxX / 1000) - Math.floor(extent.minX / 1000)) *
      (Math.ceil(extent.maxY / 1000) - Math.floor(extent.minY / 1000))
    if (tileCount !== 1) {
      throw new Error(`Pipeline paused before terrain download: this Norway map needs ${tileCount} Kartverket 1 km tiles, but the current preparer supports one tile at a time. Supply --dtm <prepared-DTM-directory>; no download was started.`)
    }
    run('Download Kartverket terrain tile', 'tools/phase1/download-kartverket-dtm.mjs', [pipelineInfoPath, sourceDir])
    const tiles = (await fs.readdir(sourceDir)).filter((name) => name.toLowerCase().endsWith('.tif'))
    if (tiles.length !== 1) throw new Error(`Expected one Kartverket TIFF tile, received ${tiles.length}`)
    run('Prepare downloaded terrain', 'tools/phase1/prepare-dtm.mjs', [path.join(sourceDir, tiles[0]), dtmDir, 'EPSG:25832'])
  } else {
    throw new Error(`Pipeline paused: ${provider.provider} terrain acquisition requires a manual request.\nDownload the DTM for ${provider.dataset} and rerun with --dtm <GeoTIFF-or-prepared-DTM-directory>. The pipeline will not submit an email or guess a source.`)
  }
}

run('Rasterise terrain classes', 'tools/phase1/rasterize-classes.mjs', [mapDir, dtmDir, classesDir])
run('Build map.bundle', 'tools/phase1/build-bundle.mjs', [mapDir, dtmDir, bundleDir, classesDir])
console.log(`\nPipeline complete. Bundle: ${bundleDir}`)
