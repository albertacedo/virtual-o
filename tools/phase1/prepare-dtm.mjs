#!/usr/bin/env node
/**
 * Prepare a Float32 GeoTIFF as a local heightmap. Supports the tiled/LZW ICGC
 * output and the uncompressed strip GeoTIFF returned by the IGN WMS service.
 *
 * Usage:
 *   node tools/phase1/prepare-dtm.mjs <input.tif> <output-dir> [crs]
 */

import fs from 'node:fs/promises'
import path from 'node:path'

const [inputArg, outputArg, crsArg = 'EPSG:25831'] = process.argv.slice(2)
if (!inputArg || !outputArg) {
  console.error('usage: prepare-dtm.mjs <input.tif> <output-dir>')
  process.exit(1)
}

const inputPath = path.resolve(inputArg)
const outputDir = path.resolve(outputArg)
const bytes = await fs.readFile(inputPath)
const littleEndian = bytes[0] === 0x49 && bytes[1] === 0x49
if (!littleEndian && !(bytes[0] === 0x4d && bytes[1] === 0x4d)) throw new Error('unsupported TIFF byte order')
const endian = littleEndian ? 'LE' : 'BE'
const u16 = (offset) => littleEndian ? bytes.readUInt16LE(offset) : bytes.readUInt16BE(offset)
const u32 = (offset) => littleEndian ? bytes.readUInt32LE(offset) : bytes.readUInt32BE(offset)
const f64 = (offset) => littleEndian ? bytes.readDoubleLE(offset) : bytes.readDoubleBE(offset)
const typeSize = { 1: 1, 2: 1, 3: 2, 4: 4, 5: 8, 12: 8 }

const ifdOffset = u32(4)
const tagCount = u16(ifdOffset)
const tags = new Map()
for (let i = 0; i < tagCount; i += 1) {
  const entry = ifdOffset + 2 + i * 12
  const tag = u16(entry)
  const type = u16(entry + 2)
  const count = u32(entry + 4)
  const size = (typeSize[type] ?? 0) * count
  const valueOffset = size <= 4 ? entry + 8 : u32(entry + 8)
  const values = []
  for (let j = 0; j < count; j += 1) {
    const offset = valueOffset + j * (typeSize[type] ?? 0)
    if (type === 3) values.push(u16(offset))
    else if (type === 4) values.push(u32(offset))
    else if (type === 12) values.push(f64(offset))
    else if (type === 1) values.push(bytes[offset])
  }
  tags.set(tag, values)
}

const width = tags.get(0x0100)?.[0]
const height = tags.get(0x0101)?.[0]
const bitsPerSample = tags.get(0x0102)?.[0]
const compression = tags.get(0x0103)?.[0]
const tileWidth = tags.get(0x0142)?.[0]
const tileHeight = tags.get(0x0143)?.[0]
const tileOffsets = tags.get(0x0144)
const tileByteCounts = tags.get(0x0145)
const stripOffsets = tags.get(0x0111)
const stripByteCounts = tags.get(0x0117)
const rowsPerStrip = tags.get(0x0116)?.[0]
const sampleFormat = tags.get(0x0153)?.[0] ?? 1
const scale = tags.get(33550)
const tiePoint = tags.get(33922)
const tiled = (compression === 1 || compression === 5) && tileOffsets && tileByteCounts && tileWidth && tileHeight
const stripped = compression === 1 && stripOffsets && stripByteCounts && rowsPerStrip
if (!width || !height || bitsPerSample !== 32 || sampleFormat !== 3 || (!tiled && !stripped)) {
  throw new Error(`unsupported TIFF layout (${endian}, ${width}x${height}, ${bitsPerSample} bit, compression ${compression}, sample format ${sampleFormat})`)
}

function decodeLzw(input) {
  let bitPosition = 0
  let codeSize = 9
  let nextCode = 258
  let previous = null
  let table = new Map(Array.from({ length: 256 }, (_, i) => [i, Uint8Array.of(i)]))
  const clear = 256
  const end = 257
  const output = []
  const readCode = () => {
    if (bitPosition + codeSize > input.length * 8) return null
    let value = 0
    for (let i = 0; i < codeSize; i += 1) {
      value = (value << 1) | ((input[bitPosition >> 3] >> (7 - (bitPosition & 7))) & 1)
      bitPosition += 1
    }
    return value
  }
  while (true) {
    const code = readCode()
    if (code === null || code === end) break
    if (code === clear) {
      table = new Map(Array.from({ length: 256 }, (_, i) => [i, Uint8Array.of(i)]))
      codeSize = 9
      nextCode = 258
      previous = null
      continue
    }
    let entry = table.get(code)
    if (!entry && code === nextCode && previous) {
      entry = new Uint8Array(previous.length + 1)
      entry.set(previous)
      entry[entry.length - 1] = previous[0]
    }
    if (!entry) throw new Error(`invalid TIFF LZW code ${code}`)
    output.push(entry)
    if (previous) {
      const added = new Uint8Array(previous.length + 1)
      added.set(previous)
      added[added.length - 1] = entry[0]
      table.set(nextCode++, added)
      if (nextCode === (1 << codeSize) - 1 && codeSize < 12) codeSize += 1
    }
    previous = entry
  }
  const result = new Uint8Array(output.reduce((sum, item) => sum + item.length, 0))
  let offset = 0
  for (const item of output) { result.set(item, offset); offset += item.length }
  return result
}

