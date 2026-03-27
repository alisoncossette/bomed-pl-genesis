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

export function VitalsCard({ handle, boloToken }: { handle: string; boloToken?: string | null }) {
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
    <section className="glass-card p-6">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#F4A63C] to-[#FFB84D] flex items-center justify-center text-sm shadow-lg">
          {'\u{1F41E}'}
        </div>
        <h3 className="text-sm font-bold text-[#9CA3AF] uppercase tracking-wider flex-1">
          Vitals
        </h3>
        <span className="text-xs font-semibold text-[#6B7280]">via Ladybug.bot</span>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <div className="flex items-center gap-3">
            <svg className="animate-spin h-5 w-5 text-[#9CA3AF]" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <span className="text-sm font-medium text-[#9CA3AF]">Loading vitals...</span>
          </div>
        </div>
      ) : vitals.length === 0 ? (
        <div className="text-center py-10">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-[#F4A63C]/10 flex items-center justify-center mb-4">
            <span className="text-3xl">{'\u{1F41E}'}</span>
          </div>
          <p className="text-base font-semibold text-white mb-1">No vitals received</p>
          <p className="text-xs text-[#9CA3AF] max-w-[280px] mx-auto">
            When Ladybug.bot takes a reading, it will appear here &mdash; if you&apos;ve granted vitals:write
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {vitals.map((vital) => (
            <div
              key={vital.id}
              className="flex items-center justify-between bg-gradient-to-r from-[#252865]/50 to-[#1E2154]/30 rounded-xl p-4 border border-white/8 shadow-md animate-fade-in"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-[#F4A63C]/20 flex items-center justify-center">
                  <span className="text-xl">
                    {VITAL_ICONS[vital.type] || '\u{1F4CA}'}
                  </span>
                </div>
                <div>
                  <p className="text-sm font-bold text-white">
                    {VITAL_LABELS[vital.type] || vital.type}
                  </p>
                  <p className="text-xs font-medium text-[#9CA3AF]">{vital.sourceName}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xl font-bold text-[#FFB84D]">
                  {vital.value}<span className="text-xs text-[#9CA3AF] ml-1.5 font-semibold">{vital.unit}</span>
                </p>
                <p className="text-xs font-medium text-[#6B7280]">
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
