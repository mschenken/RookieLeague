#!/usr/bin/env node
/**
 * The Rookie League — data pipeline.
 *
 *   data/*.csv + data/managers.json  ->  src/data/league.json  (+ data/data-warnings.md)
 *
 * Everything the browser renders is computed here so the app stays a thin rendering
 * layer and every validation failure happens loudly at build time.
 *
 * Design notes worth knowing before editing:
 *  - The `Reg Season Rank` column in the source CSV is CORRUPT (every year has duplicate
 *    ranks). We ignore it entirely and recompute seeding from W/L/T.
 *  - The CSV's own `OVERALL RECORDS` section is internally consistent with the per-season
 *    rows, so we assert against it to catch parser regressions for free.
 *  - Playoff appearance is derived as `finalRank <= playoffSpots`, which holds cleanly in
 *    10 of 14 seasons. The exceptions are reported in data-warnings.md rather than hidden.
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const DATA = join(ROOT, 'data')
const OUT = join(ROOT, 'src', 'data')

const warnings = []
const warn = (scope, msg) => warnings.push({ scope, msg })
const fail = (msg) => {
  console.error(`\n  BUILD FAILED: ${msg}\n`)
  process.exit(1)
}

/* ---------------------------------------------------------------- CSV parsing */

/** Parse one CSV line, honouring double-quoted fields. */
function parseLine(line) {
  const out = []
  let cur = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const c = line[i]
    if (inQuotes) {
      if (c === '"') {
        if (line[i + 1] === '"') { cur += '"'; i++ } else { inQuotes = false }
      } else cur += c
    } else if (c === '"') inQuotes = true
    else if (c === ',') { out.push(cur); cur = '' }
    else cur += c
  }
  out.push(cur)
  return out.map((s) => s.trim())
}

/** Rows from a headered CSV body, skipping blanks and `#` comments. */
function parseCsv(text) {
  const lines = text.split(/\r?\n/).filter((l) => l.trim() && !l.trimStart().startsWith('#'))
  if (!lines.length) return []
  const header = parseLine(lines[0])
  return lines.slice(1).map((l) => {
    const cells = parseLine(l)
    return Object.fromEntries(header.map((h, i) => [h, cells[i] ?? '']))
  })
}

/** Split the scraped history file into its `=== SECTION ===` blocks. */
function parseSections(text) {
  const parts = text.split(/^===\s*(.*?)\s*===$/m)
  const sections = {}
  for (let i = 1; i < parts.length; i += 2) sections[parts[i]] = parseCsv(parts[i + 1])
  return sections
}

/* ------------------------------------------------------------------- helpers */

const norm = (s) => s.trim().toLowerCase().replace(/\s+/g, ' ')
const num = (v) => { const n = Number(v); return Number.isFinite(n) ? n : 0 }
const round = (n, d = 3) => Math.round(n * 10 ** d) / 10 ** d
const slug = (s) => norm(s).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

/* ---------------------------------------------------------------- load source */

const history = parseSections(readFileSync(join(DATA, 'rookie_league_history_2012-2025.csv'), 'utf8'))
const seasonsCfg = JSON.parse(readFileSync(join(DATA, 'seasons.json'), 'utf8')).seasons
const SEASON = new Map(seasonsCfg.map((s) => [s.year, s]))

const champRows = history['CHAMPIONS BY YEAR'] ?? fail('missing CHAMPIONS BY YEAR section')
const finalRows = history['FINAL STANDINGS (all years)'] ?? fail('missing FINAL STANDINGS section')
const regRows = history['REGULAR SEASON STANDINGS (all years)'] ?? fail('missing REGULAR SEASON section')
const overallRows = history['OVERALL RECORDS (aggregated across all seasons)'] ?? []

/* ------------------------------------------------- normalise per-season records */

/** One row per (year, team): regular-season record joined to final placement. */
const teamSeasons = regRows.map((r) => ({
  year: num(r.Year),
  team: r.Team,
  key: norm(r.Team),
  division: r.Division || 'Division 1',
  w: num(r.W),
  l: num(r.L),
  t: num(r.T),
}))

for (const ts of teamSeasons) {
  ts.games = ts.w + ts.l + ts.t
  ts.winPct = ts.games ? (ts.w + 0.5 * ts.t) / ts.games : 0
}

