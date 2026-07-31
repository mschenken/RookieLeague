import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import manifest from '../data/gallery.json'

const BASE = import.meta.env.BASE_URL
const HOLD = 4200

type Shot = { src: string; width: number; height: number; animated: boolean }
const IMAGES = (manifest as { images: Shot[] }).images

/**
 * Looping photo gallery. Cross-fades through the league's own pictures.
 *
 * Auto-advance pauses on hover/focus and is off entirely under reduced-motion —
 * content that moves on its own is exactly what that preference is asking about —
 * so the arrows and dots are the real controls, not decoration.
 */
export default function Gallery() {
  const [i, setI] = useState(0)
  const [paused, setPaused] = useState(false)
  const reduced = useMemo(
    () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    [],
  )
  const timer = useRef<number | undefined>(undefined)

  const go = useCallback((n: number) => setI(((n % IMAGES.length) + IMAGES.length) % IMAGES.length), [])

  useEffect(() => {
    if (paused || reduced || IMAGES.length < 2) return
    timer.current = window.setTimeout(() => go(i + 1), HOLD)
    return () => window.clearTimeout(timer.current)
  }, [i, paused, reduced, go])

  // Warm the next image so the cross-fade never lands on an empty frame.
  useEffect(() => {
    if (IMAGES.length < 2) return
    const next = new Image()
    next.src = BASE + IMAGES[(i + 1) % IMAGES.length].src
  }, [i])

  if (!IMAGES.length) return null

  return (
    <section
      aria-label="League photos"
      className="group overflow-hidden rounded-xl border border-hair bg-surface"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
    >
      <div className="flex items-center justify-between border-b border-hair px-3 py-2">
        <h2 className="text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-muted">The Archive</h2>
        <span className="tnum text-[0.65rem] text-muted">
          {i + 1} / {IMAGES.length}
        </span>
      </div>

      {/* Fixed 3:4 stage. Photos vary from portrait phone shots to landscape group
          pictures, so they are contained rather than cropped — cropping a team photo
          cuts people out of it. */}
      <div className="relative aspect-[3/4] w-full bg-plane">
        {IMAGES.map((img, n) => (
          <img
            key={img.src}
            src={BASE + img.src}
            alt=""
            width={img.width}
            height={img.height}
            loading={n === 0 ? 'eager' : 'lazy'}
            decoding="async"
            aria-hidden={n !== i}
            className="absolute inset-0 h-full w-full object-contain transition-opacity duration-700 ease-out"
            style={{ opacity: n === i ? 1 : 0 }}
          />
        ))}

        {([['Previous', -1, 'left-2'], ['Next', 1, 'right-2']] as const).map(([label, dir, side]) => (
          <button
            key={label}
            onClick={() => go(i + dir)}
            aria-label={`${label} photo`}
            className={`absolute ${side} top-1/2 h-9 w-9 -translate-y-1/2 rounded-full bg-plane/70 text-base leading-none text-ink-2 opacity-0 backdrop-blur-sm transition hover:bg-plane hover:text-ink focus:opacity-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-gold group-hover:opacity-100 max-lg:opacity-70`}
          >
            {dir < 0 ? '‹' : '›'}
          </button>
        ))}
      </div>

      {/* A dot per photo wrapped into an unreadable double row at 26 images, so
          position is a single progress track instead. */}
      <div className="px-3 py-3">
        <div className="h-1 w-full overflow-hidden rounded-full bg-baseline">
          <div
            className="h-full rounded-full bg-gold transition-[width] duration-500 ease-out"
            style={{ width: `${((i + 1) / IMAGES.length) * 100}%` }}
          />
        </div>
      </div>
    </section>
  )
}
