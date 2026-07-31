import { useCallback, useEffect, useRef, useState } from 'react'

export type V3 = [number, number, number]
/** One logo's flight, in audio space: starts far out, ends on the ring. */
export type Voice = { at: number; from: V3; to: V3; dur: number; tone: number }

type State = 'idle' | 'on' | 'blocked' | 'unsupported'

const MASTER = 0.85
const VOICE_PEAK = 0.5

type Ctor = typeof AudioContext
const getCtor = (): Ctor | null =>
  (typeof window === 'undefined'
    ? null
    : window.AudioContext ?? (window as unknown as { webkitAudioContext?: Ctor }).webkitAudioContext ?? null)

/**
 * Brown noise, not white. Integrating the noise rolls off the high end, which reads
 * as moving air rather than television static — the difference between a whoosh and
 * a hiss.
 */
function makeNoise(ctx: AudioContext) {
  const len = Math.floor(ctx.sampleRate * 0.8)
  const buf = ctx.createBuffer(1, len, ctx.sampleRate)
  const data = buf.getChannelData(0)
  let last = 0
  for (let i = 0; i < len; i++) {
    const white = Math.random() * 2 - 1
    last = (last + 0.02 * white) / 1.02
    data[i] = last * 3.5
  }
  return buf
}

function place(p: PannerNode, [x, y, z]: V3, t: number, ramp = false) {
  // positionX/Y/Z are AudioParams in current browsers; setPosition is the old API.
  if (p.positionX) {
    const set = (param: AudioParam, v: number) =>
      ramp ? param.linearRampToValueAtTime(v, t) : param.setValueAtTime(v, t)
    set(p.positionX, x); set(p.positionY, y); set(p.positionZ, z)
  } else if (!ramp) {
    ;(p as unknown as { setPosition(x: number, y: number, z: number): void }).setPosition(x, y, z)
  }
}

/**
 * Synthesised 3D swooshes for the intro logos.
 *
 * Generated in the browser rather than loaded from a file: each logo gets its own
 * voice panned along the path it actually flies, which a stereo sound file could
 * not do, and it ships no audio assets at all.
 *
 * An AudioContext starts suspended until the visitor interacts with the page, so on
 * a first visit `state` is 'blocked' — expected, not an error. `enable()` resumes it
 * and the caller replays the animation so the sound has something to sync to.
 */
export function useSwooshes() {
  const ctxRef = useRef<AudioContext | null>(null)
  const noiseRef = useRef<AudioBuffer | null>(null)
  const busRef = useRef<AudioNode | null>(null)
  const liveRef = useRef<AudioScheduledSourceNode[]>([])
  const [state, setState] = useState<State>('idle')

  // Build the graph once. Created eagerly so we can report 'blocked' before any click.
  useEffect(() => {
    const Ctor = getCtor()
    if (!Ctor) { setState('unsupported'); return }
    const ctx = new Ctor()
    ctxRef.current = ctx
    noiseRef.current = makeNoise(ctx)

    // 32 overlapping voices will clip without a limiter in front of the output.
    const comp = ctx.createDynamicsCompressor()
    comp.threshold.value = -14
    comp.ratio.value = 12
    comp.attack.value = 0.003
    comp.release.value = 0.2
    const master = ctx.createGain()
    master.gain.value = MASTER
    comp.connect(master).connect(ctx.destination)
    busRef.current = comp

    setState(ctx.state === 'running' ? 'on' : 'blocked')
    return () => { ctx.close().catch(() => {}) }
  }, [])

  const play = useCallback((voices: Voice[]) => {
    const ctx = ctxRef.current
    const noise = noiseRef.current
    const bus = busRef.current
    if (!ctx || !noise || !bus || ctx.state !== 'running') return

    const t0 = ctx.currentTime + 0.05
    for (const v of voices) {
      const t = t0 + v.at

      const src = ctx.createBufferSource()
      src.buffer = noise
      src.loop = true
      src.playbackRate.value = 0.75 + v.tone * 0.5

      // Sweeping the band up then back down is what sells a pass-by rather than
      // a static hiss that fades in and out.
      const bp = ctx.createBiquadFilter()
      bp.type = 'bandpass'
      bp.Q.value = 1.1
      bp.frequency.setValueAtTime(280 * v.tone, t)
      bp.frequency.exponentialRampToValueAtTime(2400 * v.tone, t + v.dur * 0.45)
      bp.frequency.exponentialRampToValueAtTime(380 * v.tone, t + v.dur)

      const g = ctx.createGain()
      g.gain.setValueAtTime(0.0001, t)
      g.gain.exponentialRampToValueAtTime(VOICE_PEAK, t + v.dur * 0.3)
      g.gain.exponentialRampToValueAtTime(0.0001, t + v.dur)

      const pan = ctx.createPanner()
      pan.panningModel = 'HRTF'
      pan.distanceModel = 'inverse'
      pan.refDistance = 1.4
      place(pan, v.from, t)
      place(pan, v.to, t + v.dur, true)

      src.connect(bp).connect(g).connect(pan).connect(bus)
      src.start(t)
      src.stop(t + v.dur + 0.05)
      liveRef.current.push(src)
    }
  }, [])

  /** Resume after a user gesture. Resolves true when sound is actually running. */
  const enable = useCallback(async () => {
    const ctx = ctxRef.current
    if (!ctx) return false
    try { await ctx.resume() } catch { /* stays suspended */ }
    const ok = ctx.state === 'running'
    setState(ok ? 'on' : 'blocked')
    return ok
  }, [])

  const stop = useCallback(() => {
    for (const s of liveRef.current) { try { s.stop() } catch { /* already stopped */ } }
    liveRef.current = []
  }, [])

  const mute = useCallback(() => {
    stop()
    ctxRef.current?.suspend().catch(() => {})
    setState('blocked')
  }, [stop])

  return { state, play, enable, mute, stop }
}
