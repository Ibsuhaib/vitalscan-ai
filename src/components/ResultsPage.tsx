import { useState, useEffect } from 'react'
import { Heart, Activity, Wind, Brain, Droplets, TrendingUp, RotateCcw, Home, Share2, ChevronRight } from 'lucide-react'
import { RadialBarChart, RadialBar, ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, Area, AreaChart } from 'recharts'
import type { HealthMetrics } from '../utils/rppg'

interface Props {
  metrics: HealthMetrics
  onRescan: () => void
  onHome: () => void
}

export default function ResultsPage({ metrics, onRescan, onHome }: Props) {
  const [revealed, setRevealed] = useState(false)
  const [animatedHR, setAnimatedHR] = useState(0)
  const [activeTab, setActiveTab] = useState<'vitals' | 'trends' | 'insights'>('vitals')

  useEffect(() => {
    setTimeout(() => setRevealed(true), 300)
    // Animate heart rate counter
    let start = 40
    const target = metrics.heartRate
    const step = Math.ceil((target - start) / 20)
    const t = setInterval(() => {
      start = Math.min(start + step, target)
      setAnimatedHR(start)
      if (start >= target) clearInterval(t)
    }, 40)
    return () => clearInterval(t)
  }, [metrics.heartRate])

  const wellnessScore = computeWellnessScore(metrics)
  const hrStatus = classifyHR(metrics.heartRate)
  const stressStatus = classifyStress(metrics.stressIndex)

  // Mock trend data (would come from historical scans in production)
  const trendData = generateTrendData(metrics.heartRate)

  return (
    <div className="min-h-screen bg-[#080812] text-white">
      {/* Header */}
      <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 border-b border-white/5 backdrop-blur-xl bg-[#080812]/90">
        <button onClick={onHome} className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors">
          <Home className="w-4 h-4" />
          <span className="text-sm">Home</span>
        </button>
        <div className="text-sm font-semibold text-slate-300">Scan Results</div>
        <button onClick={onRescan} className="flex items-center gap-2 text-indigo-400 hover:text-indigo-300 text-sm transition-colors">
          <RotateCcw className="w-4 h-4" />
          Rescan
        </button>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">

        {/* Hero metric: Heart Rate */}
        <div className={`glass-card rounded-3xl p-8 text-center transition-all duration-700 ${revealed ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
          <div className="flex items-center justify-center gap-2 mb-2">
            <Heart className="w-5 h-5 text-rose-400 animate-pulse" />
            <span className="text-slate-400 text-sm">Heart Rate</span>
          </div>
          <div className="text-8xl font-black gradient-text leading-none mb-2">{animatedHR}</div>
          <div className="text-slate-400 text-lg mb-4">beats per minute</div>
          <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium ${hrStatus.bg} ${hrStatus.color}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${hrStatus.dot}`}></span>
            {hrStatus.label}
          </div>

          {/* Confidence / fallback notice */}
          <div className="mt-4 space-y-1">
            <div className="text-xs text-slate-500">
              Signal confidence: {Math.round(metrics.confidence * 100)}%
            </div>
            {metrics.usedFallback && (
              <div className="text-xs text-amber-400 bg-amber-400/10 rounded-lg px-3 py-2 mt-2">
                ⚠️ Signal was too weak for accurate measurement — improve lighting and hold still, then rescan.
              </div>
            )}
          </div>
        </div>

        {/* Tab navigation */}
        <div className="flex bg-white/4 rounded-xl p-1 gap-1">
          {(['vitals', 'trends', 'insights'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-2.5 text-sm font-medium rounded-lg capitalize transition-all ${activeTab === tab ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Vitals tab */}
        {activeTab === 'vitals' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <MetricCard
                icon={Activity}
                label="HRV"
                value={metrics.hrv}
                unit="ms RMSSD"
                color="text-violet-400"
                bg="bg-violet-400/10"
                status={classifyHRV(metrics.hrv)}
                delay={0}
                revealed={revealed}
              />
              <MetricCard
                icon={Wind}
                label="Respiratory Rate"
                value={metrics.respiratoryRate}
                unit="breaths/min"
                color="text-cyan-400"
                bg="bg-cyan-400/10"
                status={classifyRR(metrics.respiratoryRate)}
                delay={100}
                revealed={revealed}
              />
              <MetricCard
                icon={Brain}
                label="Stress Index"
                value={metrics.stressIndex}
                unit="/ 100"
                color="text-amber-400"
                bg="bg-amber-400/10"
                status={stressStatus}
                delay={200}
                revealed={revealed}
              />
              <MetricCard
                icon={Droplets}
                label="SpO₂"
                value={metrics.spo2}
                unit="%"
                color="text-sky-400"
                bg="bg-sky-400/10"
                status={classifySpO2(metrics.spo2)}
                delay={300}
                revealed={revealed}
              />
            </div>

            {/* Wellness score */}
            <div className={`glass-card rounded-2xl p-6 transition-all duration-700 delay-500 ${revealed ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-emerald-400" />
                  <span className="font-medium">Overall Wellness Score</span>
                </div>
                <span className="text-2xl font-bold text-emerald-400">{wellnessScore}</span>
              </div>
              <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-1000"
                  style={{ width: revealed ? `${wellnessScore}%` : '0%' }}
                />
              </div>
              <div className="flex justify-between text-xs text-slate-600 mt-1">
                <span>Poor</span>
                <span>Excellent</span>
              </div>
            </div>

            {/* Radial summary */}
            <div className={`glass-card rounded-2xl p-6 transition-all duration-700 delay-700 ${revealed ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
              <div className="text-sm text-slate-400 mb-4">Metric overview</div>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <RadialBarChart cx="50%" cy="50%" innerRadius="25%" outerRadius="90%"
                    data={[
                      { name: 'HR', value: normalizeHR(metrics.heartRate), fill: '#f43f5e' },
                      { name: 'HRV', value: Math.min(metrics.hrv, 100), fill: '#8b5cf6' },
                      { name: 'SpO₂', value: metrics.spo2, fill: '#38bdf8' },
                      { name: 'Stress', value: 100 - metrics.stressIndex, fill: '#10b981' },
                    ]}
                    startAngle={180} endAngle={-180}
                  >
                    <RadialBar dataKey="value" cornerRadius={6} />
                  </RadialBarChart>
                </ResponsiveContainer>
              </div>
              <div className="grid grid-cols-4 gap-2 text-center">
                {[
                  { label: 'HR', color: 'bg-rose-500' },
                  { label: 'HRV', color: 'bg-violet-500' },
                  { label: 'SpO₂', color: 'bg-sky-400' },
                  { label: 'Calm', color: 'bg-emerald-500' },
                ].map(l => (
                  <div key={l.label} className="flex items-center gap-1.5 justify-center">
                    <div className={`w-2 h-2 rounded-full ${l.color}`} />
                    <span className="text-xs text-slate-500">{l.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Trends tab */}
        {activeTab === 'trends' && (
          <div className="space-y-4">
            <div className="glass-card rounded-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm font-medium">Heart Rate · Last 7 days</span>
                <span className="text-xs text-slate-500">simulated demo</span>
              </div>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trendData}>
                    <defs>
                      <linearGradient id="hrGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="day" tick={{ fill: '#475569', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis domain={[50, 100]} tick={{ fill: '#475569', fontSize: 11 }} axisLine={false} tickLine={false} width={30} />
                    <Tooltip
                      contentStyle={{ background: '#1e1b4b', border: '1px solid #312e81', borderRadius: 8, color: '#fff' }}
                    />
                    <Area type="monotone" dataKey="hr" stroke="#6366f1" fill="url(#hrGrad)" strokeWidth={2} dot={{ fill: '#6366f1', r: 3 }} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="glass-card rounded-2xl p-6">
              <div className="text-sm font-medium mb-4">HRV Trend · Last 7 days</div>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trendData}>
                    <XAxis dataKey="day" tick={{ fill: '#475569', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis domain={[20, 80]} tick={{ fill: '#475569', fontSize: 11 }} axisLine={false} tickLine={false} width={30} />
                    <Tooltip
                      contentStyle={{ background: '#1e1b4b', border: '1px solid #312e81', borderRadius: 8, color: '#fff' }}
                    />
                    <Line type="monotone" dataKey="hrv" stroke="#8b5cf6" strokeWidth={2} dot={{ fill: '#8b5cf6', r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="glass-card rounded-2xl p-5 text-center">
              <div className="text-slate-400 text-sm">Historical trends require multiple scans.</div>
              <div className="text-slate-500 text-xs mt-1">Scan daily to build your health timeline.</div>
            </div>
          </div>
        )}

        {/* Insights tab */}
        {activeTab === 'insights' && (
          <div className="space-y-4">
            {generateInsights(metrics).map((insight, i) => (
              <div key={i} className="glass-card rounded-2xl p-5 flex items-start gap-4">
                <div className={`w-10 h-10 rounded-xl ${insight.bg} flex items-center justify-center shrink-0`}>
                  <span className="text-lg">{insight.emoji}</span>
                </div>
                <div>
                  <div className="font-medium mb-1">{insight.title}</div>
                  <div className="text-slate-400 text-sm leading-relaxed">{insight.body}</div>
                </div>
              </div>
            ))}

            <div className="glass-card rounded-2xl p-5 border border-amber-500/20">
              <div className="text-amber-400 text-xs font-semibold uppercase tracking-wide mb-2">Disclaimer</div>
              <p className="text-slate-400 text-xs leading-relaxed">
                VitalScan AI is a wellness screening tool, not a medical device. Results are for informational purposes only.
                Always consult a qualified healthcare professional for medical advice, diagnosis, or treatment.
              </p>
            </div>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex gap-3 pt-2">
          <button
            onClick={onRescan}
            className="flex-1 flex items-center justify-center gap-2 border border-white/10 hover:border-indigo-500/40 text-white font-medium py-3.5 rounded-xl transition-all"
          >
            <RotateCcw className="w-4 h-4" />
            Scan Again
          </button>
          <button
            onClick={() => {
              const text = `My VitalScan AI results:\nHR: ${metrics.heartRate} BPM\nHRV: ${metrics.hrv}ms\nSpO₂: ${metrics.spo2}%\nStress: ${metrics.stressIndex}/100`
              navigator.clipboard?.writeText(text)
            }}
            className="flex items-center justify-center gap-2 border border-white/10 hover:border-white/20 text-slate-400 hover:text-white px-5 py-3.5 rounded-xl transition-all"
          >
            <Share2 className="w-4 h-4" />
          </button>
        </div>

        {/* B2B CTA */}
        <div className="glass-card rounded-2xl p-6 border border-indigo-500/20">
          <div className="text-xs text-indigo-400 font-semibold uppercase tracking-widest mb-2">For Businesses</div>
          <h3 className="font-bold text-lg mb-2">Embed this in your app</h3>
          <p className="text-slate-400 text-sm mb-4">
            Our SDK integrates in &lt;1 hour. Insurance, corporate wellness, telemedicine — one API, unlimited health insights.
          </p>
          <div className="bg-[#0a0a1a] rounded-xl p-4 font-mono text-sm text-slate-300 mb-4 overflow-x-auto">
            <span className="text-indigo-400">import</span> {'{'} VitalScan {'}'} <span className="text-indigo-400">from</span> <span className="text-emerald-400">'@vitalscan/sdk'</span>
            <br />
            <br />
            <span className="text-indigo-400">const</span> result = <span className="text-indigo-400">await</span> VitalScan.<span className="text-amber-400">scan</span>()
            <br />
            <span className="text-slate-500">// {'{'} heartRate, hrv, spo2, stress {'}'}</span>
          </div>
          <button className="flex items-center gap-2 text-indigo-400 hover:text-indigo-300 text-sm font-medium transition-colors">
            Request SDK access <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}

interface MetricCardProps {
  icon: React.ElementType
  label: string
  value: number
  unit: string
  color: string
  bg: string
  status: { label: string; color: string }
  delay: number
  revealed: boolean
}

function MetricCard({ icon: Icon, label, value, unit, color, bg, status, delay, revealed }: MetricCardProps) {
  return (
    <div
      className={`glass-card rounded-2xl p-5 transition-all duration-700 ${revealed ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      <div className={`w-9 h-9 rounded-xl ${bg} flex items-center justify-center mb-3`}>
        <Icon className={`w-5 h-5 ${color}`} />
      </div>
      <div className="text-xs text-slate-500 mb-1">{label}</div>
      <div className={`text-3xl font-bold ${color} mb-0.5`}>{value}</div>
      <div className="text-xs text-slate-600 mb-2">{unit}</div>
      <div className={`text-xs font-medium ${status.color}`}>{status.label}</div>
    </div>
  )
}

// Classification helpers
function classifyHR(hr: number) {
  if (hr < 60) return { label: 'Low — Bradycardia', color: 'text-amber-300', bg: 'bg-amber-300/10', dot: 'bg-amber-400' }
  if (hr <= 100) return { label: 'Normal Range', color: 'text-emerald-300', bg: 'bg-emerald-300/10', dot: 'bg-emerald-400' }
  return { label: 'Elevated — Tachycardia', color: 'text-rose-300', bg: 'bg-rose-300/10', dot: 'bg-rose-400' }
}

function classifyHRV(hrv: number) {
  if (hrv >= 50) return { label: 'Good recovery', color: 'text-emerald-400' }
  if (hrv >= 30) return { label: 'Moderate', color: 'text-amber-400' }
  return { label: 'Low — elevated stress', color: 'text-rose-400' }
}

function classifyRR(rr: number) {
  if (rr >= 12 && rr <= 20) return { label: 'Normal', color: 'text-emerald-400' }
  return { label: 'Monitor', color: 'text-amber-400' }
}

function classifyStress(s: number) {
  if (s < 30) return { label: 'Calm', color: 'text-emerald-400', bg: '', dot: '' }
  if (s < 60) return { label: 'Moderate', color: 'text-amber-400', bg: '', dot: '' }
  return { label: 'High stress', color: 'text-rose-400', bg: '', dot: '' }
}

function classifySpO2(spo2: number) {
  if (spo2 >= 95) return { label: 'Normal', color: 'text-emerald-400' }
  if (spo2 >= 90) return { label: 'Low — monitor', color: 'text-amber-400' }
  return { label: 'Hypoxia risk', color: 'text-rose-400' }
}

function computeWellnessScore(m: HealthMetrics): number {
  const hrScore = m.heartRate >= 60 && m.heartRate <= 85 ? 100 : m.heartRate < 100 ? 70 : 40
  const hrvScore = Math.min((m.hrv / 60) * 100, 100)
  const rrScore = m.respiratoryRate >= 12 && m.respiratoryRate <= 20 ? 100 : 60
  const stressScore = 100 - m.stressIndex
  const spo2Score = m.spo2 >= 98 ? 100 : m.spo2 >= 95 ? 80 : 50
  return Math.round((hrScore * 0.25 + hrvScore * 0.25 + rrScore * 0.15 + stressScore * 0.2 + spo2Score * 0.15))
}

function normalizeHR(hr: number): number {
  return Math.round(Math.max(0, Math.min(100, ((hr - 40) / 120) * 100)))
}

function generateTrendData(currentHR: number) {
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Today']
  return days.map((day, i) => ({
    day,
    hr: i === 6 ? currentHR : currentHR + Math.round((Math.random() - 0.5) * 12),
    hrv: 38 + Math.round(Math.random() * 20) + (i === 6 ? 0 : Math.round((Math.random() - 0.5) * 8)),
  }))
}

function generateInsights(m: HealthMetrics) {
  const insights = []

  if (m.heartRate >= 60 && m.heartRate <= 85) {
    insights.push({ emoji: '💚', bg: 'bg-emerald-500/10', title: 'Healthy resting heart rate', body: `Your HR of ${m.heartRate} BPM is within the optimal resting range (60–85 BPM), indicating good cardiovascular fitness.` })
  } else if (m.heartRate > 85) {
    insights.push({ emoji: '⚠️', bg: 'bg-amber-500/10', title: 'Slightly elevated heart rate', body: `A resting HR above 85 BPM may indicate stress, dehydration, or caffeine intake. Try deep breathing and recheck in 10 minutes.` })
  }

  if (m.hrv < 35) {
    insights.push({ emoji: '😮‍💨', bg: 'bg-violet-500/10', title: 'Low HRV — rest recommended', body: `HRV of ${m.hrv}ms suggests your autonomic nervous system is under load. Prioritize sleep and reduce stressors today.` })
  } else {
    insights.push({ emoji: '⚡', bg: 'bg-violet-500/10', title: 'Good HRV — well recovered', body: `HRV of ${m.hrv}ms indicates healthy autonomic balance and good cardiovascular resilience.` })
  }

  if (m.stressIndex > 55) {
    insights.push({ emoji: '🧘', bg: 'bg-amber-500/10', title: 'Elevated stress detected', body: 'Consider a 5-minute mindfulness or box-breathing session. Chronic stress increases cardiovascular risk over time.' })
  } else {
    insights.push({ emoji: '🌿', bg: 'bg-emerald-500/10', title: 'Stress levels manageable', body: 'Your sympathovagal balance looks healthy. Maintain your current lifestyle habits.' })
  }

  if (m.spo2 >= 97) {
    insights.push({ emoji: '🫁', bg: 'bg-sky-500/10', title: 'Excellent oxygen saturation', body: `SpO₂ of ${m.spo2}% is excellent. Your lungs and circulation are delivering oxygen efficiently.` })
  }

  return insights
}
