import { useEffect, useMemo, useState } from 'react'

const TEAMS = [
  'ari', 'atl', 'bal', 'buf', 'car', 'chi', 'cin', 'cle', 'dal', 'den', 'det', 'gb',
  'hou', 'ind', 'jax', 'kc', 'lac', 'lar', 'lv', 'mia', 'min', 'ne', 'no', 'nyg',
  'nyj', 'phi', 'pit', 'sea', 'sf', 'tb', 'ten', 'wsh',
]

const BASE = import.meta.env.BASE_URL

/** Round for CSS: cos(PI/2) is 6.1e-17, and calc() cannot parse exponent notation. */
const cssNum = (n: number) => Number(n.toFixed(4)).toString()

/** Deterministic scatter, so the intro looks identical on every visit. */
function scatter(i: number) {
  const frac = (x: number) => x - Math.floor(x)
  const a = frac(Math.sin(i * 12.9898) * 43758.5453)
  const b = frac(Math.sin(i * 78.233) * 23421.631)
  const angle = a * Math.PI * 2
  const dist = 900 + b * 700
  return { sx: Math.round(Math.cos(angle) * dist), sy: Math.round(Math.sin(angle) * dist), spin: Math.round((a - 0.5) * 720) }
}

type Chip = { abbr: string; tx: string; ty: string; sx: number; sy: number; spin: number; delay: number; inner: boolean }

export default function Intro({ onDone }: { onDone: () => void }) {
  const [leaving, setLeaving] = useState(false)

  // Two concentric rings: 32 logos on one circle either overlap on a phone or
  // push the wordmark off-centre.
  const chips = useMemo<Chip[]>(() => {
    const place = (list: string[], inner: boolean, offset: number, delayBase: number): Chip[] =>
      list.map((abbr, i) => {
        const angle = (i / list.length) * Math.PI * 2 + offset
        const { sx, sy, spin } = scatter(i + (inner ? 0 : 50))
        return {
          abbr,
          tx: cssNum(Math.cos(angle)),
          ty: cssNum(Math.sin(angle)),
          sx, sy, spin,
          delay: delayBase + i * 26,
          inner,
        }
      })
    return [
      ...place(TEAMS.slice(0, 14), true, -Math.PI / 2, 0),
      ...place(TEAMS.slice(14), false, -Math.PI / 2 + Math.PI / 18, 360),
    ]
  }, [])

  const dismiss = () => {
    if (leaving) return
    setLeaving(true)
    setTimeout(onDone, 420)
  }

  // Auto-advance once the show has played, but never trap anyone here.
  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const timer = setTimeout(dismiss, reduced ? 800 : 5400)
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'Escape') dismiss()
    }
    window.addEventListener('keydown', onKey)
    return () => { clearTimeout(timer); window.removeEventListener('keydown', onKey) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div
      onClick={dismiss}
      className={`fixed inset-0 z-50 cursor-pointer overflow-hidden bg-plane transition-opacity duration-[420ms] ${
        leaving ? 'pointer-events-none opacity-0' : 'opacity-100'
      }`}
    >
      <div
        className="pointer-events-none absolute inset-0"
        style={{ background: 'radial-gradient(ellipse 70% 55% at 50% 45%, rgba(212,164,55,0.16), transparent 70%)' }}
      />
      <div className="field-lines pointer-events-none absolute inset-0 opacity-60" />

      {/* Zero-size anchor at centre; each chip is a 0x0 wrapper carrying the fly-in
          transform, with the image itself centred on that point. Rings are ellipses —
          wider than tall — so they frame the wordmark instead of landing on it. */}
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-0 w-0">
        {chips.map((c) => {
          // Radii stay under 47vw / 44vh so a logo's own half-width never crosses the
          // viewport edge — at 50vh the outer ring clipped top and bottom on every screen.
          const rx = c.inner ? 'clamp(120px, 44vw, 620px)' : 'clamp(160px, 46vw, 780px)'
          const ry = c.inner ? 'clamp(140px, 38vh, 340px)' : 'clamp(175px, 43vh, 450px)'
          return (
            <div
              key={c.abbr}
              className="logo-chip absolute h-0 w-0"
              style={{
                ['--tx' as string]: `calc(${c.tx} * ${rx})`,
                ['--ty' as string]: `calc(${c.ty} * ${ry})`,
                ['--sx' as string]: `${c.sx}px`,
                ['--sy' as string]: `${c.sy}px`,
                ['--spin' as string]: `${c.spin}deg`,
                ['--delay' as string]: `${c.delay}ms`,
              }}
            >
              <div className="logo-float absolute h-0 w-0" style={{ animationDelay: `${c.delay + 1400}ms` }}>
                <img
                  src={`${BASE}logos/${c.abbr}.png`}
                  alt=""
                  aria-hidden
                  width={56}
                  height={56}
                  // max-w-none is load-bearing: preflight's `img{max-width:100%}` would
                  // resolve against this 0-width wrapper and collapse every logo to 0px.
                  className="absolute max-w-none -translate-x-1/2 -translate-y-1/2 drop-shadow-[0_2px_10px_rgba(0,0,0,0.75)]"
                  style={{
                    width: c.inner ? 'clamp(26px, 5vmin, 46px)' : 'clamp(22px, 4.2vmin, 38px)',
                    height: 'auto',
                  }}
                />
              </div>
            </div>
          )
        })}
      </div>

      {/* Vignette sits above the logos and below the type, so anything drifting near
          the centre falls away instead of competing with the wordmark. */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 42% 40% at 50% 50%, #0b0b0d 0%, rgba(11,11,13,0.94) 42%, rgba(11,11,13,0.55) 66%, transparent 82%)',
        }}
      />

      <div className="relative flex h-full flex-col items-center justify-center px-6 text-center">
        <p className="title-in text-[0.7rem] font-semibold uppercase tracking-[0.5em] text-muted sm:text-xs" style={{ animationDelay: '760ms' }}>
          Est. 2012
        </p>
        <h1 className="title-in gold-text mt-3 text-[clamp(1.9rem,7.2vw,4.4rem)] font-black uppercase leading-[1.05]" style={{ animationDelay: '880ms' }}>
          The Rookie League
        </h1>
        <p className="title-in mt-4 max-w-md text-sm text-ink-2 sm:text-base" style={{ animationDelay: '1140ms' }}>
          Fourteen seasons of glory, collapse, and questionable roster decisions.
        </p>
        <button
          onClick={(e) => { e.stopPropagation(); dismiss() }}
          className="title-in mt-9 rounded-full border border-gold/40 bg-gold/10 px-7 py-2.5 text-sm font-semibold tracking-wide text-gold transition hover:bg-gold/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-gold"
          style={{ animationDelay: '1380ms' }}
        >
          Enter the League
        </button>
      </div>

      <button
        onClick={(e) => { e.stopPropagation(); dismiss() }}
        className="absolute bottom-5 right-5 rounded-full px-4 py-2 text-xs font-medium text-muted transition hover:text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-gold"
      >
        Skip →
      </button>
    </div>
  )
}
