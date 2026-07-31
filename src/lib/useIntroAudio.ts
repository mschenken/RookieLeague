import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Drop a theme file at any one of these paths and the intro picks it up; none
 * present means the intro is silent and shows no audio control at all.
 * Several extensions are accepted because what you can export depends on your
 * tools — macOS, for instance, encodes AAC but not MP3 out of the box.
 */
const CANDIDATES = ['mp3', 'm4a', 'ogg', 'wav'].map((ext) => `${import.meta.env.BASE_URL}audio/draft-theme.${ext}`)

const PEAK = 0.32
const FADE_IN = 1600
const FADE_OUT = 600

type State = 'idle' | 'playing' | 'blocked' | 'unavailable'

function fade(el: HTMLAudioElement, to: number, ms: number, done?: () => void) {
  const from = el.volume
  const t0 = performance.now()
  const step = (t: number) => {
    const k = Math.min((t - t0) / ms, 1)
    el.volume = Math.max(0, Math.min(1, from + (to - from) * k))
    if (k < 1) requestAnimationFrame(step)
    else done?.()
  }
  requestAnimationFrame(step)
}

/**
 * Theme music for the intro.
 *
 * Browsers refuse to autoplay audible media before a user gesture, and the intro
 * runs on page load — so a blocked start is the *expected* path on a first visit,
 * not a failure. We surface a one-tap control in that case rather than pretending
 * it worked. A play() rejection is only treated as "blocked" when the element has
 * no media error; a genuine load failure falls through to the next candidate
 * format, and running out of candidates reports `unavailable` so the caller can
 * render nothing.
 */
export function useIntroAudio() {
  const ref = useRef<HTMLAudioElement | null>(null)
  const [src, setSrc] = useState(0)
  const [state, setState] = useState<State>('idle')

  const attempt = useCallback((ms: number) => {
    const el = ref.current
    if (!el) return
    el.volume = 0
    el.play().then(
      () => { setState('playing'); fade(el, PEAK, ms) },
      () => { if (!el.error) setState('blocked') },
    )
  }, [])

  useEffect(() => { attempt(FADE_IN) }, [src, attempt])

  const onError = useCallback(() => {
    setSrc((i) => {
      if (i < CANDIDATES.length - 1) return i + 1
      setState('unavailable')
      return i
    })
  }, [])

  const mute = useCallback(() => {
    const el = ref.current
    if (!el) return
    fade(el, 0, 250, () => { el.pause(); setState('blocked') })
  }, [])

  /** Fade out and stop — called when the intro is dismissed. */
  const stop = useCallback(() => {
    const el = ref.current
    if (!el || el.paused) return
    fade(el, 0, FADE_OUT, () => el.pause())
  }, [])

  return { ref, src: CANDIDATES[src], state, onError, enable: () => attempt(400), mute, stop }
}
