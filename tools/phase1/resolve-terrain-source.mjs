#!/usr/bin/env node
/** Resolve a terrain-data provider from a map CRS and projected extent. */

import fs from 'node:fs/promises'
import path from 'node:path'

const [infoArg, overrideArg] = process.argv.slice(2)
if (!infoArg) {
  console.error('usage: resolve-terrain-source.mjs <info.json> [crs-override.json]')
  process.exit(1)
}

const infoPath = path.resolve(infoArg)
const info = JSON.parse(await fs.readFile(infoPath, 'utf8'))
const override = overrideArg ? JSON.parse(await fs.readFile(path.resolve(overrideArg), 'utf8')) : null
const crs = override?.crs ?? info.georeferencing
if (!crs || !Number.isInteger(crs.code) || crs.code <= 0) {
  throw new Error('map has no valid CRS; provide a verified CRS override before selecting terrain data')
}

const providers = {
  25831: {
    country: 'ES',
    provider: 'ICGC',
    dataset: 'Catalonia 5 m DTM',
    acquisition: 'ICGC download service',
  },
  27572: {
    country: 'FR',
    provider: 'IGN',
    dataset: 'RGE ALTI / Géoplateforme terrain model',
    acquisition: 'IGN Géoplateforme download service',
  },
  32632: {
    country: 'NO',
    provider: 'Kartverket',
    dataset: 'Nasjonal høydemodell DTM 1 m',
    acquisition: 'Geonorge WCS 1.0 service',
  },
}
const source = providers[crs.code]
if (!source) throw new Error(`no terrain provider is registered for EPSG:${crs.code}`)

const result = {
  sourceMap: info.source.file,
  crs,
  country: source.country,
  provider: source.provider,
  dataset: source.dataset,
  acquisition: source.acquisition,
  projectedExtent: info.extent.projected,
  selection: override ? 'verified CRS override' : 'map CRS metadata',
}
const outputPath = path.join(path.dirname(infoPath), 'terrain-source.json')
await fs.writeFile(outputPath, `${JSON.stringify(result, null, 2)}\n`)
console.log(`  selected ${source.provider} for ${source.country} (EPSG:${crs.code})`)
console.log(`  wrote ${outputPath}`)
