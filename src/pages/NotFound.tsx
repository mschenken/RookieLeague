import { Link } from 'react-router-dom'

export default function NotFound() {
  return (
    <div className="py-16 text-center">
      <p className="text-4xl">🏈</p>
      <h1 className="mt-4 text-lg font-bold text-ink">Fourth and long.</h1>
      <p className="mt-1 text-sm text-muted">That page is not in the record book.</p>
      <Link
        to="/"
        className="mt-6 inline-block rounded-full border border-gold/40 bg-gold/10 px-5 py-2 text-sm font-semibold text-gold transition hover:bg-gold/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-gold"
      >
        Back to the stats
      </Link>
    </div>
  )
}
