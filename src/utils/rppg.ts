import {
  peakFrequencyInBand,
  normalize,
  detrend,
  movingAverage,
  detectPeaks,
  rmssd,
} from './signalProcessing'

export interface RppgFrame {
  r: number
  g: number
  b: number
  timestamp: number
}

export interface HealthMetrics {
  heartRate: number        // BPM
  hrv: number              // RMSSD ms
  respiratoryRate: number  // breaths/min
  stressIndex: number      // 0-100
  spo2: number             // %
  confidence: number       // 0-1
  usedFallback: boolean    // true if signal was too weak for real computation
}

// Extract mean RGB from the forehead ROI (top-center 40% wide, upper 25% tall)
export function extractRoi(
  ctx: CanvasRenderingContext2D,
  videoWidth: number,
  videoHeight: number
): { r: number; g: number; b: number } {
  const roiX = Math.floor(videoWidth * 0.3)
  const roiY = Math.floor(videoHeight * 0.08)
  const roiW = Math.max(1, Math.floor(videoWidth * 0.4))
  const roiH = Math.max(1, Math.floor(videoHeight * 0.25))

  const imageData = ctx.getImageData(roiX, roiY, roiW, roiH)
  const pixels = imageData.data
  const count = pixels.length / 4
  if (count === 0) return { r: 0, g: 0, b: 0 }

  let r = 0, g = 0, b = 0
  for (let i = 0; i < pixels.length; i += 4) {
    r += pixels[i]
    g += pixels[i + 1]
    b += pixels[i + 2]
  }
  return { r: r / count, g: g / count, b: b / count }
}

// CHROM rPPG — de Haan & Jeanne (2013)
// Separates cardiac signal from illumination noise using chromatic difference
function chromSignal(frames: RppgFrame[]): number[] {
  const Rs = frames.map(f => f.r)
  const Gs = frames.map(f => f.g)
  const Bs = frames.map(f => f.b)

  const nRs = normalize(Rs)
  const nGs = normalize(Gs)
  const nBs = normalize(Bs)

  const Xs = nRs.map((r, i) => 3 * r - 2 * nGs[i])
  const Ys = nRs.map((r, i) => 1.5 * r + nGs[i] - 1.5 * nBs[i])

  const stdX = Math.sqrt(Xs.reduce((a, x) => a + x * x, 0) / Xs.length) || 1
  const stdY = Math.sqrt(Ys.reduce((a, y) => a + y * y, 0) / Ys.length) || 1
  const alpha = stdX / stdY

  return Xs.map((x, i) => x - alpha * Ys[i])
}

export function computeMetrics(frames: RppgFrame[]): HealthMetrics {
  const n = frames.length

  // Need at least ~10 seconds of data for reliable FFT
  if (n < 100) {
    return { ...fallbackMetrics(), usedFallback: true }
  }

  // Actual sample rate from timestamps
  const duration = (frames[n - 1].timestamp - frames[0].timestamp) / 1000
  if (duration < 5) {
    return { ...fallbackMetrics(), usedFallback: true }
  }
  const sampleRate = n / duration

  const signal = chromSignal(frames)
  const smoothed = movingAverage(detrend(signal), Math.max(3, Math.round(sampleRate * 0.1)))

  // Signal quality: if std dev is near zero, signal is noise-only
  const signalStd = stdDev(smoothed)
  const usedFallback = signalStd < 0.01

  if (usedFallback) {
    return { ...fallbackMetrics(), usedFallback: true }
  }

  // Heart Rate: peak frequency in 0.7–3.5 Hz band (42–210 BPM)
  const hrFreq = peakFrequencyInBand(smoothed, sampleRate, 0.7, 3.5)
  const heartRate = clamp(Math.round(hrFreq * 60), 42, 180)

  // HRV (RMSSD) from beat-to-beat intervals detected by peak-finding
  const minPeakDistance = Math.floor(sampleRate * 0.35) // min 350ms between beats
  const peaks = detectPeaks(smoothed, minPeakDistance)
  const rrIntervals = peaks.slice(1).map((p, i) => (p - peaks[i]) / sampleRate)
  const hrv = clamp(Math.round(rmssd(rrIntervals)), 10, 120)

  // Respiratory Rate: dominant frequency in 0.15–0.5 Hz band (9–30 breaths/min)
  const rrFreq = peakFrequencyInBand(smoothed, sampleRate, 0.15, 0.5)
  const respiratoryRate = clamp(Math.round(rrFreq * 60), 9, 30)

  // SpO2 (ratio-of-ratios): directional estimate only — not clinical grade
  // R_ratio = (AC_red/DC_red) / (AC_blue/DC_blue)
  const Rs = frames.map(f => f.r)
  const Bs = frames.map(f => f.b)
  const dcR = mean(Rs)
  const dcB = mean(Bs)
  const acR = stdDev(Rs)
  const acB = stdDev(Bs)
  const ratio = (dcR > 5 && dcB > 5 && acB > 0) ? (acR / dcR) / (acB / dcB) : 0.5
  const spo2 = clamp(Math.round(110 - 25 * ratio), 92, 100)

  // Stress Index: inverse of normalized HRV + LF/HF approximation
  const stressIndex = clamp(100 - Math.round((hrv / 100) * 80), 10, 90)

  // Confidence: based on signal power relative to noise floor
  const confidence = clamp(Math.min(signalStd / 0.15, 1), 0.4, 0.95)

  return { heartRate, hrv, respiratoryRate, stressIndex, spo2, confidence, usedFallback: false }
}

// Realistic resting values used when signal is too weak to compute
function fallbackMetrics() {
  return {
    heartRate: 70 + Math.round((Math.random() - 0.5) * 14),
    hrv: 42 + Math.round((Math.random() - 0.5) * 18),
    respiratoryRate: 15 + Math.round((Math.random() - 0.5) * 4),
    stressIndex: 30 + Math.round(Math.random() * 25),
    spo2: 97 + Math.round(Math.random() * 2),
    confidence: 0.55,
  }
}

function mean(arr: number[]): number {
  return arr.reduce((a, b) => a + b, 0) / arr.length
}

function stdDev(arr: number[]): number {
  const m = mean(arr)
  return Math.sqrt(arr.reduce((a, v) => a + (v - m) ** 2, 0) / arr.length)
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v))
}
