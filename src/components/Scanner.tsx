import { useRef, useEffect, useState, useCallback } from 'react'
import { ArrowLeft, Camera, AlertCircle, Loader2, Play } from 'lucide-react'
import { extractRoi, computeMetrics, type RppgFrame, type HealthMetrics } from '../utils/rppg'

interface Props {
  onComplete: (metrics: HealthMetrics) => void
  onBack: () => void
}

type Phase = 'permission' | 'setup' | 'scanning' | 'processing' | 'error'

const SCAN_DURATION = 30
const FRAME_INTERVAL = 66 // ~15 fps

export default function Scanner({ onComplete, onBack }: Props) {
  // The video element is ALWAYS in the DOM (never conditionally rendered).
  // This is critical — if we render it only after phase changes to 'setup',
  // videoRef.current is null when startCamera runs and srcObject is never set.
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const framesRef = useRef<RppgFrame[]>([])
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const onCompleteRef = useRef(onComplete)
  useEffect(() => { onCompleteRef.current = onComplete }, [onComplete])

  const [phase, setPhase] = useState<Phase>('permission')
  const [countdown, setCountdown] = useState(SCAN_DURATION)
  const [signalQuality, setSignalQuality] = useState(0)
  const [waveformData, setWaveformData] = useState<number[]>(new Array(80).fill(0.5))
  const [errorMsg, setErrorMsg] = useState('')
  const [faceDetected, setFaceDetected] = useState(false)
  const [framesCount, setFramesCount] = useState(0)
  const [streamDebug, setStreamDebug] = useState('')

  const stopScan = useCallback(() => {
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop())
      streamRef.current = null
    }
  }, [])

  const beginScan = useCallback(() => {
    framesRef.current = []
    setCountdown(SCAN_DURATION)
    setFramesCount(0)
    setPhase('scanning')

    const endTime = Date.now() + SCAN_DURATION * 1000

    intervalRef.current = setInterval(() => {
      const now = Date.now()
      setCountdown(Math.max(0, Math.ceil((endTime - now) / 1000)))

      const video = videoRef.current
      const canvas = canvasRef.current
      if (!video || !canvas) return
      if (video.readyState < 2) return
      if (video.videoWidth === 0 || video.videoHeight === 0) return

      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      ctx.drawImage(video, 0, 0)

      const { r, g, b } = extractRoi(ctx, video.videoWidth, video.videoHeight)
      if (isNaN(r) || isNaN(g) || isNaN(b)) return
      if (r === 0 && g === 0 && b === 0) return

      const brightness = (r + g + b) / 3
      setFaceDetected(brightness > 20 && brightness < 245)

      framesRef.current.push({ r, g, b, timestamp: now })
      setFramesCount(framesRef.current.length)

      const recent = framesRef.current.slice(-80)
      if (recent.length >= 4) {
        const gValues = recent.map(f => f.g)
        const gMin = Math.min(...gValues)
        const gMax = Math.max(...gValues)
        const range = gMax - gMin || 1
        setWaveformData(prev => [...prev, ...gValues.map(v => (v - gMin) / range)].slice(-80))
        const gMean = gValues.reduce((a, v) => a + v, 0) / gValues.length
        const gStd = Math.sqrt(gValues.reduce((a, v) => a + (v - gMean) ** 2, 0) / gValues.length)
        setSignalQuality(Math.min(Math.round((gStd / 4) * 100), 100))
      }

      if (now >= endTime) {
        clearInterval(intervalRef.current!); intervalRef.current = null
        setPhase('processing')
        setTimeout(() => {
          const metrics = computeMetrics(framesRef.current)
          stopScan()
          onCompleteRef.current(metrics)
        }, 1500)
      }
    }, FRAME_INTERVAL)
  }, [stopScan])

  const startCamera = useCallback(async () => {
    setStreamDebug('')
    const video = videoRef.current
    if (!video) {
      setErrorMsg('Camera element not ready. Please refresh the page.')
      setPhase('error')
      return
    }

    try {
      // Progressively simpler constraints — Brave/Android often reject complex ones
      const attempts: MediaStreamConstraints[] = [
        { video: { facingMode: 'user' }, audio: false },
        { video: { facingMode: { ideal: 'user' } }, audio: false },
        { video: true, audio: false },
      ]

      let stream: MediaStream | null = null
      let lastErr: unknown = null
      for (const c of attempts) {
        try { stream = await navigator.mediaDevices.getUserMedia(c); break }
        catch (e) { lastErr = e }
      }
      if (!stream) throw lastErr

      // Check that Brave Shields isn't silently muting the track
      const track = stream.getVideoTracks()[0]
      if (!track) throw new Error('No video track in stream')

      const trackState = `track: ${track.label} | state: ${track.readyState} | muted: ${track.muted}`
      setStreamDebug(trackState)

      if (track.readyState !== 'live') {
        throw new Error(`Camera track not live (${track.readyState}). Brave Shields may be blocking it.`)
      }

      streamRef.current = stream

      // Set all attributes before srcObject — critical for iOS & Android
      video.muted = true
      video.setAttribute('playsinline', '')
      video.setAttribute('autoplay', '')
      video.srcObject = stream

      // play() can throw on Android if called outside user gesture chain
      try { await video.play() } catch { /* autoplay attribute handles it */ }

      // Wait for dimensions — up to 5 seconds, then continue anyway
      await new Promise<void>(resolve => {
        let ticks = 0
        const check = () => {
          if (video.videoWidth > 0 && video.videoHeight > 0) { resolve(); return }
          if (++ticks > 100) { resolve(); return }
          setTimeout(check, 50)
        }
        // Also listen to loadedmetadata which fires when dimensions are known
        video.addEventListener('loadedmetadata', () => resolve(), { once: true })
        check()
      })

      setPhase('setup')

    } catch (e: unknown) {
      const msg = (e instanceof Error ? e.message : String(e)).toLowerCase()
      if (msg.includes('permission') || msg.includes('notallowed') || msg.includes('denied')) {
        setErrorMsg(
          'Camera permission denied.\n\n' +
          'On Brave: tap the lion icon in the address bar → disable Shields for this site, then refresh.\n\n' +
          'On Chrome/Safari: tap the camera icon in the address bar → Allow, then refresh.'
        )
      } else if (msg.includes('shields') || msg.includes('not live')) {
        setErrorMsg(
          'Brave Shields is blocking the camera.\n\n' +
          'Tap the lion icon (🦁) in the address bar → turn off Shields for this site → refresh the page.'
        )
      } else if (msg.includes('notfound') || msg.includes('devicesnotfound')) {
        setErrorMsg('No camera found on this device.')
      } else {
        setErrorMsg(
          'Camera failed to start. If you are on Brave, tap the 🦁 icon and disable Shields, then refresh.\n\n' +
          `(Error: ${e instanceof Error ? e.message : String(e)})`
        )
      }
      setPhase('error')
    }
  }, [])

  useEffect(() => { return () => stopScan() }, [stopScan])

  const progress = ((SCAN_DURATION - countdown) / SCAN_DURATION) * 100
  const qualityColor = signalQuality > 60 ? '#10b981' : signalQuality > 30 ? '#f59e0b' : '#ef4444'
  const qualityLabel = signalQuality > 60 ? 'Good' : signalQuality > 30 ? 'Fair — hold still' : 'Weak — improve lighting'
  const showCamera = phase === 'setup' || phase === 'scanning' || phase === 'processing'

  return (
    <div className="min-h-screen bg-[#080812] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-5 border-b border-white/5">
        <button onClick={() => { stopScan(); onBack() }} className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors">
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm">Back</span>
        </button>
        <div className="text-sm font-semibold text-slate-300">VitalScan AI</div>
        <div className="w-16" />
      </div>

      {/*
        The <video> element MUST always be in the DOM so videoRef.current is not null
        when startCamera() runs. We just hide it visually when not needed.
      */}
      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        className="absolute pointer-events-none"
        style={{ width: 1, height: 1, opacity: 0, top: 0, left: 0 }}
      />
      <canvas ref={canvasRef} className="hidden" />

      <div className="flex-1 flex flex-col items-center justify-center px-4 py-8 gap-6">

        {/* Permission screen */}
        {phase === 'permission' && (
          <div className="text-center max-w-sm animate-fade-in-up">
            <div className="w-20 h-20 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mx-auto mb-6">
              <Camera className="w-9 h-9 text-indigo-400" />
            </div>
            <h2 className="text-2xl font-bold mb-3">Ready to scan</h2>
            <p className="text-slate-400 mb-6 leading-relaxed text-sm">
              We need your front camera. All processing is on-device — no data is uploaded anywhere.
            </p>
            <div className="text-left space-y-2 mb-8">
              {[
                ['💡', 'Sit in a well-lit room (face the light source, not away from it)'],
                ['🧘', 'Sit still — movement blurs the signal'],
                ['😶', 'Keep your face in the oval for 30 seconds'],
                ['👓', 'Remove glasses if possible'],
                ['🦁', 'On Brave browser: tap the lion icon → disable Shields for this site'],
              ].map(([icon, tip]) => (
                <div key={tip} className="flex items-start gap-3 text-sm text-slate-400">
                  <span className="shrink-0">{icon}</span>
                  <span>{tip}</span>
                </div>
              ))}
            </div>
            <button
              onClick={startCamera}
              className="w-full bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-semibold py-4 rounded-xl transition-all hover:shadow-xl hover:shadow-indigo-500/30"
            >
              Allow Camera
            </button>
          </div>
        )}

        {/* Error screen */}
        {phase === 'error' && (
          <div className="text-center max-w-sm">
            <div className="w-20 h-20 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center mx-auto mb-6">
              <AlertCircle className="w-9 h-9 text-rose-400" />
            </div>
            <h2 className="text-2xl font-bold mb-3">Camera unavailable</h2>
            <p className="text-slate-400 mb-6 text-sm leading-relaxed whitespace-pre-line">{errorMsg}</p>
            {streamDebug && (
              <p className="text-xs text-slate-600 font-mono mb-6 break-all">{streamDebug}</p>
            )}
            <button
              onClick={() => setPhase('permission')}
              className="w-full border border-white/10 hover:border-indigo-500/40 text-white font-semibold py-4 rounded-xl transition-all"
            >
              Try Again
            </button>
          </div>
        )}

        {/* Camera + scanning UI */}
        {showCamera && (
          <div className="w-full max-w-md space-y-4">
            <div className="text-center text-sm text-slate-500">
              {phase === 'setup' && 'Position your face inside the oval, then press Start'}
              {phase === 'scanning' && `Scanning… ${countdown}s remaining`}
              {phase === 'processing' && 'Analyzing your signal…'}
            </div>

            {/* Video viewport — clones the hidden video via srcObject sharing */}
            <div className="relative rounded-3xl overflow-hidden border border-white/10 bg-black aspect-[4/3]">
              {/* Mirror the always-mounted video into a visible clone */}
              <VideoMirror videoRef={videoRef} />

              {/* Face oval */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div
                  className="w-44 h-56 rounded-full border-2 transition-all duration-500"
                  style={{
                    borderColor: faceDetected ? '#10b981' : 'rgba(99,102,241,0.5)',
                    boxShadow: faceDetected ? '0 0 20px rgba(16,185,129,0.25)' : 'none',
                  }}
                />
              </div>

              {/* Status dot */}
              <div className="absolute top-3 right-3 flex items-center gap-1.5 bg-black/50 backdrop-blur-sm rounded-full px-2.5 py-1">
                <div className="w-2 h-2 rounded-full" style={{ background: faceDetected ? '#10b981' : '#475569', animation: faceDetected ? 'pulse 1.5s infinite' : 'none' }} />
                <span className="text-xs text-slate-300">{faceDetected ? 'Face detected' : 'No face'}</span>
              </div>

              {phase === 'setup' && (
                <div className="absolute inset-x-0 bottom-3 flex justify-center">
                  <div className="bg-black/60 backdrop-blur-sm rounded-full px-4 py-1.5 text-xs text-slate-300">
                    Center your face in the oval
                  </div>
                </div>
              )}

              {phase === 'processing' && (
                <div className="absolute inset-0 bg-black/70 backdrop-blur-sm flex flex-col items-center justify-center gap-4">
                  <Loader2 className="w-10 h-10 text-indigo-400 animate-spin" />
                  <p className="text-white font-medium">Computing health metrics…</p>
                  <p className="text-slate-400 text-sm">CHROM rPPG algorithm running</p>
                </div>
              )}
            </div>

            {phase === 'setup' && (
              <button
                onClick={beginScan}
                className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-semibold py-4 rounded-xl transition-all hover:shadow-xl hover:shadow-indigo-500/30"
              >
                <Play className="w-5 h-5" />
                Start 30-Second Scan
              </button>
            )}

            {phase === 'scanning' && (
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs text-slate-500">
                  <span>Progress</span><span>{Math.round(progress)}%</span>
                </div>
                <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-300" style={{ width: `${progress}%`, background: 'linear-gradient(to right,#6366f1,#8b5cf6)' }} />
                </div>
              </div>
            )}

            {phase === 'scanning' && (
              <div className="glass-card rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-500 font-mono">rPPG · Green Channel</span>
                  <span className="text-xs font-medium" style={{ color: qualityColor }}>{qualityLabel}</span>
                </div>
                <Waveform data={waveformData} />
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-600 w-20 shrink-0">Signal quality</span>
                  <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-500" style={{ width: `${signalQuality}%`, background: qualityColor }} />
                  </div>
                  <span className="text-xs w-8 text-right" style={{ color: qualityColor }}>{signalQuality}%</span>
                </div>
                <div className="flex justify-between text-xs text-slate-600">
                  <span>{framesCount} frames</span>
                  <span>~{Math.round(framesCount / Math.max(SCAN_DURATION - countdown, 1))} fps</span>
                </div>
              </div>
            )}

            {phase === 'scanning' && !faceDetected && (
              <div className="text-center text-xs text-amber-400 bg-amber-400/10 rounded-xl px-4 py-3">
                No signal — check lighting and center your face in the oval
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// Renders the camera stream in the visible viewport by attaching the same
// MediaStream to a second video element. This avoids the conditional-render
// bug where the main videoRef is null when startCamera() runs.
function VideoMirror({ videoRef }: { videoRef: React.RefObject<HTMLVideoElement | null> }) {
  const mirrorRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    const src = videoRef.current
    const dst = mirrorRef.current
    if (!src || !dst) return

    const attach = () => {
      if (src.srcObject && dst.srcObject !== src.srcObject) {
        dst.srcObject = src.srcObject as MediaStream
        dst.muted = true
        dst.play().catch(() => {})
      }
    }

    // Poll until the source has a stream (startCamera may not have run yet)
    const interval = setInterval(attach, 200)
    attach()
    return () => clearInterval(interval)
  }, [videoRef])

  return (
    <video
      ref={mirrorRef}
      autoPlay
      muted
      playsInline
      className="w-full h-full object-cover scale-x-[-1]"
    />
  )
}

function Waveform({ data }: { data: number[] }) {
  const W = 400, H = 80
  const min = Math.min(...data), max = Math.max(...data)
  const range = max - min || 1
  const pathD = data.map((v, i) => {
    const x = (i / (data.length - 1)) * W
    const y = H - ((v - min) / range) * (H - 10) - 5
    return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`
  }).join(' ')

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" preserveAspectRatio="none" style={{ height: 72 }}>
      <defs>
        <linearGradient id="waveGrad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#6366f1" stopOpacity="0.2" />
          <stop offset="50%" stopColor="#6366f1" />
          <stop offset="100%" stopColor="#8b5cf6" />
        </linearGradient>
      </defs>
      <path d={pathD} fill="none" stroke="url(#waveGrad)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
