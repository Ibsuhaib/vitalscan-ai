import { Activity, Shield, Zap, Users, TrendingUp, ChevronRight, Heart, Wind, Brain, Droplets } from 'lucide-react'

interface Props {
  onStart: () => void
}

export default function LandingPage({ onStart }: Props) {
  return (
    <div className="min-h-screen bg-[#080812] text-white overflow-x-hidden">

      {/* Nav */}
      <nav className="fixed top-0 w-full z-50 border-b border-white/5 backdrop-blur-xl bg-[#080812]/80">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center">
              <Activity className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-lg tracking-tight">VitalScan<span className="text-indigo-400"> AI</span></span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm text-slate-400">
            <a href="#technology" className="hover:text-white transition-colors">Technology</a>
            <a href="#metrics" className="hover:text-white transition-colors">Metrics</a>
            <a href="#business" className="hover:text-white transition-colors">For Business</a>
            <a href="#market" className="hover:text-white transition-colors">Market</a>
          </div>
          <button
            onClick={onStart}
            className="bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium px-5 py-2.5 rounded-lg transition-all hover:shadow-lg hover:shadow-indigo-500/25"
          >
            Try Live Demo
          </button>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative pt-36 pb-28 px-6 hero-glow">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-indigo-500/10 border border-indigo-500/20 rounded-full px-4 py-2 text-sm text-indigo-300 mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse"></span>
            Seed Round — $500K–$1M · Healthcare AI
          </div>

          <h1 className="text-5xl md:text-7xl font-extrabold leading-tight mb-6 tracking-tight">
            Your face is a{' '}
            <span className="gradient-text">health dashboard</span>
          </h1>

          <p className="text-xl text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed">
            A 30-second AI face scan delivers Heart Rate, HRV, Stress, Respiratory Rate
            and SpO₂ — no hardware, no needles, no lab. Just your smartphone.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={onStart}
              className="group flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-semibold px-8 py-4 rounded-xl text-lg transition-all hover:shadow-2xl hover:shadow-indigo-500/30 hover:-translate-y-0.5"
            >
              Start Free Scan
              <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
            <a
              href="#technology"
              className="flex items-center gap-2 text-slate-400 hover:text-white font-medium px-6 py-4 rounded-xl border border-white/10 hover:border-white/20 transition-all"
            >
              See how it works
            </a>
          </div>

          {/* Stats bar */}
          <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-px bg-white/5 rounded-2xl overflow-hidden border border-white/5">
            {[
              { label: 'Scan Duration', value: '30 sec' },
              { label: 'No Hardware', value: '0 devices' },
              { label: 'Metrics Tracked', value: '5 vitals' },
              { label: 'Target Market', value: '650M+ users' },
            ].map(stat => (
              <div key={stat.label} className="bg-[#0d0d1f] px-6 py-5 text-center">
                <div className="text-2xl font-bold text-white mb-1">{stat.value}</div>
                <div className="text-sm text-slate-500">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Metrics */}
      <section id="metrics" className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">What we measure</h2>
            <p className="text-slate-400 text-lg">Clinical-grade wellness vitals from a single camera frame</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {METRICS.map((m, i) => (
              <div
                key={m.name}
                className="glass-card rounded-2xl p-6 metric-card-glow"
                style={{ animationDelay: `${i * 0.1}s` }}
              >
                <div className={`w-12 h-12 rounded-xl ${m.bgColor} flex items-center justify-center mb-4`}>
                  <m.icon className={`w-6 h-6 ${m.color}`} />
                </div>
                <h3 className="font-semibold text-lg mb-1">{m.name}</h3>
                <p className="text-slate-400 text-sm mb-3">{m.description}</p>
                <div className={`inline-flex items-center text-xs font-medium ${m.color} ${m.bgColor} rounded-full px-3 py-1`}>
                  {m.range}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Technology */}
      <section id="technology" className="py-24 px-6 bg-gradient-to-b from-transparent to-indigo-950/20">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div>
              <div className="text-indigo-400 text-sm font-semibold uppercase tracking-widest mb-4">Technology</div>
              <h2 className="text-4xl font-bold mb-6 leading-tight">rPPG + Multimodal AI</h2>
              <p className="text-slate-400 leading-relaxed mb-8">
                Remote Photoplethysmography detects subtle skin-color changes caused by pulsatile blood flow.
                Our CHROM-algorithm extracts the cardiac signal from your camera feed — then a deep learning
                pipeline fuses rPPG with facial features and anonymized metadata.
              </p>
              <div className="space-y-4">
                {TECH_POINTS.map(p => (
                  <div key={p.title} className="flex items-start gap-4">
                    <div className="w-8 h-8 rounded-lg bg-indigo-500/15 flex items-center justify-center mt-0.5 shrink-0">
                      <p.icon className="w-4 h-4 text-indigo-400" />
                    </div>
                    <div>
                      <div className="font-medium text-sm mb-0.5">{p.title}</div>
                      <div className="text-slate-400 text-sm">{p.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            {/* Signal visualization */}
            <div className="glass-card rounded-3xl p-8">
              <div className="text-xs text-slate-500 mb-3 font-mono">rPPG Signal · Green Channel</div>
              <SignalDemo />
              <div className="mt-6 grid grid-cols-3 gap-3">
                {[
                  { label: 'HR', value: '72', unit: 'BPM', color: 'text-rose-400' },
                  { label: 'HRV', value: '42', unit: 'ms', color: 'text-violet-400' },
                  { label: 'SpO₂', value: '98', unit: '%', color: 'text-cyan-400' },
                ].map(m => (
                  <div key={m.label} className="bg-white/4 rounded-xl p-3 text-center">
                    <div className="text-xs text-slate-500 mb-1">{m.label}</div>
                    <div className={`text-xl font-bold ${m.color}`}>{m.value}</div>
                    <div className="text-xs text-slate-600">{m.unit}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Business model */}
      <section id="business" className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <div className="text-indigo-400 text-sm font-semibold uppercase tracking-widest mb-4">Revenue Model</div>
            <h2 className="text-4xl font-bold mb-4">Built for B2B scale</h2>
            <p className="text-slate-400 text-lg">Embed one SDK — reach millions of users through partners</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5">
            {REVENUE_STREAMS.map(r => (
              <div key={r.title} className="glass-card rounded-2xl p-6 hover:border-indigo-500/30 transition-colors">
                <div className="text-2xl mb-3">{r.emoji}</div>
                <h3 className="font-semibold mb-2">{r.title}</h3>
                <p className="text-slate-400 text-sm mb-4">{r.desc}</p>
                <div className="text-indigo-400 font-semibold text-sm">{r.price}</div>
              </div>
            ))}
          </div>

          {/* Roadmap */}
          <div className="mt-20">
            <h3 className="text-2xl font-bold text-center mb-10">Product Roadmap</h3>
            <div className="relative">
              <div className="absolute left-0 right-0 top-8 h-px bg-gradient-to-r from-transparent via-indigo-500/40 to-transparent hidden md:block" />
              <div className="grid md:grid-cols-4 gap-6">
                {ROADMAP.map((phase, i) => (
                  <div key={phase.phase} className="relative">
                    <div className={`w-8 h-8 rounded-full mx-auto mb-4 flex items-center justify-center text-sm font-bold z-10 relative ${i === 0 ? 'bg-indigo-500 text-white' : 'bg-white/10 text-slate-400'}`}>
                      {i + 1}
                    </div>
                    <div className="glass-card rounded-xl p-4 text-center">
                      <div className="text-xs text-indigo-400 font-semibold mb-2">{phase.phase}</div>
                      <div className="text-sm font-medium mb-2">{phase.title}</div>
                      <div className="text-xs text-slate-500">{phase.timeline}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Market */}
      <section id="market" className="py-24 px-6 bg-gradient-to-b from-indigo-950/20 to-transparent">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <div className="text-indigo-400 text-sm font-semibold uppercase tracking-widest mb-4">Market Opportunity</div>
            <h2 className="text-4xl font-bold mb-4">$505B AI Healthcare by 2033</h2>
            <p className="text-slate-400 text-lg">India's digital health market alone reaches $35B by 2030</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6 mb-16">
            {MARKET_STATS.map(s => (
              <div key={s.label} className="glass-card rounded-2xl p-7 text-center">
                <div className="text-4xl font-black gradient-text mb-2">{s.value}</div>
                <div className="text-slate-300 font-medium mb-1">{s.label}</div>
                <div className="text-slate-500 text-sm">{s.sub}</div>
              </div>
            ))}
          </div>

          {/* Funding ask */}
          <div className="glass-card rounded-3xl p-10 border border-indigo-500/20 text-center">
            <div className="text-indigo-400 text-sm font-semibold uppercase tracking-widest mb-4">Seed Round</div>
            <div className="text-5xl font-black gradient-text mb-4">$500K – $1M</div>
            <p className="text-slate-400 max-w-xl mx-auto mb-8">
              Accelerate MVP launch, expand India-specific dataset, initiate clinical validation
              for Blood Pressure, and build the founding team.
            </p>
            <div className="grid sm:grid-cols-3 gap-4 max-w-2xl mx-auto mb-10">
              {FUND_ALLOCATION.map(f => (
                <div key={f.category} className="bg-white/4 rounded-xl p-4">
                  <div className="text-xl font-bold text-indigo-400 mb-1">{f.pct}</div>
                  <div className="text-xs text-slate-400">{f.category}</div>
                </div>
              ))}
            </div>
            <button
              onClick={onStart}
              className="group flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-semibold px-8 py-4 rounded-xl transition-all hover:shadow-2xl hover:shadow-indigo-500/30 mx-auto"
            >
              Experience the Demo
              <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 py-8 px-6 text-center text-slate-600 text-sm">
        <div className="flex items-center justify-center gap-2 mb-2">
          <div className="w-5 h-5 rounded bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center">
            <Activity className="w-3 h-3 text-white" />
          </div>
          <span className="text-slate-400 font-medium">VitalScan AI</span>
        </div>
        <p>Confidential — Investment Memorandum · {new Date().getFullYear()}</p>
      </footer>
    </div>
  )
}

function SignalDemo() {
  const points = Array.from({ length: 80 }, (_, i) => {
    const t = i / 80
    const cardiac = Math.sin(t * Math.PI * 7) * 0.6
    const noise = (Math.random() - 0.5) * 0.15
    return cardiac + noise
  })
  const min = Math.min(...points)
  const max = Math.max(...points)
  const norm = points.map(p => (p - min) / (max - min))
  const width = 400
  const height = 120
  const pathD = norm
    .map((y, i) => `${i === 0 ? 'M' : 'L'}${(i / 79) * width},${height - y * (height - 10) - 5}`)
    .join(' ')

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full" preserveAspectRatio="none">
      <defs>
        <linearGradient id="lineGrad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#6366f1" />
          <stop offset="100%" stopColor="#8b5cf6" />
        </linearGradient>
      </defs>
      <path d={pathD} fill="none" stroke="url(#lineGrad)" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

const METRICS = [
  { name: 'Heart Rate', description: 'Beats per minute derived from pulsatile blood-flow signal in green channel.', range: '40–200 BPM', icon: Heart, color: 'text-rose-400', bgColor: 'bg-rose-400/10' },
  { name: 'HRV', description: 'Heart Rate Variability (RMSSD) — a key biomarker for stress, recovery, and autonomic function.', range: 'RMSSD ms', icon: Activity, color: 'text-violet-400', bgColor: 'bg-violet-400/10' },
  { name: 'Respiratory Rate', description: 'Breaths per minute extracted from low-frequency rPPG signal modulation.', range: '9–25 breaths/min', icon: Wind, color: 'text-cyan-400', bgColor: 'bg-cyan-400/10' },
  { name: 'Stress Index', description: 'Mental stress derived from sympathovagal balance via HRV frequency-domain analysis.', range: '0–100 index', icon: Brain, color: 'text-amber-400', bgColor: 'bg-amber-400/10' },
  { name: 'SpO₂', description: 'Oxygen saturation estimated via ratio-of-ratios from red and blue channel signals.', range: '90–100%', icon: Droplets, color: 'text-sky-400', bgColor: 'bg-sky-400/10' },
  { name: 'Wellness Score', description: 'Composite index combining all vitals with age/gender metadata for overall health trend.', range: '0–100 score', icon: TrendingUp, color: 'text-emerald-400', bgColor: 'bg-emerald-400/10' },
]

const TECH_POINTS = [
  { icon: Zap, title: 'Edge Processing', desc: 'All AI runs on-device. Zero cloud upload required — privacy-first by design.' },
  { icon: Shield, title: 'India-First Dataset', desc: 'Trained on diverse Indian skin tones and demographics, reducing rPPG bias.' },
  { icon: Users, title: 'Multimodal Fusion', desc: 'rPPG + facial features + anonymized metadata for superior accuracy.' },
]

const REVENUE_STREAMS = [
  { emoji: '🏢', title: 'B2B SDK Licensing', desc: 'Embed our SDK into enterprise apps — insurance, hospitals, telemedicine.', price: '$5K–$50K / month' },
  { emoji: '🔗', title: 'Per-Scan API', desc: 'Pay-as-you-go API calls for apps and platforms at any scale.', price: '$0.50–$2.00 / scan' },
  { emoji: '💼', title: 'Corporate Wellness', desc: 'Employee health monitoring dashboard for HR departments.', price: '$2–$5 / employee / month' },
  { emoji: '🏥', title: 'Insurance Integration', desc: 'Wellness scoring for dynamic premium pricing and underwriting.', price: 'Revenue share' },
]

const ROADMAP = [
  { phase: 'MVP · Now', title: 'HR, HRV, RR, Stress', timeline: 'Months 1–6' },
  { phase: 'V2', title: 'Blood Pressure + Diabetes Risk', timeline: 'Months 7–18' },
  { phase: 'V3 · CDSCO', title: 'Hemoglobin & HbA1c', timeline: 'Months 19–36' },
  { phase: 'V4 · FDA/CE', title: 'Global Clinical Grade', timeline: 'Months 37–48' },
]

const MARKET_STATS = [
  { value: '$505B', label: 'AI Healthcare by 2033', sub: 'Global market size' },
  { value: '$35B', label: 'Indian Digital Health', sub: 'By 2030' },
  { value: '650M+', label: 'Indian Smartphone Users', sub: 'Addressable market' },
]

const FUND_ALLOCATION = [
  { pct: '35%', category: 'Product Development' },
  { pct: '25%', category: 'Clinical Validation' },
  { pct: '20%', category: 'Team Hiring' },
  { pct: '10%', category: 'Cloud Infrastructure' },
  { pct: '5%', category: 'Legal & Compliance' },
  { pct: '5%', category: 'Marketing & GTM' },
]
