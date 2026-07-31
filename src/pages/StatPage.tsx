import { Link, useParams } from 'react-router-dom'
import { statBySlug } from '../stats/definitions'
import NotFound from './NotFound'

export default function StatPage() {
  const { slug } = useParams()
  const stat = slug ? statBySlug.get(slug) : undefined
  if (!stat) return <NotFound />

  const { Body } = stat

  return (
    <div>
      <Link to="/" className="text-xs text-muted transition hover:text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-gold">
        ← All stats
      </Link>

      <div className="rise mt-3">
        <div className="flex items-center gap-2.5">
          <span aria-hidden className="text-xl">{stat.glyph}</span>
          <h1 className="text-xl font-black uppercase tracking-tight text-ink sm:text-2xl">{stat.title}</h1>
        </div>
        <p className="mt-2 max-w-2xl text-sm text-ink-2">{stat.blurb}</p>
      </div>

      <div className="mt-7">
        <Body />
      </div>

      <details className="mt-6 rounded-xl border border-hair bg-surface px-4 py-3">
        <summary className="cursor-pointer text-xs font-semibold text-ink-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-gold">
          How this is calculated
        </summary>
        <p className="mt-2 text-xs leading-relaxed text-muted">{stat.method}</p>
      </details>
    </div>
  )
}
