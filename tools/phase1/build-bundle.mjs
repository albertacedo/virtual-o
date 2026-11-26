#!/usr/bin/env node
/** Build the first Unity-facing map.bundle from prepared Phase 0 and DTM outputs. */

import fs from 'node:fs/promises'
import path from 'node:path'

const [mapDirArg, dtmDirArg, bundleDirArg] = process.argv.slice(2)
if (!mapDirArg || !dtmDirArg || !bundleDirArg) {
  console.error('usage: build-bundle.mjs <map-output-dir> <dtm-dir> <bundle-dir>')
  process.exit(1)
}

const mapDir = path.resolve(mapDirArg)
const dtmDir = path.resolve(dtmDirArg)
const bundleDir = path.resolve(bundleDirArg)
const readJson = async (file) => JSON.parse(await fs.readFile(file, 'utf8'))
const copy = async (source, target) => {
  await fs.mkdir(path.dirname(target), { recursive: true })
  await fs.copyFile(source, target)
}

const mapInfo = await readJson(path.join(mapDir, 'info.json'))
const georef = await readJson(path.join(mapDir, 'georeference.json'))
const dtm = await readJson(path.join(dtmDir, 'metadata.json'))

if (dtm.crs !== 'EPSG:25831') throw new Error(`unsupported DTM CRS: ${dtm.crs}`)
if (georef.crs.code !== 25831) throw new Error(`map and DTM CRS do not match: ${georef.crs.code}`)

const projectedMap = {
  west: georef.anchor.easting - georef.anchor.x,
  east: georef.anchor.easting - georef.anchor.x + mapInfo.extent.projected.maxX - mapInfo.extent.projected.minX,
  north: georef.anchor.northing + georef.anchor.z,
  south: georef.anchor.northing + georef.anchor.z - mapInfo.extent.projected.maxY + mapInfo.extent.projected.minY,
}
const covers = projectedMap.west >= dtm.extent.west && projectedMap.east <= dtm.extent.east &&
  projectedMap.south >= dtm.extent.south && projectedMap.north <= dtm.extent.north
if (!covers) throw new Error(`DTM does not cover map extent: ${JSON.stringify({ projectedMap, dtm: dtm.extent })}`)

await fs.rm(bundleDir, { recursive: true, force: true })
await fs.mkdir(bundleDir, { recursive: true })
await copy(path.join(dtmDir, 'heightmap.bin'), path.join(bundleDir, 'height', 'heightmap.bin'))
await copy(path.join(dtmDir, 'metadata.json'), path.join(bundleDir, 'height', 'metadata.json'))
await copy(path.join(mapDir, 'objects-georeferenced.geojson'), path.join(bundleDir, 'vectors', 'objects.geojson'))
await copy(path.join(mapDir, 'map.png'), path.join(bundleDir, 'drape', 'map.png'))

const manifest = {
  bundleVersion: 1,
  source: { file: mapInfo.source.file, sha256: mapInfo.source.sha256 },
  crs: georef.crs,
  origin: { easting: projectedMap.west, northing: projectedMap.north },
  map: {
    width: mapInfo.extent.metres.width,
    height: mapInfo.extent.metres.height,
    projectedExtent: projectedMap,
    localCoordinates: 'x east, z south from the north-west map origin',
  },
  height: {
    file: 'height/heightmap.bin',
    metadata: 'height/metadata.json',
    resolution: dtm.resolution,
    encoding: dtm.encoding,
  },
  vectors: 'vectors/objects.geojson',
  drape: 'drape/map.png',
  generatedBy: 'virtual-o phase 1 bundle builder',
  limitations: ['terrain classes and Unity import are not included yet'],
}
await fs.writeFile(path.join(bundleDir, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`)

console.log(`  wrote ${path.join(bundleDir, 'manifest.json')}`)
console.log(`  map extent is covered by the DTM: ${covers}`)