// Join final placement onto each team-season.
const finalByKey = new Map()
for (const r of finalRows) finalByKey.set(`${num(r.Year)}|${norm(r.Team)}`, num(r['Final Rank']))
for (const ts of teamSeasons) {
  const rank = finalByKey.get(`${ts.year}|${ts.key}`)
  if (rank === undefined) fail(`no final placement for ${ts.team} in ${ts.year}`)
  ts.finalRank = rank
}

// Every final-standings row must have a matching regular-season row.
const regKeys = new Set(teamSeasons.map((ts) => `${ts.year}|${ts.key}`))
for (const r of finalRows) {
  const k = `${num(r.Year)}|${norm(r.Team)}`
  if (!regKeys.has(k)) fail(`final standings row with no regular-season record: ${r.Team} ${r.Year}`)
}

/* --------------------------- ASSERTION: agree with the CSV's own OVERALL RECORDS */

{
  const agg = new Map()
  for (const ts of teamSeasons) {
    const a = agg.get(ts.key) ?? { seasons: 0, w: 0, l: 0, t: 0 }
    a.seasons++; a.w += ts.w; a.l += ts.l; a.t += ts.t
    agg.set(ts.key, a)
  }
  let mismatches = 0
  for (const r of overallRows) {
    const a = agg.get(norm(r.Team))
    if (!a) { warn('assert', `OVERALL RECORDS lists "${r.Team}" but no per-season rows exist`); mismatches++; continue }
    if (a.seasons !== num(r.Seasons) || a.w !== num(r['Total W']) || a.l !== num(r['Total L']) || a.t !== num(r['Total T'])) {
      warn('assert', `${r.Team}: CSV says ${r.Seasons}s ${r['Total W']}-${r['Total L']}-${r['Total T']}, computed ${a.seasons}s ${a.w}-${a.l}-${a.t}`)
      mismatches++
    }
  }
  if (mismatches) fail(`${mismatches} row(s) disagree with the CSV's own OVERALL RECORDS totals — the parser or the source changed`)
  console.log(`  ✓ totals match CSV's OVERALL RECORDS for all ${overallRows.length} teams`)
}

// teamCount in seasons.json must match reality.
for (const [year, cfg] of SEASON) {
  const actual = teamSeasons.filter((ts) => ts.year === year).length
  if (actual !== cfg.teamCount) fail(`seasons.json says ${year} had ${cfg.teamCount} teams, CSV has ${actual}`)
  if (cfg.playoffSpots > actual) fail(`seasons.json says ${year} had ${cfg.playoffSpots} playoff spots but only ${actual} teams`)
}
console.log(`  ✓ seasons.json team counts match the standings for all ${SEASON.size} seasons`)

/* ------------------------------------------------------- recompute seeding */

// Seed by win pct, descending. Tied teams share a seed (competition ranking:
// 1,2,2,4). We have no per-team points-for, so ties genuinely cannot be broken —
// sharing the seed is honest where inventing an order would not be.
const byYear = new Map()
for (const ts of teamSeasons) {
  if (!byYear.has(ts.year)) byYear.set(ts.year, [])
  byYear.get(ts.year).push(ts)
}
for (const [year, rows] of byYear) {
  rows.sort((a, b) => b.winPct - a.winPct)
  let seed = 0
  rows.forEach((ts, i) => {
    if (i === 0 || ts.winPct !== rows[i - 1].winPct) seed = i + 1
    ts.seed = seed
    ts.seedShared = rows.filter((o) => o.winPct === ts.winPct).length > 1
  })
  const spots = SEASON.get(year).playoffSpots
  if (rows.length > spots && rows[spots - 1].winPct === rows[spots].winPct) {
    const tied = rows.filter((r) => r.winPct === rows[spots - 1].winPct).map((r) => r.team)
    warn('seeding', `${year}: seed tie straddles the playoff cutoff at ${rows[spots - 1].winPct.toFixed(3)} — ${tied.join(', ')}. Playoff field taken from final placement instead.`)
  }
}

/* --------------------------------------------- playoff appearance + anomalies */

for (const ts of teamSeasons) {
  ts.madePlayoffs = ts.finalRank <= SEASON.get(ts.year).playoffSpots
  ts.seedVsFinish = ts.madePlayoffs ? ts.seed - ts.finalRank : null
}