const raster = new Float32Array(width * height)
const readFloat = (offset) => endian === 'LE' ? bytes.readFloatLE(offset) : bytes.readFloatBE(offset)
if (tiled) {
  const tilesX = Math.ceil(width / tileWidth)
  for (let tile = 0; tile < tileOffsets.length; tile += 1) {
    const compressed = bytes.subarray(tileOffsets[tile], tileOffsets[tile] + tileByteCounts[tile])
    const decodedBytes = compression === 5 ? decodeLzw(compressed) : compressed
    const decoded = Buffer.from(decodedBytes.buffer, decodedBytes.byteOffset, decodedBytes.byteLength)
    const tileX = tile % tilesX
    const tileY = Math.floor(tile / tilesX)
    for (let y = 0; y < tileHeight; y += 1) {
      for (let x = 0; x < tileWidth; x += 1) {
        const source = (y * tileWidth + x) * 4
        const targetX = tileX * tileWidth + x
        const targetY = tileY * tileHeight + y
        if (targetX < width && targetY < height) raster[targetY * width + targetX] = readFloatFrom(decoded, source)
      }
    }
  }
} else {
  for (let strip = 0; strip < stripOffsets.length; strip += 1) {
    const rows = Math.min(rowsPerStrip, height - strip * rowsPerStrip)
    const offset = stripOffsets[strip]
    for (let row = 0; row < rows; row += 1) {
      for (let col = 0; col < width; col += 1) {
        raster[(strip * rowsPerStrip + row) * width + col] = readFloat(offset + (row * width + col) * 4)
      }
    }
  }
}

function readFloatFrom(buffer, offset) {
  return endian === 'LE' ? buffer.readFloatLE(offset) : buffer.readFloatBE(offset)
}

const finite = [...raster].filter((value) => Number.isFinite(value) && value !== -9999)
const min = finite.reduce((value, item) => Math.min(value, item), Infinity)
const max = finite.reduce((value, item) => Math.max(value, item), -Infinity)
const tfw = await fs.readFile(inputPath.replace(/\.tif$/i, '.tfw'), 'utf8').catch(() => '')
const worldFile = tfw.trim().split(/\s+/).map(Number)
const resolution = scale?.[0] ?? worldFile[0] ?? 5
const origin = tiePoint && tiePoint.length >= 6
  ? { easting: tiePoint[3], northing: tiePoint[4] }
  : { easting: 0, northing: height * resolution }
await fs.mkdir(outputDir, { recursive: true })
await fs.writeFile(path.join(outputDir, 'heightmap.bin'), Buffer.from(raster.buffer))
const preview = Buffer.alloc(width * height)
for (let i = 0; i < raster.length; i += 1) preview[i] = raster[i] === -9999 ? 0 : Math.round(((raster[i] - min) / (max - min)) * 255)
await fs.writeFile(path.join(outputDir, 'heightmap.pgm'), Buffer.concat([Buffer.from(`P5\n${width} ${height}\n255\n`), preview]))
await fs.writeFile(path.join(outputDir, 'metadata.json'), `${JSON.stringify({
  source: path.basename(inputPath),
  crs: crsArg,
  width, height, tileWidth: tileWidth ?? null, tileHeight: tileHeight ?? null, resolution,
  origin,
  extent: { west: origin.easting, east: origin.easting + width * resolution, south: origin.northing - height * resolution, north: origin.northing },
  worldFile, nodata: -9999, minimumElevation: min, maximumElevation: max,
  encoding: 'row-major Float32 little-endian; rows north to south',
}, null, 2)}\n`)
console.log(`  wrote ${path.join(outputDir, 'heightmap.bin')}`)
console.log(`  wrote ${path.join(outputDir, 'metadata.json')}`)
console.log(`  elevation range: ${min.toFixed(2)}–${max.toFixed(2)} m`)
