#!/usr/bin/env node
/** Download Kartverket's 1 m NHM DTM tiles for a Phase 0 projected extent. */

import fs from 'node:fs/promises'
import path from 'node:path'

const [infoArg, outputDirArg] = process.argv.slice(2)
if (!infoArg || !outputDirArg) {
  console.error('usage: download-kartverket-dtm.mjs <info.json> <output-dir>')
  process.exit(1)
}

const info = JSON.parse(await fs.readFile(path.resolve(infoArg), 'utf8'))
const mapCrs = info.georeferencing?.code
if (mapCrs !== 32632) throw new Error(`Kartverket sample adapter requires EPSG:32632, got ${mapCrs ?? 'none'}`)
const extent = info.extent.projected
const tileSize = 1000
const x0 = Math.floor(extent.minX / tileSize) * tileSize
const y0 = Math.floor(extent.minY / tileSize) * tileSize
const x1 = Math.ceil(extent.maxX / tileSize) * tileSize
const y1 = Math.ceil(extent.maxY / tileSize) * tileSize
const outputDir = path.resolve(outputDirArg)
await fs.mkdir(outputDir, { recursive: true })

const urls = []
for (let northing = y0; northing < y1; northing += tileSize) {
  for (let easting = x0; easting < x1; easting += tileSize) {
    const params = new URLSearchParams({
      service: 'WCS', request: 'GetCoverage', version: '1.0.0',
      coverage: 'nhm_dtm_topo_25832', crs: 'EPSG:25832',
      bbox: `${easting},${northing},${easting + tileSize},${northing + tileSize}`,
      width: String(tileSize), height: String(tileSize), format: 'GeoTIFF',
    })
    const url = `https://wcs.geonorge.no/skwms1/wcs.hoyde-dtm-nhm-25832?${params}`
    const response = await fetch(url)
    if (!response.ok) throw new Error(`Kartverket request failed: ${response.status} ${response.statusText}`)
    const bytes = Buffer.from(await response.arrayBuffer())
    if (!(bytes[0] === 0x49 && bytes[1] === 0x49) && !(bytes[0] === 0x4d && bytes[1] === 0x4d)) {
      throw new Error(`Kartverket response is not a TIFF for ${easting},${northing}`)
    }
    const file = path.join(outputDir, `${easting}_${northing}.tif`)
    await fs.writeFile(file, bytes)
    urls.push({ file, url, bbox: [easting, northing, easting + tileSize, northing + tileSize] })
    console.log(`  downloaded Kartverket tile ${easting},${northing}`)
  }
}
await fs.writeFile(path.join(outputDir, 'requests.json'), `${JSON.stringify({ mapCrs: 'EPSG:32632', sourceCrs: 'EPSG:25832', resolution: 1, urls }, null, 2)}\n`)
