import { Link, useParams } from 'react-router-dom'
import { akaFor, fmtPct, fmtRecord, managerById, ordinal } from '../lib/league'
import NotFound from './NotFound'

function Stat({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="bg-surface px-4 py-3">
      <dt className="text-[0.65rem] uppercase tracking-[0.14em] text-muted">{label}</dt>
      <dd className="tnum mt-0.5 text-xl font-bold text-ink">{value}</dd>
      {note && <div className="mt-0.5 text-[0.7rem] text-muted">{note}</div>}
    </div>
  )
}

export default function ManagerPage() {
  const { id } = useParams()
  const m = id ? managerById.get(id) : undefined
  if (!m) return <NotFound />

  const aka = akaFor(m)

  return (
    <div>
      <Link to="/" className="text-xs text-muted transition hover:text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-gold">
        ← All stats
      </Link>

      <div className="rise mt-3">
        <h1 className="text-xl font-black uppercase tracking-tight text-ink sm:text-2xl">{m.name}</h1>
        <p className="mt-1 text-xs text-muted">
          {m.seasonCount} season{m.seasonCount === 1 ? '' : 's'} · {m.firstYear}–{m.lastYear}
          {m.titleYears.length > 0 && ` · 🏆 ${m.titleYears.join(', ')}`}
        </p>
        {aka.length > 0 && (
          <p className="mt-1 max-w-3xl text-xs leading-relaxed text-muted">
            {aka.length === 1 ? 'Played as ' : `Played as ${aka.length} teams: `}
            {aka.map((a) => `"${a}"`).join(', ')}
          </p>
        )}
      </div>

      <dl className="rise mt-5 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-hair bg-hair sm:grid-cols-4">
        <Stat label="Record" value={fmtRecord(m)} note={`${fmtPct(m.winPct)} win pct`} />
        <Stat label="Titles" value={`${m.championships}/${m.finalsAppearances}`} note="won / finals reached" />
        <Stat label="Playoffs" value={`${m.playoffAppearances}`} note={`${Math.round(m.playoffRate * 100)}% of seasons`} />
        <Stat label="Avg finish" value={m.avgFinish.toFixed(2)} note={m.bestFinish ? `best ${ordinal(m.bestFinish)}` : undefined} />
      </dl>

      <h2 className="mt-8 text-sm font-bold uppercase tracking-[0.12em] text-ink-2">Season by season</h2>
      <div className="mt-3 overflow-x-auto rounded-xl border border-hair bg-surface">
        <table className="w-full min-w-[34rem] text-sm">
          <thead>
            <tr className="border-b border-hair text-left text-[0.65rem] uppercase tracking-[0.12em] text-muted">
              <th className="px-3 py-2 font-medium sm:px-4">Year</th>
              <th className="px-3 py-2 font-medium sm:px-4">Team</th>
              <th className="px-3 py-2 font-medium sm:px-4">Record</th>
              <th className="px-3 py-2 font-medium sm:px-4">Seed</th>
              <th className="px-3 py-2 font-medium sm:px-4">Finish</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-hair">
            {m.seasons.map((s) => (
              <tr key={s.year} className="transition hover:bg-raised">
                <td className="tnum px-3 py-2 font-semibold text-ink sm:px-4">{s.year}</td>
                <td className="px-3 py-2 text-ink-2 sm:px-4">{s.team}</td>
                <td className="tnum px-3 py-2 text-ink-2 sm:px-4">{fmtRecord(s)}</td>
                <td className="tnum px-3 py-2 text-ink-2 sm:px-4">
                  {s.seed}
                  {s.seedShared && <span className="text-muted" title="tied on record; no points-for available to break it">*</span>}
                </td>
                <td className="tnum px-3 py-2 sm:px-4">
                  <span className={s.finalRank === 1 ? 'font-bold text-gold' : 'text-ink-2'}>{ordinal(s.finalRank)}</span>
                  <span className="text-muted"> of {s.teamCount}</span>
                  {s.madePlayoffs && <span className="ml-2 rounded bg-raised px-1.5 py-0.5 text-[0.6rem] uppercase tracking-wide text-muted">playoffs</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-[0.7rem] text-muted">* Seed shared with another team on an identical record.</p>
    </div>
  )
}
