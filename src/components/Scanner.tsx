import { useRef, useEffect, useState, useCallback } from 'react'
import { ArrowLeft, Camera, AlertCircle, Loader2, Play } from 'lucide-react'
import { extractRoi, computeMetrics, type RppgFrame, type HealthMetrics } from '../utils/rppg'

interface Props {
  onComplete: (metrics: HealthMetrics) => void
  onBack: () => void
}

type Phase = 'permission' | 'setup' | 'scanning' | 'processing' | 'error'

const SCAN_DURATION = 30 // seconds
const FRAME_INTERVAL = 66 // ~15 fps

export default function Scanner({ onComplete, onBack }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const framesRef = useRef<RppgFrame[]>([])
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  // Keep latest onComplete in a ref so the interval closure never goes stale
  const onCompleteRef = useRef(onComplete)
  useEffect(() => { onCompleteRef.current = onComplete }, [onComplete])

  const [phase, setPhase] = useState<Phase>('permission')
  const [countdown, setCountdown] = useState(SCAN_DURATION)
  const [signalQuality, setSignalQuality] = useState(0) // 0-100
  const [waveformData, setWaveformData] = useState<number[]>(new Array(80).fill(0.5))
  const [errorMsg, setErrorMsg] = useState('')
  const [faceDetected, setFaceDetected] = useState(false)
  const [framesCount, setFramesCount] = useState(0)

  const stopScan = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
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
      const remaining = Math.ceil((endTime - now) / 1000)
      setCountdown(Math.max(0, remaining))

      // Capture frame — guard against unready or zero-dimension video
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

      // Sanity check: NaN or all-black means camera not ready yet
      if (isNaN(r) || isNaN(g) || isNaN(b)) return
      if (r === 0 && g === 0 && b === 0) return

      // Loose check: any non-black pixels with some brightness means signal present
      // (mobile cameras vary widely in color response — keep this permissive)
      const brightness = (r + g + b) / 3
      const isFace = brightness > 20 && brightness < 245
      setFaceDetected(isFace)

      framesRef.current.push({ r, g, b, timestamp: now })
      setFramesCount(framesRef.current.length)

      // Waveform: show green channel variation (the cardiac signal source)
      const recent = framesRef.current.slice(-80)
      if (recent.length >= 4) {
        const gValues = recent.map(f => f.g)
        const gMin = Math.min(...gValues)
        const gMax = Math.max(...gValues)
        const range = gMax - gMin || 1
        const normalized = gValues.map(v => (v - gMin) / range)
        setWaveformData(prev => {
          const merged = [...prev, ...normalized].slice(-80)
          return merged
        })

        // Signal quality: std dev of green channel (higher = more pulsatile signal)
        const gMean = gValues.reduce((a, b) => a + b, 0) / gValues.length
        const gStd = Math.sqrt(gValues.reduce((a, v) => a + (v - gMean) ** 2, 0) / gValues.length)
        // Typical good signal: std ~1-4 gray levels. Clamp to 0-100%
        setSignalQuality(Math.min(Math.round((gStd / 4) * 100), 100))
      }

      if (now >= endTime) {
        clearInterval(intervalRef.current!)
        intervalRef.current = null
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
    try {
      // Try constraints from most specific to most compatible.
      // Mobile browsers (especially Android) often reject width/height/frameRate
      // constraints and return a silent black stream — so we fall back to bare minimum.
      const attempts: MediaStreamConstraints[] = [
        { video: { facingMode: 'user' }, audio: false },
        { video: { facingMode: { ideal: 'user' } }, audio: false },
        { video: true, audio: false },
      ]

      let stream: MediaStream | null = null
      let lastError: unknown = null
      for (const constraints of attempts) {
        try {
          stream = await navigator.mediaDevices.getUserMedia(constraints)
          break
        } catch (e) {
          lastError = e
        }
      }
      if (!stream) throw lastError

      streamRef.current = stream
      const video = videoRef.current
      if (video) {
        // Set attributes programmatically — critical for iOS Safari and Android Chrome
        video.muted = true
        video.setAttribute('playsinline', '')
        video.setAttribute('autoplay', '')
        video.srcObject = stream

        // play() can throw on some mobile browsers; the autoplay attribute handles it
        try { await video.play() } catch { /* autoplay attribute takes over */ }

        // Wait for dimensions with a 4-second timeout — some devices are slow to init
        await new Promise<void>(resolve => {
          let ticks = 0
          const check = () => {
            if (video.videoWidth > 0 && video.videoHeight > 0) { resolve(); return }
            if (++ticks > 80) { resolve(); return } // 4s max, then continue anyway
            setTimeout(check, 50)
          }
          check()
        })
      }
      setPhase('setup')
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e)
      if (msg.includes('Permission') || msg.includes('NotAllowed') || msg.includes('denied')) {
        setErrorMsg('Camera permission denied. Tap the camera icon in your browser address bar and allow access, then refresh.')
      } else if (msg.includes('NotFound') || msg.includes('DevicesNotFound')) {
        setErrorMsg('No camera found on this device.')
      } else {
        setErrorMsg('Could not access the camera. Make sure you are on HTTPS and try refreshing.')
      }
      setPhase('error')
    }
  }, [])

  useEffect(() => {
    return () => stopScan()
  }, [stopScan])

  const progress = ((SCAN_DURATION - countdown) / SCAN_DURATION) * 100

  const qualityColor =
    signalQuality > 60 ? '#10b981' :
    signalQuality > 30 ? '#f59e0b' : '#ef4444'

  const qualityLabel =
    signalQuality > 60 ? 'Good' :
    signalQuality > 30 ? 'Fair — hold still' : 'Weak — improve lighting'

  return (
    <div className="min-h-screen bg-[#080812] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-5 border-b border-white/5">
        <button
          onClick={() => { stopScan(); onBack() }}
          className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm">Back</span>
        </button>
        <div className="text-sm font-semibold text-slate-300">VitalScan AI</div>
        <div className="w-16" />
      </div>

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
                ['💡', 'Sit in a well-lit room (face the light, not a window behind you)'],
                ['🧘', 'Sit still — any movement blurs the signal'],
                ['😶', 'Keep your face in the oval for the full 30 seconds'],
                ['👓', 'Remove glasses if possible'],
              ].map(([icon, tip]) => (
                <div key={tip} className="flex items-start gap-3 text-sm text-slate-400">
                  <span>{icon}</span>
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
            <p className="text-slate-400 mb-8 text-sm leading-relaxed">{errorMsg}</p>
            <button
              onClick={() => setPhase('permission')}
              className="w-full border border-white/10 hover:border-indigo-500/40 text-white font-semibold py-4 rounded-xl transition-all"
            >
              Try Again
            </button>
          </div>
        )}

        {/* Camera + scanning UI */}
        {(phase === 'setup' || phase === 'scanning' || phase === 'processing') && (
          <div className="w-full max-w-md space-y-4">

            {/* Phase label */}
            <div className="text-center text-sm text-slate-500">
              {phase === 'setup' && 'Position your face inside the oval, then press Start'}
              {phase === 'scanning' && `Scanning… ${countdown}s remaining`}
              {phase === 'processing' && 'Analyzing your signal…'}
            </div>

            {/* Video feed */}
            <div className="relative rounded-3xl overflow-hidden border border-white/10 bg-black aspect-[4/3]">
              <video
                ref={videoRef}
                className="w-full h-full object-cover scale-x-[-1]"
                autoPlay
                muted
                playsInline
              />
              {/* Hidden canvas for frame capture */}
              <canvas ref={canvasRef} className="hidden" />

              {/* Face oval overlay */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div
                  className="w-44 h-56 rounded-full border-2 transition-all duration-500"
                  style={{
                    borderColor: faceDetected ? '#10b981' : 'rgba(99,102,241,0.5)',
                    boxShadow: faceDetected ? '0 0 20px rgba(16,185,129,0.25)' : 'none',
                  }}
                />
              </div>

              {/* Face detected indicator */}
              <div className="absolute top-3 right-3 flex items-center gap-1.5 bg-black/50 backdrop-blur-sm rounded-full px-2.5 py-1">
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ background: faceDetected ? '#10b981' : '#475569', animation: faceDetected ? 'pulse 1.5s infinite' : 'none' }}
                />
                <span className="text-xs text-slate-300">{faceDetected ? 'Face detected' : 'No face'}</span>
              </div>

              {/* ROI box hint */}
              {phase === 'setup' && (
                <div className="absolute inset-x-0 bottom-3 flex justify-center">
                  <div className="bg-black/60 backdrop-blur-sm rounded-full px-4 py-1.5 text-xs text-slate-300">
                    Center your face in the oval
                  </div>
                </div>
              )}

              {/* Processing overlay */}
              {phase === 'processing' && (
                <div className="absolute inset-0 bg-black/70 backdrop-blur-sm flex flex-col items-center justify-center gap-4">
                  <Loader2 className="w-10 h-10 text-indigo-400 animate-spin" />
                  <p className="text-white font-medium">Computing health metrics…</p>
                  <p className="text-slate-400 text-sm">CHROM rPPG algorithm running</p>
                </div>
              )}
            </div>

            {/* Start button — shown only in setup phase */}
            {phase === 'setup' && (
              <button
                onClick={beginScan}
                className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-semibold py-4 rounded-xl transition-all hover:shadow-xl hover:shadow-indigo-500/30"
              >
                <Play className="w-5 h-5" />
                Start 30-Second Scan
              </button>
            )}

            {/* Progress bar */}
            {phase === 'scanning' && (
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs text-slate-500">
                  <span>Progress</span>
                  <span>{Math.round(progress)}%</span>
                </div>
                <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{
                      width: `${progress}%`,
                      background: 'linear-gradient(to right, #6366f1, #8b5cf6)',
                    }}
                  />
                </div>
              </div>
            )}

            {/* Live signal panel */}
            {phase === 'scanning' && (
              <div className="glass-card rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-500 font-mono">rPPG · Green Channel Signal</span>
                  <span className="text-xs font-medium" style={{ color: qualityColor }}>
                    {qualityLabel}
                  </span>
                </div>

                <Waveform data={waveformData} />

                {/* Signal quality bar */}
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-600 w-20 shrink-0">Signal quality</span>
                  <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${signalQuality}%`, background: qualityColor }}
                    />
                  </div>
                  <span className="text-xs w-8 text-right" style={{ color: qualityColor }}>
                    {signalQuality}%
                  </span>
                </div>

                {/* Frame counter */}
                <div className="flex justify-between text-xs text-slate-600">
                  <span>{framesCount} frames captured</span>
                  <span>~{Math.round(framesCount / Math.max((SCAN_DURATION - countdown), 1))} fps</span>
                </div>
              </div>
            )}

            {/* Tips during scan */}
            {phase === 'scanning' && !faceDetected && (
              <div className="text-center text-xs text-amber-400 bg-amber-400/10 rounded-xl px-4 py-3">
                No face signal — check lighting and center your face in the oval
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function Waveform({ data }: { data: number[] }) {
  const W = 400
  const H = 80
  const min = Math.min(...data)
  const max = Math.max(...data)
  const range = max - min || 1

  const pathD = data
    .map((v, i) => {
      const x = (i / (data.length - 1)) * W
      const y = H - ((v - min) / range) * (H - 10) - 5
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(' ')

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="w-full"
      preserveAspectRatio="none"
      style={{ height: 72 }}
    >
      <defs>
        <linearGradient id="waveGrad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#6366f1" stopOpacity="0.2" />
          <stop offset="50%" stopColor="#6366f1" />
          <stop offset="100%" stopColor="#8b5cf6" />
        </linearGradient>
      </defs>
      <path
        d={pathD}
        fill="none"
        stroke="url(#waveGrad)"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
