import { Link } from 'react-router-dom'
import { STATS } from '../stats/definitions'
import { league, managers, managersUnnamed, unmappedTeams } from '../lib/league'

function Snapshot() {
  const titles = league.podium.filter((p) => p.place === 1).length
  const items = [
    { label: 'Seasons', value: String(league.years.length) },
    { label: 'Teams all-time', value: String(managers.length) },
    { label: 'Titles awarded', value: String(titles) },
    { label: 'Games played', value: String(managers.reduce((s, m) => s + m.games, 0) / 2) },
  ]
  return (
    <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-hair bg-hair sm:grid-cols-4">
      {items.map((i) => (
        <div key={i.label} className="bg-surface px-4 py-3">
          <dt className="text-[0.65rem] uppercase tracking-[0.14em] text-muted">{i.label}</dt>
          <dd className="tnum mt-0.5 text-xl font-bold text-ink">{i.value}</dd>
        </div>
      ))}
    </dl>
  )
}

export default function Dashboard() {
  return (
    <div>
      <div className="rise">
        <h1 className="text-2xl font-black uppercase tracking-tight text-ink sm:text-3xl">The Record Book</h1>
        <p className="mt-2 max-w-2xl text-sm text-ink-2 sm:text-base">
          Every season since 2012, sorted eight different ways. Pick your poison.
        </p>
      </div>

      <div className="rise mt-6" style={{ animationDelay: '60ms' }}>
        <Snapshot />
      </div>

      {managersUnnamed && (
        <div className="rise mt-6 rounded-xl border border-gold/30 bg-gold/5 px-4 py-3 text-xs text-ink-2" style={{ animationDelay: '90ms' }}>
          <strong className="font-semibold text-gold">Heads up:</strong> {unmappedTeams} team
          {unmappedTeams === 1 ? ' is' : 's are'} still listed under the team name rather than the manager.
          Because several people renamed their team over the years, one manager can show up as several
          entries until the <code className="rounded bg-raised px-1 py-0.5">manager</code> column in{' '}
          <code className="rounded bg-raised px-1 py-0.5">data/managers.csv</code> is filled in.
        </div>
      )}

      <div className="mt-8 grid gap-3 sm:grid-cols-2 sm:gap-4">
        {STATS.map((s, i) => (
          <Link
            key={s.slug}
            to={`/stats/${s.slug}`}
            className="rise group relative overflow-hidden rounded-xl border border-hair bg-surface p-4 transition hover:border-gold/40 hover:bg-raised focus:outline-none focus-visible:ring-2 focus-visible:ring-gold sm:p-5"
            style={{ animationDelay: `${120 + i * 45}ms` }}
          >
            {/* accent wash keyed to the block's series colour */}
            <div
              className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full opacity-[0.13] blur-2xl transition-opacity group-hover:opacity-25"
              style={{ background: s.accent }}
            />
            <div className="relative flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span aria-hidden className="text-base">{s.glyph}</span>
                  <h2 className="truncate text-sm font-bold text-ink sm:text-base">{s.title}</h2>
                </div>
                <p className="mt-1.5 text-xs leading-relaxed text-muted">{s.blurb}</p>
              </div>
            </div>
            <div className="relative mt-4 flex items-end justify-between gap-3 border-t border-hair pt-3">
              <div className="min-w-0">
                <div className="text-[0.6rem] uppercase tracking-[0.16em] text-muted">Leader</div>
                <div className="truncate text-xs font-medium text-ink-2">{s.preview.leader}</div>
              </div>
              <div className="tnum shrink-0 text-xl font-black text-ink sm:text-2xl">{s.preview.value}</div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
