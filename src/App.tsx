import { useState, useCallback } from 'react'
import LandingPage from './components/LandingPage'
import Scanner from './components/Scanner'
import ResultsPage from './components/ResultsPage'
import type { HealthMetrics } from './utils/rppg'

export type View = 'landing' | 'scan' | 'results'

export default function App() {
  const [view, setView] = useState<View>('landing')
  const [metrics, setMetrics] = useState<HealthMetrics | null>(null)

  // useCallback keeps the reference stable so Scanner's beginScan doesn't
  // get recreated on every App render (which would cause stale-closure issues)
  const handleScanComplete = useCallback((m: HealthMetrics) => {
    setMetrics(m)
    setView('results')
  }, [])

  return (
    <div className="min-h-screen bg-[#080812]">
      {view === 'landing' && <LandingPage onStart={() => setView('scan')} />}
      {view === 'scan' && (
        <Scanner
          onComplete={handleScanComplete}
          onBack={() => setView('landing')}
        />
      )}
      {view === 'results' && metrics && (
        <ResultsPage
          metrics={metrics}
          onRescan={() => setView('scan')}
          onHome={() => setView('landing')}
        />
      )}
    </div>
  )
}
