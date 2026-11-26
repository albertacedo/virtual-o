#!/usr/bin/env node
/** Download a 5 m IGN RGE ALTI GeoTIFF for a Phase 0 projected extent. */

import fs from 'node:fs/promises'
import path from 'node:path'

const [infoArg, outputArg, overrideArg] = process.argv.slice(2)
if (!infoArg || !outputArg) {
  console.error('usage: download-ign-dtm.mjs <info.json> <output.tif> [crs-override.json]')
  process.exit(1)
}

const info = JSON.parse(await fs.readFile(path.resolve(infoArg), 'utf8'))
const override = overrideArg ? JSON.parse(await fs.readFile(path.resolve(overrideArg), 'utf8')) : null
const crs = override?.crs?.code ?? info.georeferencing?.code
if (crs !== 27572) throw new Error(`IGN RGE ALTI downloader requires EPSG:27572, got ${crs ?? 'none'}`)
const { minX, minY, maxX, maxY } = info.extent.projected
const resolution = 5
const width = Math.ceil((maxX - minX) / resolution)
const height = Math.ceil((maxY - minY) / resolution)
const bbox = {
  west: minX,
  south: maxY - height * resolution,
  east: minX + width * resolution,
  north: maxY,
}
const params = new URLSearchParams({
  SERVICE: 'WMS',
  REQUEST: 'GetMap',
  VERSION: '1.3.0',
  LAYERS: 'ELEVATION.ELEVATIONGRIDCOVERAGE.HIGHRES',
  STYLES: '',
  CRS: 'EPSG:27572',
  BBOX: `${bbox.west},${bbox.south},${bbox.east},${bbox.north}`,
  WIDTH: String(width),
  HEIGHT: String(height),
  FORMAT: 'image/geotiff',
})
const url = `https://data.geopf.fr/wms-r/wms?${params}`
const response = await fetch(url)
if (!response.ok) throw new Error(`IGN request failed: ${response.status} ${response.statusText}`)
const bytes = Buffer.from(await response.arrayBuffer())
if (!(bytes[0] === 0x49 && bytes[1] === 0x49) && !(bytes[0] === 0x4d && bytes[1] === 0x4d)) {
  throw new Error('IGN response is not a TIFF')
}
const outputPath = path.resolve(outputArg)
await fs.mkdir(path.dirname(outputPath), { recursive: true })
await fs.writeFile(outputPath, bytes)
await fs.writeFile(`${outputPath}.request.json`, `${JSON.stringify({ url, crs: 'EPSG:27572', resolution, width, height, bbox }, null, 2)}\n`)
console.log(`  downloaded ${width} × ${height} cells from IGN RGE ALTI`)
console.log(`  wrote ${outputPath}`)
