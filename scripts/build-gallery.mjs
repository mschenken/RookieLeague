#!/usr/bin/env node
/**
 * photos/  ->  public/gallery/  +  src/data/gallery.json
 *
 * Two things this does that matter beyond making files smaller:
 *
 *  1. Strips ALL metadata. Phone photos carry EXIF blocks up to 12KB that routinely
 *     include GPS coordinates and device identifiers, and this site is public. sharp
 *     drops metadata unless you ask for it back, so simply re-encoding sanitises them.
 *  2. Caps the long edge at 1400px. The originals total 28MB, which is absurd for a
 *     gallery that renders at ~400px wide.
 *
 * Animated GIFs become animated WebP, which is dramatically smaller for the same frames.
 *
 * Run with `npm run gallery` after adding photos. Requires the optional `sharp` dep.
 */

import { readdirSync, mkdirSync, writeFileSync, existsSync, statSync } from 'node:fs'
import { dirname, join, extname, basename } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const SRC = join(ROOT, 'photos')
const OUT = join(ROOT, 'public', 'gallery')
const MANIFEST = join(ROOT, 'src', 'data', 'gallery.json')

let sharp
try {
  ({ default: sharp } = await import('sharp'))
} catch {
  console.error('  build-gallery needs sharp:  npm i -D sharp')
  process.exit(1)
}

if (!existsSync(SRC)) {
  console.log('  no photos/ directory — skipping gallery build')
  writeFileSync(MANIFEST, JSON.stringify({ images: [] }, null, 2))
  process.exit(0)
}

mkdirSync(OUT, { recursive: true })

const MAX_EDGE = 1400
const files = readdirSync(SRC)
  .filter((f) => /\.(jpe?g|png|gif|webp)$/i.test(f))
  .sort()

const images = []
let srcBytes = 0
let outBytes = 0

for (const file of files) {
  const from = join(SRC, file)
  const animated = extname(file).toLowerCase() === '.gif'
  const name = `${basename(file, extname(file)).toLowerCase()}.webp`
  const to = join(OUT, name)

  srcBytes += statSync(from).size

  const img = sharp(from, { animated })
  const md = await img.metadata()
  // An animated GIF's reported height is every frame stacked, so use pageHeight.
  const h = md.pageHeight ?? md.height
  const w = md.width
  const scale = Math.min(1, MAX_EDGE / Math.max(w, h))

  await img
    .resize({ width: Math.round(w * scale), withoutEnlargement: true })
    // Animated frames get leaned on harder: every frame pays the full cost, so at
    // stills quality the one GIF here outweighed all 25 photos combined.
    .webp(animated ? { quality: 45, effort: 6, nearLossless: false } : { quality: 80, effort: 5 })
    .toFile(to) // no .withMetadata() — this is what drops EXIF/GPS

  outBytes += statSync(to).size
  images.push({
    src: `gallery/${name}`,
    width: Math.round(w * scale),
    height: Math.round(h * scale),
    animated,
  })
}

mkdirSync(dirname(MANIFEST), { recursive: true })
writeFileSync(MANIFEST, JSON.stringify({ images }, null, 2))

const mb = (b) => (b / 1048576).toFixed(1)
console.log(`  gallery: ${images.length} images, ${mb(srcBytes)}MB -> ${mb(outBytes)}MB (metadata stripped)`)
