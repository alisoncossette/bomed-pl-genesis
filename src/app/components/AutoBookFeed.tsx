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

const EVENT_CONFIG = {
  auto_booked:     { emoji: '✅', label: 'Appointment booked',    bg: 'bg-[#f0fdf4]', dot: 'bg-[#16a34a]' },
  auto_approved:   { emoji: '🔔', label: 'Request auto-approved', bg: 'bg-[#eff6ff]', dot: 'bg-[#3b82f6]' },
  policy_blocked:  { emoji: '🚫', label: 'Blocked by policy',     bg: 'bg-[#fef2f2]', dot: 'bg-[#dc2626]' },
}

export function AutoBookFeed({ handle, boloToken }: { handle: string; boloToken?: string | null }) {
  const [events, setEvents]   = useState<AutoBookEvent[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchEvents()
    const interval = setInterval(fetchEvents, 10000)
    return () => clearInterval(interval)
  }, [handle])

  async function fetchEvents() {
    try {
      const res  = await fetch(`/api/autobook/feed?handle=${encodeURIComponent(handle)}`)
      const data = await res.json()
      setEvents(data.events || [])
    } catch { /* silent */ } finally { setLoading(false) }
  }

  return (
    <section className="bm-card overflow-hidden">
      <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-[#f1f3f8]">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-[#0d9488] animate-pulse" />
          <h3 className="text-sm font-bold text-[#02043d]">Agent Activity</h3>
        </div>
        <span className="text-[11px] font-medium text-[#0d9488]">Live</span>
      </div>

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-10 text-[#9ca3af]">
          <div className="bm-spinner bm-spinner-teal" />
          <span className="text-sm">Loading activity…</span>
        </div>
      ) : events.length === 0 ? (
        <div className="flex flex-col items-center py-10 px-6 text-center">
          <div className="w-11 h-11 rounded-xl bg-[#f4f6fb] flex items-center justify-center mb-3">
            <svg className="w-5 h-5 text-[#9ca3af]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <p className="text-sm font-semibold text-[#02043d] mb-1">No agent activity</p>
          <p className="text-xs text-[#9ca3af] leading-relaxed max-w-[220px]">
            When your provider&apos;s agent books or requests appointments, they&apos;ll appear here
          </p>
        </div>
      ) : (
        <div className="divide-y divide-[#f1f3f8]">
          {events.map(event => {
            const cfg = EVENT_CONFIG[event.type]
            return (
              <div key={event.id} className="flex items-start gap-3 p-4 animate-fade-in">
                <div className={`w-8 h-8 rounded-full ${cfg.bg} flex items-center justify-center text-sm flex-shrink-0 mt-0.5`}>
                  {cfg.emoji}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-semibold text-[#02043d]">{cfg.label}</p>
                    <span className="text-[11px] text-[#9ca3af] whitespace-nowrap flex-shrink-0">
                      {new Date(event.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-xs text-[#4b5563] mt-0.5">
                    {event.practiceName} &mdash;{' '}
                    {new Date(event.dateTime).toLocaleDateString(undefined, {
                      weekday: 'short', month: 'short', day: 'numeric',
                      hour: 'numeric', minute: '2-digit',
                    })}
                  </p>
                  {event.reason && (
                    <p className="text-[11px] text-[#9ca3af] italic mt-1">{event.reason}</p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}