// Sanity-check the "top N by final rank == the playoff field" rule: flag any team
// that missed while a weaker team got in.
for (const [year, rows] of byYear) {
  const spots = SEASON.get(year).playoffSpots
  const inField = rows.filter((r) => r.madePlayoffs)
  const worstIn = Math.min(...inField.map((r) => r.winPct))
  const anomalies = rows.filter((r) => !r.madePlayoffs && r.winPct > worstIn)
  if (anomalies.length) {
    const cfg = SEASON.get(year)
    const why = cfg.divisions > 1 ? ' (expected — this season had divisions, so division winners likely auto-qualified)' : ''
    warn('playoffs', `${year} (top ${spots}): ${anomalies.map((a) => `${a.team} ${a.w}-${a.l} (.${String(Math.round(a.winPct * 1000)).padStart(3, '0')})`).join(', ')} missed the bracket despite a better record than a team that made it${why}`)
  }
}

/* ---------------------------------------------------- champions / podiums */

const podium = [] // { year, place, team }
for (const r of champRows) {
  const year = num(r.Year)
  for (const [col, place] of [['Champion', 1], ['Second Place', 2], ['Third Place', 3]]) {
    const team = r[col]
    if (!team) continue
    if (!finalByKey.has(`${year}|${norm(team)}`)) fail(`${year} ${col} "${team}" does not appear in that season's standings`)
    podium.push({ year, place, team, key: norm(team) })
  }
}
console.log(`  ✓ all ${podium.length} podium entries resolve to a real team-season`)

/* ------------------------------------------------------ records (from screenshots) */

const readRecords = (file) => existsSync(join(DATA, file)) ? parseCsv(readFileSync(join(DATA, file), 'utf8')) : []
const weekRecords = readRecords('record_week_points.csv').map((r) => ({ year: num(r.year), team: r.team, key: norm(r.team), week: num(r.week), points: num(r.points) }))
const seasonRecords = readRecords('record_season_points.csv').map((r) => ({ year: num(r.year), team: r.team, key: norm(r.team), points: num(r.points) }))
const playerRecords = readRecords('record_player_points.csv').map((r) => ({
  year: num(r.year), player: r.player, nflTeam: r.nfl_team, position: r.position,
  week: num(r.week), points: num(r.points), team: r.rostered_by, key: norm(r.rostered_by),
}))

// Every team named in a record must exist in that season's standings.
for (const [label, rows] of [['week', weekRecords], ['season', seasonRecords], ['player', playerRecords]]) {
  for (const r of rows) {
    if (!finalByKey.has(`${r.year}|${r.key}`)) fail(`${label} record for ${r.year} names "${r.team}", which is not in that season's standings`)
  }
}
console.log(`  ✓ ${weekRecords.length} week / ${seasonRecords.length} season / ${playerRecords.length} player records cross-check against the standings`)

/* ------------------------------------------------------- manager identity */

const allKeys = [...new Set(teamSeasons.map((ts) => ts.key))].sort()
const displayName = new Map() // key -> nicest-cased original spelling
for (const ts of teamSeasons) if (!displayName.has(ts.key)) displayName.set(ts.key, ts.team)

// One row per team name, with a `manager` column a human fills in. A spreadsheet
// beats hand-edited JSON here, and the shape makes the dangerous error impossible:
// each team appears on exactly one row, so it cannot be claimed twice. Merging is
// implicit — two rows sharing a manager name are the same person.
const MANAGERS_PATH = join(DATA, 'managers.csv')

if (!existsSync(MANAGERS_PATH)) {
  writeFileSync(MANAGERS_PATH, buildManagerScaffold(), 'utf8')
  console.log(`\n  → Wrote data/managers.csv (${allKeys.length} team names) — fill in the "manager" column.\n`)
}

const mgrRows = parseCsv(readFileSync(MANAGERS_PATH, 'utf8'))

// The roster of team names must match the data exactly, or a season would vanish.
{
  const listed = mgrRows.map((r) => norm(r.team_name)).filter(Boolean)
  const dupes = listed.filter((k, i) => listed.indexOf(k) !== i)
  if (dupes.length) fail(`data/managers.csv lists these team names more than once:\n    - ${[...new Set(dupes)].map((k) => displayName.get(k) ?? k).join('\n    - ')}`)
  const unknown = listed.filter((k) => !allKeys.includes(k))
  if (unknown.length) fail(`data/managers.csv names teams that are not in the standings:\n    - ${unknown.join('\n    - ')}`)
  const missing = allKeys.filter((k) => !listed.includes(k))
  if (missing.length) fail(`data/managers.csv is missing ${missing.length} team name(s):\n    - ${missing.map((k) => displayName.get(k)).join('\n    - ')}\n\n  Delete the file and re-run \`npm run data\` to regenerate it, or add the rows by hand.`)
}

