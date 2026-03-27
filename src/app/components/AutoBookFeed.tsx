'use client'

import { useState, useEffect } from 'react'

interface AutoBookEvent {
  id: string
  type: 'auto_booked' | 'auto_approved' | 'policy_blocked'
  practiceHandle: string
  practiceName: string
  dateTime: string
  duration: number
  reason: string
  timestamp: string
}

export function AutoBookFeed({ handle }: { handle: string }) {
  const [events, setEvents] = useState<AutoBookEvent[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchEvents()
    // Poll every 10s for demo effect
    const interval = setInterval(fetchEvents, 10000)
    return () => clearInterval(interval)
  }, [handle])

  async function fetchEvents() {
    try {
      const res = await fetch(`/api/autobook/feed?handle=${encodeURIComponent(handle)}`)
      const data = await res.json()
      setEvents(data.events || [])
    } catch {
      // Silent fail
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="glass-card p-6">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-2.5 h-2.5 rounded-full bg-[#285661] animate-pulse shadow-lg shadow-[#285661]/50" />
        <h3 className="text-sm font-bold text-[#9CA3AF] uppercase tracking-wider">
          Agent Activity
        </h3>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <div className="flex items-center gap-3">
            <svg className="animate-spin h-5 w-5 text-[#9CA3AF]" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <span className="text-sm font-medium text-[#9CA3AF]">Loading activity...</span>
          </div>
        </div>
      ) : events.length === 0 ? (
        <div className="text-center py-10">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-[#285661]/10 flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-[#285661]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <p className="text-base font-semibold text-white mb-1">No agent activity</p>
          <p className="text-xs text-[#9CA3AF] max-w-[280px] mx-auto">
            When your provider&apos;s agent books or requests appointments, they&apos;ll appear here
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {events.map((event) => (
            <div
              key={event.id}
              className={`rounded-2xl p-5 border shadow-lg space-y-2 ${
                event.type === 'auto_booked'
                  ? 'bg-gradient-to-br from-[#285661]/15 to-[#285661]/5 border-[#285661]/30'
                  : event.type === 'policy_blocked'
                  ? 'bg-gradient-to-br from-[#ef4444]/15 to-[#ef4444]/5 border-[#ef4444]/30'
                  : 'bg-gradient-to-br from-white/5 to-white/3 border-white/8'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-lg">
                    {event.type === 'auto_booked' && '✅'}
                    {event.type === 'auto_approved' && '🔔'}
                    {event.type === 'policy_blocked' && '🚫'}
                  </span>
                  <p className="text-sm font-bold text-white">
                    {event.type === 'auto_booked' && 'Auto-booked'}
                    {event.type === 'auto_approved' && 'Auto-approved'}
                    {event.type === 'policy_blocked' && 'Blocked by policy'}
                  </p>
                </div>
                <span className="text-xs font-medium text-[#6B7280]">
                  {new Date(event.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>

              <p className="text-sm font-medium text-[#D1D5DB]">
                {event.practiceName} &mdash;{' '}
                {new Date(event.dateTime).toLocaleDateString(undefined, {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                  hour: 'numeric',
                  minute: '2-digit',
                })}
              </p>

              {event.reason && (
                <p className="text-xs text-[#9CA3AF] italic">{event.reason}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
