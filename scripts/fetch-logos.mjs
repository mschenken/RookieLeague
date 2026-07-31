#!/usr/bin/env node
/**
 * One-time fetch of the 32 NFL team logos into public/logos/.
 *
 * We copy them into the repo rather than hotlinking so the site stays self-contained
 * and does not break if ESPN reorganises its CDN. Re-run only if a logo changes.
 */

import { writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const OUT = join(ROOT, 'public', 'logos')

const TEAMS = [
  'ari', 'atl', 'bal', 'buf', 'car', 'chi', 'cin', 'cle', 'dal', 'den', 'det', 'gb',
  'hou', 'ind', 'jax', 'kc', 'lac', 'lar', 'lv', 'mia', 'min', 'ne', 'no', 'nyg',
  'nyj', 'phi', 'pit', 'sea', 'sf', 'tb', 'ten', 'wsh',
]

mkdirSync(OUT, { recursive: true })

let fetched = 0
let skipped = 0
const failures = []

await Promise.all(TEAMS.map(async (abbr) => {
  const dest = join(OUT, `${abbr}.png`)
  if (existsSync(dest)) { skipped++; return }
  try {
    // Resize via ESPN's combiner rather than the /nfl/<size>/ paths — only /500/ exists
    // for all 32 teams (/200/ 404s for 11 of them). 160px stays crisp on retina at the
    // ~64px these render in the intro and keeps the set near 300KB instead of 1.7MB,
    // which matters because the intro loads all 32 at once.
    const src = encodeURIComponent(`/i/teamlogos/nfl/500/${abbr}.png`)
    const res = await fetch(`https://a.espncdn.com/combiner/i?img=${src}&w=160&h=160`)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    writeFileSync(dest, Buffer.from(await res.arrayBuffer()))
    fetched++
  } catch (err) {
    failures.push(`${abbr}: ${err.message}`)
  }
}))

console.log(`  logos: ${fetched} fetched, ${skipped} already present`)
if (failures.length) {
  console.error(`  ${failures.length} failed:\n    ${failures.join('\n    ')}`)
  process.exit(1)
}