// Group rows into managers. Rows with the same (case-insensitive) manager name merge;
// a blank name means "not identified yet" and stands alone under its team name.
const groups = new Map()
let unmapped = 0
for (const r of mgrRows) {
  const key = norm(r.team_name)
  const named = (r.manager ?? '').trim()
  if (!named) unmapped++
  const gk = named ? `named:${named.toLowerCase()}` : `team:${key}`
  if (!groups.has(gk)) {
    groups.set(gk, { id: slug(named || displayName.get(key)), name: named || displayName.get(key), identified: Boolean(named), aliases: [] })
  }
  groups.get(gk).aliases.push(displayName.get(key))
}

const managerDefs = [...groups.values()]
const keyToManager = new Map()
for (const m of managerDefs) for (const a of m.aliases) keyToManager.set(norm(a), m)

const managersComplete = unmapped === 0
if (unmapped) warn('managers', `${unmapped} of ${mgrRows.length} team names have no manager yet in data/managers.csv — they show under their team name, and one person can still appear as several entries.`)
console.log(`  ✓ ${allKeys.length} team names resolve to ${managerDefs.length} managers${unmapped ? ` (${unmapped} not yet identified)` : ''}`)

/** Emit a spreadsheet for a human to finish, richest context first. */
function buildManagerScaffold() {
  const rows = allKeys.map((k) => {
    const seasons = teamSeasons.filter((ts) => ts.key === k).sort((a, b) => a.year - b.year)
    const titles = podium.filter((p) => p.key === k && p.place === 1).length
    return {
      team_name: displayName.get(k),
      manager: '',
      seasons: seasons.length,
      years: seasons.map((s) => s.year).join(' '),
      record: `${seasons.reduce((s, x) => s + x.w, 0)}-${seasons.reduce((s, x) => s + x.l, 0)}`,
      titles,
      best_finish: Math.min(...seasons.map((s) => s.finalRank)),
    }
  })
  // Long-tenured teams first: those are the easy ones, and doing them first tells you
  // which names are left over for the one-season renames.
  rows.sort((a, b) => b.seasons - a.seasons || a.years.localeCompare(b.years))

  const q = (v) => (/[",]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v))
  const header = ['team_name', 'manager', 'seasons', 'years', 'record', 'titles', 'best_finish']
  return [
    '# Who was who. Fill in the "manager" column with the real person\'s name — that is the',
    '# only column you edit. Everything else is context to help you remember.',
    '#',
    '# Two rows with the SAME manager name become one person, and their whole history merges.',
    '# Spelling must match exactly (capitalisation does not matter). Leave a row blank if you',
    '# genuinely do not know; it will just show under its team name.',
    '#',
    '# Editing in Excel or Google Sheets is fine — keep the header row and save as CSV.',
    '# Then run: npm run data',
    header.join(','),
    ...rows.map((r) => header.map((h) => q(r[h])).join(',')),
  ].join('\n') + '\n'
}

/* ------------------------------------------------------------ aggregation */

const mgrId = (key) => keyToManager.get(key).id

const managers = managerDefs.map((m) => {
  const seasons = teamSeasons
    .filter((ts) => m.aliases.some((a) => norm(a) === ts.key))
    .sort((a, b) => a.year - b.year)
    .map((ts) => {
      const cfg = SEASON.get(ts.year)
      return {
        year: ts.year, team: ts.team, w: ts.w, l: ts.l, t: ts.t,
        winPct: round(ts.winPct), seed: ts.seed, seedShared: ts.seedShared,
        finalRank: ts.finalRank, teamCount: cfg.teamCount, playoffSpots: cfg.playoffSpots,
        madePlayoffs: ts.madePlayoffs, seedVsFinish: ts.seedVsFinish,
        placementPct: cfg.teamCount > 1 ? round((cfg.teamCount - ts.finalRank) / (cfg.teamCount - 1)) : 1,
      }
    })

  const w = seasons.reduce((s, x) => s + x.w, 0)
  const l = seasons.reduce((s, x) => s + x.l, 0)
  const t = seasons.reduce((s, x) => s + x.t, 0)
  const games = w + l + t
  const mine = new Set(m.aliases.map(norm))
  const places = podium.filter((p) => mine.has(p.key))
  const playoffSeasons = seasons.filter((s) => s.madePlayoffs)
  const championships = places.filter((p) => p.place === 1).length
  const runnerUps = places.filter((p) => p.place === 2).length
  const finals = championships + runnerUps
  const avg = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null)

  return {
    id: m.id,
    name: m.name,
    identified: m.identified,
    teamNames: seasons.map((s) => s.team).filter((v, i, a) => a.indexOf(v) === i),
    seasons,
    firstYear: seasons[0]?.year ?? null,
    lastYear: seasons.at(-1)?.year ?? null,
    seasonCount: seasons.length,
    w, l, t, games,
    winPct: games ? round((w + 0.5 * t) / games) : 0,
    championships,
    runnerUps,
    thirdPlace: places.filter((p) => p.place === 3).length,
    podiums: places.length,
    finalsAppearances: finals,
    titleRate: finals ? round(championships / finals) : null,
    titleYears: places.filter((p) => p.place === 1).map((p) => p.year).sort(),
    playoffAppearances: playoffSeasons.length,
    playoffRate: seasons.length ? round(playoffSeasons.length / seasons.length) : 0,
    avgFinish: round(avg(seasons.map((s) => s.finalRank)) ?? 0, 2),
    avgFinishPct: round(avg(seasons.map((s) => s.placementPct)) ?? 0),
    bestFinish: seasons.length ? Math.min(...seasons.map((s) => s.finalRank)) : null,
    seedVsFinish: playoffSeasons.length ? round(avg(playoffSeasons.map((s) => s.seedVsFinish)), 2) : null,
    seedVsFinishSeasons: playoffSeasons.length,
  }
})

// Championship totals must survive the merge exactly.
{
  const merged = managers.reduce((s, m) => s + m.championships, 0)
  const raw = podium.filter((p) => p.place === 1).length
  if (merged !== raw) fail(`championships changed during manager merge: ${raw} in source, ${merged} after (an alias is missing or duplicated)`)
  const mw = managers.reduce((s, m) => s + m.w, 0)
  const rw = teamSeasons.reduce((s, ts) => s + ts.w, 0)
  if (mw !== rw) fail(`total wins changed during manager merge: ${rw} -> ${mw}`)
}
console.log('  ✓ championship and win totals survive the manager merge unchanged')

/* -------------------------------------------------------------- output */

const decorate = (r) => ({ ...r, managerId: mgrId(r.key), managerName: managers.find((m) => m.id === mgrId(r.key)).name })

const league = {
  generatedFrom: 'data/rookie_league_history_2012-2025.csv + ESPN Hall of Fame screenshots',
  years: [...SEASON.keys()].sort(),
  seasons: seasonsCfg,
  managersComplete,
  unmappedTeams: unmapped,
  managers,
  podium: podium.map(decorate),
  standings: teamSeasons.map((ts) => ({
    year: ts.year, team: ts.team, managerId: mgrId(ts.key), division: ts.division,
    w: ts.w, l: ts.l, t: ts.t, winPct: round(ts.winPct),
    seed: ts.seed, seedShared: ts.seedShared, finalRank: ts.finalRank,
    madePlayoffs: ts.madePlayoffs, seedVsFinish: ts.seedVsFinish,
  })).sort((a, b) => b.year - a.year || a.finalRank - b.finalRank),
  records: {
    week: weekRecords.map(decorate).sort((a, b) => b.points - a.points),
    season: seasonRecords.map(decorate).sort((a, b) => b.points - a.points),
    player: playerRecords.map(decorate).sort((a, b) => b.points - a.points),
  },
  warnings,
}

mkdirSync(OUT, { recursive: true })
writeFileSync(join(OUT, 'league.json'), JSON.stringify(league, null, 2), 'utf8')

const md = [
  '# Data warnings',
  '',
  '_Generated by `npm run data`. These are known quirks in the source data, surfaced',
  'rather than silently smoothed over._',
  '',
  ...(warnings.length ? [] : ['No warnings. ✅']),
  ...['assert', 'seeding', 'playoffs', 'managers']
    .map((scope) => {
      const items = warnings.filter((w) => w.scope === scope)
      return items.length ? [`## ${scope}`, '', ...items.map((i) => `- ${i.msg}`), ''] : []
    })
    .flat(),
].join('\n')
writeFileSync(join(DATA, 'data-warnings.md'), md, 'utf8')

console.log(`\n  Wrote src/data/league.json — ${managers.length} managers, ${teamSeasons.length} team-seasons, ${league.years.length} years.`)
console.log(`  Wrote data/data-warnings.md — ${warnings.length} warning(s).\n`)
