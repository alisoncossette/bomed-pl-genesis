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
    <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-end justify-center">
      <div className="w-full max-w-lg bg-[#111] border-t border-white/10 rounded-t-2xl p-6 space-y-4 animate-slide-up">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">Demo Controls</h3>
          <button onClick={onClose} className="text-[#555] hover:text-white text-sm">Close</button>
        </div>

        <p className="text-xs text-[#555]">
          Simulate events for the demo video. These trigger real Bolospot relay messages.
        </p>

        {/* Access Request */}
        <div className="space-y-2">
          <p className="text-xs font-medium text-[#888]">1. Incoming Request</p>
          <button
            onClick={simulateAccessRequest}
            disabled={sending}
            className="w-full py-3 rounded-xl text-sm font-medium bg-[#eab308]/15 text-[#eab308] border border-[#eab308]/30 hover:bg-[#eab308]/25 transition-colors disabled:opacity-40"
          >
            Send Access Request from Acme PT
          </button>
        </div>

        {/* Auto-book */}
        <div className="space-y-2">
          <p className="text-xs font-medium text-[#888]">2. Agent Auto-Book</p>
          <button
            onClick={simulateAutoBook}
            disabled={sending}
            className="w-full py-3 rounded-xl text-sm font-medium bg-[#14b8a6]/15 text-[#14b8a6] border border-[#14b8a6]/30 hover:bg-[#14b8a6]/25 transition-colors disabled:opacity-40"
          >
            Auto-Book Appointment
          </button>
        </div>

        {/* Vitals */}
        <div className="space-y-2">
          <p className="text-xs font-medium text-[#888]">3. Ladybug.bot Vitals</p>
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => simulateVital('temperature')}
              disabled={sending}
              className="py-3 rounded-xl text-xs font-medium bg-[#f97316]/15 text-[#f97316] border border-[#f97316]/30 hover:bg-[#f97316]/25 transition-colors disabled:opacity-40"
            >
              {'\u{1F321}'} Temp
            </button>
            <button
              onClick={() => simulateVital('heart_rate')}
              disabled={sending}
              className="py-3 rounded-xl text-xs font-medium bg-[#ef4444]/15 text-[#ef4444] border border-[#ef4444]/30 hover:bg-[#ef4444]/25 transition-colors disabled:opacity-40"
            >
              {'\u{2764}'} HR
            </button>
            <button
              onClick={() => simulateVital('oxygen')}
              disabled={sending}
              className="py-3 rounded-xl text-xs font-medium bg-[#3b82f6]/15 text-[#3b82f6] border border-[#3b82f6]/30 hover:bg-[#3b82f6]/25 transition-colors disabled:opacity-40"
            >
              {'\u{1FAC1}'} SpO2
            </button>
          </div>
        </div>

        {status && (
          <p className={`text-xs text-center ${status.startsWith('Failed') ? 'text-[#ef4444]' : 'text-[#27d558]'}`}>
            {status}
          </p>
        )}
      </div>
    </div>
  )
}
