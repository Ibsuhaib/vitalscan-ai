// Cooley-Tukey FFT (power of 2 only)
export function fft(re: number[], im: number[]): { re: number[]; im: number[] } {
  const n = re.length
  if (n <= 1) return { re, im }

  const halfN = n / 2
  const evenRe = new Array(halfN)
  const evenIm = new Array(halfN)
  const oddRe = new Array(halfN)
  const oddIm = new Array(halfN)

  for (let i = 0; i < halfN; i++) {
    evenRe[i] = re[2 * i]
    evenIm[i] = im[2 * i]
    oddRe[i] = re[2 * i + 1]
    oddIm[i] = im[2 * i + 1]
  }

  const even = fft(evenRe, evenIm)
  const odd = fft(oddRe, oddIm)

  const outRe = new Array(n)
  const outIm = new Array(n)

  for (let k = 0; k < halfN; k++) {
    const angle = (-2 * Math.PI * k) / n
    const cos = Math.cos(angle)
    const sin = Math.sin(angle)
    const tRe = cos * odd.re[k] - sin * odd.im[k]
    const tIm = sin * odd.re[k] + cos * odd.im[k]
    outRe[k] = even.re[k] + tRe
    outIm[k] = even.im[k] + tIm
    outRe[k + halfN] = even.re[k] - tRe
    outIm[k + halfN] = even.im[k] - tIm
  }
  return { re: outRe, im: outIm }
}

// Pad to next power of 2
export function padToPow2(signal: number[]): number[] {
  let n = 1
  while (n < signal.length) n <<= 1
  const padded = new Array(n).fill(0)
  for (let i = 0; i < signal.length; i++) padded[i] = signal[i]
  return padded
}

// Hann window to reduce spectral leakage
export function hannWindow(signal: number[]): number[] {
  const n = signal.length
  return signal.map((v, i) => v * (0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (n - 1))))
}

// Linear detrend (remove DC + linear trend)
export function detrend(signal: number[]): number[] {
  const n = signal.length
  const x = Array.from({ length: n }, (_, i) => i)
  const xMean = (n - 1) / 2
  const yMean = signal.reduce((a, b) => a + b, 0) / n
  let num = 0
  let den = 0
  for (let i = 0; i < n; i++) {
    num += (x[i] - xMean) * (signal[i] - yMean)
    den += (x[i] - xMean) ** 2
  }
  const slope = num / den
  const intercept = yMean - slope * xMean
  return signal.map((v, i) => v - (slope * i + intercept))
}

// Normalize signal to zero mean, unit variance
export function normalize(signal: number[]): number[] {
  const mean = signal.reduce((a, b) => a + b, 0) / signal.length
  const std = Math.sqrt(signal.reduce((a, b) => a + (b - mean) ** 2, 0) / signal.length)
  if (std < 1e-10) return signal.map(() => 0)
  return signal.map(v => (v - mean) / std)
}

// Moving average filter
export function movingAverage(signal: number[], windowSize: number): number[] {
  const result = new Array(signal.length).fill(0)
  for (let i = 0; i < signal.length; i++) {
    const start = Math.max(0, i - Math.floor(windowSize / 2))
    const end = Math.min(signal.length - 1, i + Math.floor(windowSize / 2))
    let sum = 0
    for (let j = start; j <= end; j++) sum += signal[j]
    result[i] = sum / (end - start + 1)
  }
  return result
}

// Find peak frequency in a given band using FFT
// Returns frequency in Hz
export function peakFrequencyInBand(
  signal: number[],
  sampleRate: number,
  lowHz: number,
  highHz: number
): number {
  const windowed = hannWindow(detrend(signal))
  const padded = padToPow2(windowed)
  const n = padded.length
  const im = new Array(n).fill(0)
  const { re, im: imOut } = fft(padded, im)

  const freqResolution = sampleRate / n

  let maxPower = -Infinity
  let peakFreq = (lowHz + highHz) / 2

  for (let k = 0; k < n / 2; k++) {
    const freq = k * freqResolution
    if (freq >= lowHz && freq <= highHz) {
      const power = re[k] ** 2 + imOut[k] ** 2
      if (power > maxPower) {
        maxPower = power
        peakFreq = freq
      }
    }
  }
  return peakFreq
}

// Detect peaks in a signal
export function detectPeaks(signal: number[], minDistance: number = 5): number[] {
  const peaks: number[] = []
  for (let i = 1; i < signal.length - 1; i++) {
    if (signal[i] > signal[i - 1] && signal[i] > signal[i + 1]) {
      if (peaks.length === 0 || i - peaks[peaks.length - 1] >= minDistance) {
        peaks.push(i)
      }
    }
  }
  return peaks
}

// RMSSD — HRV metric from RR intervals (in seconds)
export function rmssd(rrIntervals: number[]): number {
  if (rrIntervals.length < 2) return 30
  let sumSq = 0
  for (let i = 1; i < rrIntervals.length; i++) {
    sumSq += (rrIntervals[i] - rrIntervals[i - 1]) ** 2
  }
  return Math.sqrt(sumSq / (rrIntervals.length - 1)) * 1000
}
