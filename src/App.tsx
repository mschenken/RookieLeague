import { useEffect, useState } from 'react'
import { Link, Route, Routes, useLocation } from 'react-router-dom'
import Intro from './components/Intro'
import Dashboard from './pages/Dashboard'
import StatPage from './pages/StatPage'
import ManagerPage from './pages/ManagerPage'
import NotFound from './pages/NotFound'

const SEEN_KEY = 'rl-intro-seen'

function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => { window.scrollTo(0, 0) }, [pathname])
  return null
}

function Header() {
  return (
    <header className="sticky top-0 z-30 border-b border-hair bg-plane/85 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
        <Link to="/" className="group flex items-baseline gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-gold">
          <span className="text-sm font-black uppercase tracking-[0.14em] text-gold sm:text-base">The Rookie League</span>
          <span className="hidden text-[0.65rem] uppercase tracking-[0.2em] text-muted sm:inline">Est. 2012</span>
        </Link>
        <Link to="/" className="text-xs text-muted transition hover:text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-gold">
          All stats
        </Link>
      </div>
    </header>
  )
}

export default function App() {
  const [showIntro, setShowIntro] = useState(() => {
    try { return sessionStorage.getItem(SEEN_KEY) !== '1' } catch { return true }
  })

  const finishIntro = () => {
    try { sessionStorage.setItem(SEEN_KEY, '1') } catch { /* private mode — just move on */ }
    setShowIntro(false)
  }

  return (
    <>
      {showIntro && <Intro onDone={finishIntro} />}
      <ScrollToTop />
      <div className="field-lines min-h-screen">
        <Header />
        {/* Wide enough for the dashboard's data + gallery pair; the inner pages cap
            themselves narrower so leaderboard rows do not stretch out. */}
        <main className="mx-auto max-w-6xl px-4 pb-20 pt-6 sm:px-6 sm:pt-10">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/stats/:slug" element={<StatPage />} />
            <Route path="/manager/:id" element={<ManagerPage />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </main>
        <footer className="border-t border-hair px-4 py-6 text-center text-xs text-muted sm:px-6">
          Fourteen seasons, 2012–2025. Built from the league record book.
        </footer>
      </div>
    </>
  )
}
