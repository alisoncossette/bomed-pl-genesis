'use client'

import { useState, useEffect } from 'react'

interface VitalReading {
  id: string
  source: string
  sourceName: string
  type: 'temperature' | 'heart_rate' | 'blood_pressure' | 'oxygen'
  value: string
  unit: string
  timestamp: string
}

const VITAL_ICONS: Record<string, string> = {
  temperature: '\u{1F321}',
  heart_rate: '\u{2764}',
  blood_pressure: '\u{1FA78}',
  oxygen: '\u{1FAC1}',
}

const VITAL_LABELS: Record<string, string> = {
  temperature: 'Temperature',
  heart_rate: 'Heart Rate',
  blood_pressure: 'Blood Pressure',
  oxygen: 'SpO2',
}

export function VitalsCard({ handle }: { handle: string }) {
  const [vitals, setVitals] = useState<VitalReading[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchVitals()
    const interval = setInterval(fetchVitals, 8000)
    return () => clearInterval(interval)
  }, [handle])

  async function fetchVitals() {
    try {
      const res = await fetch(`/api/vitals?handle=${encodeURIComponent(handle)}`)
      const data = await res.json()
      setVitals(data.vitals || [])
    } catch {
      // Silent fail
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="glass-card p-5">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-6 h-6 rounded-full bg-[#F4A63C]/20 flex items-center justify-center text-xs">
          {'\u{1F41E}'}
        </div>
        <h3 className="text-sm font-semibold text-[#888] uppercase tracking-wider">
          Vitals
        </h3>
        <span className="text-xs text-[#555] ml-auto">via Ladybug.bot</span>
      </div>

      {loading ? (
        <div className="animate-pulse text-sm text-[#555] text-center py-6">Loading...</div>
      ) : vitals.length === 0 ? (
        <div className="text-center py-6">
          <p className="text-sm text-[#555]">No vitals received</p>
          <p className="text-xs text-[#444] mt-1">
            When Ladybug.bot takes a reading, it will appear here &mdash; if you&apos;ve granted vitals:write
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {vitals.map((vital) => (
            <div
              key={vital.id}
              className="flex items-center justify-between bg-white/3 rounded-xl p-3 border border-white/5 animate-fade-in"
            >
              <div className="flex items-center gap-3">
                <span className="text-lg">
                  {VITAL_ICONS[vital.type] || '\u{1F4CA}'}
                </span>
                <div>
                  <p className="text-sm font-medium text-white">
                    {VITAL_LABELS[vital.type] || vital.type}
                  </p>
                  <p className="text-xs text-[#555]">{vital.sourceName}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-lg font-semibold text-[#F4A63C]">
                  {vital.value}<span className="text-xs text-[#888] ml-1">{vital.unit}</span>
                </p>
                <p className="text-xs text-[#555]">
                  {new Date(vital.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
