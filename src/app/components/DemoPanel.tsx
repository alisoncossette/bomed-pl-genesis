'use client'

import { useState } from 'react'

// Hidden demo control panel — triggered by tapping the logo 5 times
// Used during video recording to simulate events
export function DemoPanel({ handle, onClose }: { handle: string; onClose: () => void }) {
  const [status, setStatus] = useState<string | null>(null)
  const [sending, setSending] = useState(false)

  async function simulateAutoBook() {
    setSending(true)
    setStatus(null)
    try {
      const res = await fetch('/api/demo/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientHandle: handle,
          practiceName: 'Acme Physical Therapy',
          practiceHandle: '@acmept',
        }),
      })
      const data = await res.json()
      setStatus(data.success ? 'Auto-book sent!' : 'Failed: ' + data.error)
    } catch {
      setStatus('Network error')
    } finally {
      setSending(false)
    }
  }

  async function simulateVital(type: string) {
    setSending(true)
    setStatus(null)
    try {
      const res = await fetch('/api/demo/vitals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientHandle: handle,
          vitalType: type,
        }),
      })
      const data = await res.json()
      setStatus(data.success ? `${type} reading sent!` : 'Failed: ' + data.error)
    } catch {
      setStatus('Network error')
    } finally {
      setSending(false)
    }
  }

  async function simulateAccessRequest() {
    setSending(true)
    setStatus(null)
    try {
      const res = await fetch('/api/demo/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientHandle: handle,
        }),
      })
      const data = await res.json()
      setStatus(data.success ? 'Access request sent!' : 'Failed: ' + (data.error || 'unknown'))
    } catch {
      setStatus('Network error')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[100] bg-black/85 backdrop-blur-md flex items-end justify-center">
      <div className="w-full max-w-lg bg-gradient-to-b from-[#1E2154] to-[#141440] border-t-2 border-[#285661]/50 rounded-t-3xl p-6 space-y-5 animate-slide-up shadow-2xl">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-extrabold text-white uppercase tracking-wider">Demo Controls</h3>
          <button onClick={onClose} className="text-[#9CA3AF] hover:text-white text-sm font-semibold transition-colors">Close</button>
        </div>

        <p className="text-xs text-[#9CA3AF] leading-relaxed">
          Simulate events for the demo video. These trigger real Bolospot relay messages.
        </p>

        {/* Access Request */}
        <div className="space-y-3">
          <p className="text-xs font-bold text-[#9CA3AF] uppercase tracking-wide">1. Incoming Request</p>
          <button
            onClick={simulateAccessRequest}
            disabled={sending}
            className="w-full py-3.5 rounded-xl text-sm font-bold bg-gradient-to-r from-[#eab308]/20 to-[#eab308]/10 text-[#eab308] border-2 border-[#eab308]/40 hover:border-[#eab308]/60 hover:bg-[#eab308]/30 transition-all disabled:opacity-40 shadow-lg"
          >
            Send Access Request from Acme PT
          </button>
        </div>

        {/* Auto-book */}
        <div className="space-y-3">
          <p className="text-xs font-bold text-[#9CA3AF] uppercase tracking-wide">2. Agent Auto-Book</p>
          <button
            onClick={simulateAutoBook}
            disabled={sending}
            className="w-full py-3.5 rounded-xl text-sm font-bold bg-gradient-to-r from-[#285661]/20 to-[#3A7D8F]/10 text-[#94C7E0] border-2 border-[#285661]/40 hover:border-[#285661]/60 hover:bg-[#285661]/30 transition-all disabled:opacity-40 shadow-lg"
          >
            Auto-Book Appointment
          </button>
        </div>

        {/* Vitals */}
        <div className="space-y-3">
          <p className="text-xs font-bold text-[#9CA3AF] uppercase tracking-wide">3. Ladybug.bot Vitals</p>
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => simulateVital('temperature')}
              disabled={sending}
              className="py-3.5 rounded-xl text-xs font-bold bg-gradient-to-b from-[#F4A63C]/20 to-[#F4A63C]/10 text-[#FFB84D] border-2 border-[#F4A63C]/40 hover:border-[#F4A63C]/60 hover:bg-[#F4A63C]/30 transition-all disabled:opacity-40 shadow-md"
            >
              {'\u{1F321}'} Temp
            </button>
            <button
              onClick={() => simulateVital('heart_rate')}
              disabled={sending}
              className="py-3.5 rounded-xl text-xs font-bold bg-gradient-to-b from-[#ef4444]/20 to-[#ef4444]/10 text-[#f87171] border-2 border-[#ef4444]/40 hover:border-[#ef4444]/60 hover:bg-[#ef4444]/30 transition-all disabled:opacity-40 shadow-md"
            >
              {'\u{2764}'} HR
            </button>
            <button
              onClick={() => simulateVital('oxygen')}
              disabled={sending}
              className="py-3.5 rounded-xl text-xs font-bold bg-gradient-to-b from-[#3b82f6]/20 to-[#3b82f6]/10 text-[#60a5fa] border-2 border-[#3b82f6]/40 hover:border-[#3b82f6]/60 hover:bg-[#3b82f6]/30 transition-all disabled:opacity-40 shadow-md"
            >
              {'\u{1FAC1}'} SpO2
            </button>
          </div>
        </div>

        {status && (
          <div className={`text-center px-4 py-3 rounded-xl ${status.startsWith('Failed') ? 'bg-[#ef4444]/20 border border-[#ef4444]/40' : 'bg-[#10b981]/20 border border-[#10b981]/40'}`}>
            <p className={`text-sm font-bold ${status.startsWith('Failed') ? 'text-[#ef4444]' : 'text-[#10b981]'}`}>
              {status}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
