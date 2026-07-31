import { Link } from 'react-router-dom'

export type Row = {
  id: string
  managerId?: string
  label: string
  sublabel?: string
  value: number
  display: string
  /** 0..1 magnitude driving bar width (or -1..1 when diverging). */
  bar: number
  meta?: string
}

/**
 * Ranked horizontal bars. Single series, so no legend — the heading names the
 * measure. Values are direct-labelled in ink tokens, never in the series colour,
 * and the bar carries magnitude alone.
 */
export default function Leaderboard({
  rows,
  accent = 'var(--color-s1)',
  diverging = false,
  emptyNote,
}: {
  rows: Row[]
  accent?: string
  diverging?: boolean
  emptyNote?: string
}) {
  if (!rows.length) {
    return <p className="rounded-xl border border-hair bg-surface p-8 text-center text-sm text-muted">{emptyNote ?? 'No rows.'}</p>
  }

  return (
    <ol className="divide-y divide-hair overflow-hidden rounded-xl border border-hair bg-surface">
      {rows.map((r, i) => {
        const pos = r.bar >= 0
        const delay = `${Math.min(i * 26, 520)}ms`
        const name = r.managerId ? (
          <Link to={`/manager/${r.managerId}`} className="hover:text-gold hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-gold">
            {r.label}
          </Link>
        ) : (
          r.label
        )

        return (
          <li key={r.id} className="rise group relative" style={{ animationDelay: delay }}>
            {/* Single-series bars sit behind the row; a diverging bar gets its own plot
                column instead, because half of it would otherwise run under the label. */}
            {!diverging && (
              <div className="pointer-events-none absolute inset-0 overflow-hidden">
                <div
                  className="bar-grow absolute inset-y-[6px] left-0 rounded-[4px] opacity-[0.22] transition-opacity group-hover:opacity-[0.34]"
                  style={{ width: `${Math.max(r.bar, 0.012) * 100}%`, background: accent, animationDelay: delay }}
                />
              </div>
            )}

            <div className="relative flex items-center gap-3 px-3 py-2.5 sm:gap-4 sm:px-4">
              <span className="tnum w-6 shrink-0 text-right text-xs font-semibold text-muted sm:w-7 sm:text-sm">{i + 1}</span>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold text-ink sm:text-[0.95rem]">{name}</div>
                {r.sublabel && <div className="truncate text-xs text-muted">{r.sublabel}</div>}
              </div>

              {diverging && (
                <div className="relative h-6 w-[30%] shrink-0 sm:w-[34%]">
                  <div className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-baseline" />
                  <div
                    className="bar-grow absolute inset-y-1 rounded-[3px]"
                    style={{
                      width: `${Math.max(Math.abs(r.bar), 0.008) * 50}%`,
                      background: pos ? 'var(--color-s1)' : 'var(--color-s2)',
                      left: pos ? '50%' : undefined,
                      right: pos ? undefined : '50%',
                      transformOrigin: pos ? 'left center' : 'right center',
                      animationDelay: delay,
                    }}
                  />
                </div>
              )}

              {r.meta && <span className="hidden shrink-0 text-xs text-muted sm:block">{r.meta}</span>}
              <span className="tnum w-16 shrink-0 text-right text-sm font-bold text-ink sm:w-20 sm:text-base">{r.display}</span>
            </div>
          </li>
        )
      })}
    </ol>
  )
}
