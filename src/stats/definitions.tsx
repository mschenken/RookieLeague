import { useState } from 'react'
import { Link } from 'react-router-dom'
import Leaderboard, { type Row } from '../components/Leaderboard'
import {
  league, managers, fmtPct, fmtPoints, fmtRecord, fmtSigned, ordinal,
  DEFAULT_MIN_SEASONS, type Manager,
} from '../lib/league'

export type StatDef = {
  slug: string
  title: string
  blurb: string
  accent: string
  glyph: string
  method: string
  preview: { value: string; leader: string }
  Body: () => JSX.Element
}

/* ------------------------------------------------------------------ shared */

const maxOf = (xs: number[]) => Math.max(...xs, 0)

function MinSeasons({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  return (
    <label className="flex items-center gap-2 text-xs text-muted">
      <span>Minimum seasons</span>
      <select
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="rounded-md border border-hair bg-raised px-2 py-1 text-xs text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-gold"
      >
        {[1, 2, 3, 5, 8].map((n) => (
          <option key={n} value={n}>{n === 1 ? 'All' : `${n}+`}</option>
        ))}
      </select>
    </label>
  )
}

function Toolbar({ children }: { children: React.ReactNode }) {
  return <div className="mb-4 flex flex-wrap items-center gap-x-5 gap-y-2">{children}</div>
}

const qualified = (min: number) => managers.filter((m) => m.seasonCount >= min)
const nameOf = (m: Manager) => m.name
const spanOf = (m: Manager) => `${m.seasonCount} season${m.seasonCount === 1 ? '' : 's'} · ${m.firstYear}–${m.lastYear}`

/* ------------------------------------------------------- 1. overall win % */

function WinPct() {
  const [min, setMin] = useState(DEFAULT_MIN_SEASONS)
  const rows: Row[] = qualified(min)
    .slice()
    .sort((a, b) => b.winPct - a.winPct || b.games - a.games)
    .map((m) => ({
      id: m.id, managerId: m.id, label: nameOf(m),
      sublabel: `${fmtRecord(m)} · ${spanOf(m)}`,
      value: m.winPct, display: fmtPct(m.winPct), bar: m.winPct,
    }))
  return (
    <>
      <Toolbar><MinSeasons value={min} onChange={setMin} /></Toolbar>
      <Leaderboard rows={rows} accent="var(--color-s1)" />
    </>
  )
}

/* ------------------------------------------- 2. playoff performance index */

/** A single playoff run makes this stat meaningless — one lucky bracket reads as +5.00. */
export const MIN_PLAYOFF_RUNS = 3

function PlayoffPerf() {
  const [minRuns, setMinRuns] = useState(MIN_PLAYOFF_RUNS)
  const rows: Row[] = managers
    .filter((m) => m.seedVsFinish !== null && m.seedVsFinishSeasons >= minRuns)
    .slice()
    .sort((a, b) => (b.seedVsFinish ?? 0) - (a.seedVsFinish ?? 0))
    .map((m) => ({
      id: m.id, managerId: m.id, label: nameOf(m),
      sublabel: `${m.seedVsFinishSeasons} playoff run${m.seedVsFinishSeasons === 1 ? '' : 's'} · ${m.championships} title${m.championships === 1 ? '' : 's'}`,
      value: m.seedVsFinish as number, display: fmtSigned(m.seedVsFinish as number), bar: 0,
    }))
  const scale = maxOf(rows.map((r) => Math.abs(r.value))) || 1
  rows.forEach((r) => { r.bar = r.value / scale })

  return (
    <>
      <Toolbar>
        <label className="flex items-center gap-2 text-xs text-muted">
          <span>Minimum playoff runs</span>
          <select
            value={minRuns}
            onChange={(e) => setMinRuns(Number(e.target.value))}
            className="rounded-md border border-hair bg-raised px-2 py-1 text-xs text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-gold"
          >
            {[1, 2, 3, 5].map((n) => (
              <option key={n} value={n}>{n === 1 ? 'All' : `${n}+`}</option>
            ))}
          </select>
        </label>
      </Toolbar>
      <p className="mb-4 text-xs text-muted">
        Positive means they finished <em>better</em> than they were seeded. Managers with one
        lucky bracket are filtered out by default — a single run is noise, not a trend.
      </p>
      <Leaderboard rows={rows} diverging emptyNote="No manager has that many playoff runs." />
    </>
  )
}

/* ------------------------------------------------- 3. average placement */

function AvgPlacement() {
  const [min, setMin] = useState(DEFAULT_MIN_SEASONS)
  const [adjusted, setAdjusted] = useState(true)
  const pool = qualified(min).slice()
  pool.sort((a, b) => (adjusted ? b.avgFinishPct - a.avgFinishPct : a.avgFinish - b.avgFinish))
  const rows: Row[] = pool.map((m) => ({
    id: m.id, managerId: m.id, label: nameOf(m),
    sublabel: `${spanOf(m)} · best finish ${ordinal(m.bestFinish ?? 0)}`,
    value: m.avgFinish,
    display: m.avgFinish.toFixed(2),
    meta: `top ${Math.round(m.avgFinishPct * 100)}%`,
    bar: m.avgFinishPct,
  }))
  return (
    <>
      <Toolbar>
        <MinSeasons value={min} onChange={setMin} />
        <label className="flex items-center gap-2 text-xs text-muted">
          <input
            type="checkbox"
            checked={adjusted}
            onChange={(e) => setAdjusted(e.target.checked)}
            className="h-3.5 w-3.5 accent-[var(--color-gold)]"
          />
          <span>Rank adjusted for league size</span>
        </label>
      </Toolbar>
      <Leaderboard rows={rows} accent="var(--color-s3)" />
    </>
  )
}

/* --------------------------------------------- 4. playoff appearances */

function PlayoffAppearances() {
  const [min, setMin] = useState(1)
  const pool = qualified(min).slice().sort((a, b) => b.playoffAppearances - a.playoffAppearances || b.playoffRate - a.playoffRate)
  const scale = maxOf(pool.map((m) => m.playoffAppearances)) || 1
  const rows: Row[] = pool.map((m) => ({
    id: m.id, managerId: m.id, label: nameOf(m),
    sublabel: `${m.playoffAppearances} of ${m.seasonCount} season${m.seasonCount === 1 ? '' : 's'}`,
    value: m.playoffAppearances,
    display: String(m.playoffAppearances),
    meta: `${Math.round(m.playoffRate * 100)}% rate`,
    bar: m.playoffAppearances / scale,
  }))
  return (
    <>
      <Toolbar><MinSeasons value={min} onChange={setMin} /></Toolbar>
      <Leaderboard rows={rows} accent="var(--color-s3)" />
    </>
  )
}

/* ------------------------------------ 5. championships vs finals appearances */

const PODIUM = [
  { key: 'first', label: '1st — champion', color: 'var(--color-s4)' },
  { key: 'second', label: '2nd — lost the final', color: 'var(--color-s1)' },
  { key: 'third', label: '3rd', color: 'var(--color-s3)' },
] as const

function Championships() {
  const pool = managers
    .filter((m) => m.podiums > 0)
    .slice()
    .sort(
      (a, b) =>
        b.championships - a.championships ||
        b.runnerUps - a.runnerUps ||
        b.thirdPlace - a.thirdPlace ||
        a.avgFinish - b.avgFinish,
    )
  const scale = maxOf(pool.map((m) => m.podiums)) || 1

  return (
    <>
      {/* Three series, so a legend is always present. Green and gold sit close under
          tritanopia, so every segment also carries its own count — colour never
          works alone here. */}
      <div className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-ink-2">
        {PODIUM.map((p) => (
          <span key={p.key} className="flex items-center gap-2">
            <span className="h-2.5 w-4 rounded-[2px]" style={{ background: p.color }} />
            {p.label}
          </span>
        ))}
      </div>

      <ol className="divide-y divide-hair overflow-hidden rounded-xl border border-hair bg-surface">
        {pool.map((m, i) => {
          const delay = `${Math.min(i * 30, 480)}ms`
          const counts = [m.championships, m.runnerUps, m.thirdPlace]
          return (
            <li key={m.id} className="rise px-3 py-3 sm:px-4" style={{ animationDelay: delay }}>
              <div className="flex items-center gap-3 sm:gap-4">
                <span className="tnum w-6 shrink-0 text-right text-xs font-semibold text-muted sm:w-7 sm:text-sm">{i + 1}</span>
                <div className="min-w-0 flex-1">
                  <Link to={`/manager/${m.id}`} className="block truncate text-sm font-semibold text-ink hover:text-gold hover:underline sm:text-[0.95rem]">
                    {nameOf(m)}
                  </Link>
                  <div className="truncate text-xs text-muted">
                    {m.titleYears.length ? `Won ${m.titleYears.join(', ')}` : 'No titles'}
                  </div>
                </div>
                {/* Per-place counts in ink tokens, with a colour chip carrying identity. */}
                <div className="flex shrink-0 items-center gap-2 sm:gap-3">
                  {PODIUM.map((p, n) => (
                    <span key={p.key} className="flex items-center gap-1" title={p.label}>
                      <span className="h-2 w-2 rounded-full" style={{ background: p.color, opacity: counts[n] ? 1 : 0.25 }} />
                      <span className={`tnum text-sm font-bold sm:text-base ${counts[n] ? 'text-ink' : 'text-muted'}`}>{counts[n]}</span>
                    </span>
                  ))}
                </div>
              </div>
              {/* 2px surface gaps keep adjacent fills readable without relying on hue. */}
              <div className="mt-2 flex h-2 gap-[2px] pl-9 sm:pl-11">
                {PODIUM.map((p, n) =>
                  counts[n] > 0 ? (
                    <div
                      key={p.key}
                      className="bar-grow rounded-[3px]"
                      style={{ width: `${(counts[n] / scale) * 100}%`, background: p.color, animationDelay: delay }}
                    />
                  ) : null,
                )}
              </div>
            </li>
          )
        })}
      </ol>
    </>
  )
}

/* ------------------------------------------------------- 6-8. record books */

function RecordNote() {
  return (
    <p className="mb-4 rounded-lg border border-hair bg-raised/60 px-3 py-2 text-xs text-muted">
      ESPN's Hall of Fame stores one record per season, so this is each season's best —
      a manager's second-best year never appears, even if it would rank here.
    </p>
  )
}

function WeekPoints() {
  const recs = league.records.week
  const scale = maxOf(recs.map((r) => r.points)) || 1
  const rows: Row[] = recs.map((r) => ({
    id: `${r.year}-${r.team}`, managerId: r.managerId, label: r.managerName,
    sublabel: `${r.year} · Week ${r.week}${r.managerName !== r.team ? ` · as "${r.team}"` : ''}`,
    value: r.points, display: fmtPoints(r.points), bar: r.points / scale,
  }))
  return (<><RecordNote /><Leaderboard rows={rows} accent="var(--color-s2)" /></>)
}

function SeasonPoints() {
  const recs = league.records.season
  const scale = maxOf(recs.map((r) => r.points)) || 1
  const rows: Row[] = recs.map((r) => ({
    id: `${r.year}-${r.team}`, managerId: r.managerId, label: r.managerName,
    sublabel: `${r.year} season${r.managerName !== r.team ? ` · as "${r.team}"` : ''}`,
    value: r.points, display: fmtPoints(r.points), bar: r.points / scale,
  }))
  return (<><RecordNote /><Leaderboard rows={rows} accent="var(--color-s2)" /></>)
}

function PlayerPoints() {
  const recs = league.records.player
  const scale = maxOf(recs.map((r) => r.points)) || 1
  const rows: Row[] = recs.map((r) => ({
    id: `${r.year}-${r.player}`, managerId: r.managerId, label: `${r.player} · ${r.position}`,
    sublabel: `${r.nflTeam} · ${r.year} Week ${r.week} · started by ${r.managerName}`,
    value: r.points, display: fmtPoints(r.points), bar: r.points / scale,
  }))
  return (<><RecordNote /><Leaderboard rows={rows} accent="var(--color-s4)" /></>)
}

/* ------------------------------------------------------------ definitions */

const topManager = (pick: (m: Manager) => number, filter: (m: Manager) => boolean = () => true) => {
  const sorted = managers.filter(filter).slice().sort((a, b) => pick(b) - pick(a))
  return sorted[0]
}

const bestWinPct = topManager((m) => m.winPct, (m) => m.seasonCount >= DEFAULT_MIN_SEASONS)
// Same threshold the block itself uses, so the card never headlines a one-run fluke.
const bestPerf = topManager((m) => m.seedVsFinish ?? -99, (m) => m.seedVsFinishSeasons >= MIN_PLAYOFF_RUNS)
const bestPlace = topManager((m) => m.avgFinishPct, (m) => m.seasonCount >= DEFAULT_MIN_SEASONS)
const mostPlayoffs = topManager((m) => m.playoffAppearances)
const mostTitles = topManager((m) => m.championships)
const wk = league.records.week[0]
const ssn = league.records.season[0]
const plr = league.records.player[0]

export const STATS: StatDef[] = [
  {
    slug: 'win-percentage',
    title: 'Overall Win Percentage',
    blurb: 'Career regular-season winning percentage, all seasons combined.',
    accent: 'var(--color-s1)',
    glyph: '📊',
    method:
      'Wins plus half a tie, divided by games played, across every regular season a manager has played. Playoff games are not included — the source data records only regular-season results. Defaults to managers with at least three seasons so a single hot year cannot top the list.',
    preview: { value: fmtPct(bestWinPct.winPct), leader: bestWinPct.name },
    Body: WinPct,
  },
  {
    slug: 'playoff-performance',
    title: 'Playoff Performance',
    blurb: 'Do they outrun their seed once the bracket starts?',
    accent: 'var(--color-s1)',
    glyph: '🎯',
    method:
      'Regular-season seed minus final placement, averaged over the seasons a manager made the playoffs. A 4-seed that finishes 2nd scores +2. Seeds are recomputed from W-L-T because the source rank column is corrupt; where records tie, teams share a seed, since no per-team points-for exists to break it. Defaults to three or more playoff runs — with one run this measures luck, not skill.',
    preview: { value: fmtSigned(bestPerf.seedVsFinish ?? 0), leader: bestPerf.name },
    Body: PlayoffPerf,
  },
  {
    slug: 'average-placement',
    title: 'Average Finish',
    blurb: 'Where they land at the end of the year, on average.',
    accent: 'var(--color-s3)',
    glyph: '🪜',
    method:
      'The mean of every end-of-season placement. The league ran 6 teams in 2012 and 14 in 2015, so finishing 6th has meant very different things — the adjusted ranking converts each finish to a percentile of that season\'s field before averaging. Untick the box to sort by the raw average instead.',
    preview: { value: bestPlace.avgFinish.toFixed(2), leader: bestPlace.name },
    Body: AvgPlacement,
  },
  {
    slug: 'playoff-appearances',
    title: 'Playoff Appearances',
    blurb: 'How many times they made the bracket.',
    accent: 'var(--color-s3)',
    glyph: '🎟️',
    method:
      'A season counts as a playoff appearance when the final placement is inside that year\'s bracket. The bracket was the top 4 in 2012, top 6 in 2013, top 8 from 2014 to 2017, and top 6 from 2018 on.',
    preview: { value: String(mostPlayoffs.playoffAppearances), leader: mostPlayoffs.name },
    Body: PlayoffAppearances,
  },
  {
    slug: 'championships',
    title: 'Championships',
    blurb: 'Every podium finish — firsts, seconds and thirds.',
    accent: 'var(--color-s4)',
    glyph: '🏆',
    method:
      'Counts of first-, second- and third-place finishes, shown side by side so a manager who kept reaching the final without winning reads differently from one who converted. Ranked by championships, then runner-ups, then thirds. Only managers with at least one podium finish appear.',
    preview: { value: String(mostTitles.championships), leader: mostTitles.name },
    Body: Championships,
  },
  {
    slug: 'week-points',
    title: 'Most Points — Week',
    blurb: 'The biggest single week in league history.',
    accent: 'var(--color-s2)',
    glyph: '⚡',
    method:
      'Each season\'s highest-scoring team week, taken from ESPN\'s Hall of Fame record book and ranked all-time. Because ESPN stores only one record per season, a manager\'s second-best week is not in this list.',
    preview: { value: fmtPoints(wk.points), leader: `${wk.managerName}, ${wk.year}` },
    Body: WeekPoints,
  },
  {
    slug: 'season-points',
    title: 'Most Points — Season',
    blurb: 'The biggest full-season point total.',
    accent: 'var(--color-s2)',
    glyph: '🔥',
    method:
      'Each season\'s highest total points-for, ranked all-time. Seasons before 2021 played fewer games, so older totals are working with less runway.',
    preview: { value: fmtPoints(ssn.points), leader: `${ssn.managerName}, ${ssn.year}` },
    Body: SeasonPoints,
  },
  {
    slug: 'player-points',
    title: 'Most Player Points',
    blurb: 'The best single game any player gave anyone.',
    accent: 'var(--color-s4)',
    glyph: '🌟',
    method:
      'The highest-scoring individual player week of each season, with the manager who had them in the lineup. Scoring settings have changed over 14 years, so totals are not perfectly comparable across eras.',
    preview: { value: fmtPoints(plr.points), leader: `${plr.player}, ${plr.year}` },
    Body: PlayerPoints,
  },
]

export const statBySlug = new Map(STATS.map((s) => [s.slug, s]))
