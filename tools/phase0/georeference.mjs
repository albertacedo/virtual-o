#!/usr/bin/env node
/**
 * Apply a surveyed anchor to Phase 0 local coordinates.
 *
 * The anchor is the same physical point in local map metres and in a projected
 * CRS. Local coordinates use x east and z south; projected coordinates use x
 * east and y north.
 *
 * Usage:
 *   node tools/phase0/georeference.mjs <phase0-output-dir> <config.json>
 */

import fs from 'node:fs/promises'
import path from 'node:path'

function fail(message) {
  console.error(`\n  error: ${message}\n`)
  process.exit(1)
}

function transformGeometry(geometry, mapPoint) {
  if (!geometry) return geometry
  const walk = (coordinates) =>
    typeof coordinates[0] === 'number' ? mapPoint(coordinates) : coordinates.map(walk)
  return { ...geometry, coordinates: walk(geometry.coordinates) }
}

const [outputArg, configArg] = process.argv.slice(2)
if (!outputArg || !configArg) fail('usage: georeference.mjs <phase0-output-dir> <config.json>')

const outputDir = path.resolve(outputArg)
const configPath = path.resolve(configArg)
const config = JSON.parse(await fs.readFile(configPath, 'utf8'))
const local = JSON.parse(await fs.readFile(path.join(outputDir, 'objects-local.geojson'), 'utf8'))

for (const field of ['crs', 'anchor']) {
  if (!config[field]) fail(`config is missing ${field}`)
}
for (const field of ['x', 'z', 'easting', 'northing']) {
  if (!Number.isFinite(config.anchor[field])) fail(`anchor.${field} must be numeric`)
}

const mapPoint = ([x, z]) => [
  config.anchor.easting + x - config.anchor.x,
  config.anchor.northing - z + config.anchor.z,
]

const projected = {
  ...local,
  crs: {
    type: 'name',
    properties: { name: `urn:ogc:def:crs:EPSG::${config.crs.code}` },
  },
  features: local.features.map((feature) => ({
    ...feature,
    geometry: transformGeometry(feature.geometry, mapPoint),
  })),
}

const metadata = {
  source: path.basename(outputDir),
  crs: config.crs,
  anchor: config.anchor,
  method: config.method ?? 'translation from a known anchor; validate against additional map features before LiDAR fusion',
  outputs: ['objects-georeferenced.geojson'],
}

await fs.writeFile(path.join(outputDir, 'objects-georeferenced.geojson'), `${JSON.stringify(projected, null, 2)}\n`)
await fs.writeFile(path.join(outputDir, 'georeference.json'), `${JSON.stringify(metadata, null, 2)}\n`)

console.log(`  wrote ${path.join(outputDir, 'objects-georeferenced.geojson')}`)
console.log(`  wrote ${path.join(outputDir, 'georeference.json')}`)
