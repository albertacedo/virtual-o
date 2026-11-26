#!/usr/bin/env node
/** Apply a verified CRS override to a Phase 0 map whose OCAD CRS is incomplete. */

import fs from 'node:fs/promises'
import path from 'node:path'

const [mapArg, overrideArg] = process.argv.slice(2)
if (!mapArg || !overrideArg) {
  console.error('usage: apply-crs-override.mjs <phase0-output-dir> <crs-override.json>')
  process.exit(1)
}

const mapDir = path.resolve(mapArg)
const override = JSON.parse(await fs.readFile(path.resolve(overrideArg), 'utf8'))
const info = JSON.parse(await fs.readFile(path.join(mapDir, 'info.json'), 'utf8'))
const objects = JSON.parse(await fs.readFile(path.join(mapDir, 'objects.geojson'), 'utf8'))
if (!override.crs || !Number.isInteger(override.crs.code) || override.crs.code <= 0) {
  throw new Error('override must contain a valid positive crs.code')
}
if (override.confidence !== 'high') throw new Error('CRS override must be marked confidence: high')

const crsName = `urn:ogc:def:crs:EPSG::${override.crs.code}`
const projected = {
  ...objects,
  crs: { type: 'name', properties: { name: crsName } },
}
const extent = info.extent.projected
const metadata = {
  source: path.basename(mapDir),
  crs: override.crs,
  confidence: override.confidence,
  method: override.method,
  anchor: {
    name: 'map north-west corner derived from projected Phase 0 extent',
    x: 0,
    z: 0,
    easting: extent.minX,
    northing: extent.maxY,
  },
  outputs: ['objects-georeferenced.geojson'],
}
await fs.writeFile(path.join(mapDir, 'objects-georeferenced.geojson'), `${JSON.stringify(projected, null, 2)}\n`)
await fs.writeFile(path.join(mapDir, 'georeference.json'), `${JSON.stringify(metadata, null, 2)}\n`)
console.log(`  applied EPSG:${override.crs.code} to ${mapDir}`)
