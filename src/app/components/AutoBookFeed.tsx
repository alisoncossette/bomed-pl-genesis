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
    <section className="glass-card p-5">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-2 h-2 rounded-full bg-[#285661] animate-pulse" />
        <h3 className="text-sm font-semibold text-[#888] uppercase tracking-wider">
          Agent Activity
        </h3>
      </div>

      {loading ? (
        <div className="animate-pulse text-sm text-[#555] text-center py-6">Loading...</div>
      ) : events.length === 0 ? (
        <div className="text-center py-6">
          <p className="text-sm text-[#555]">No agent activity yet</p>
          <p className="text-xs text-[#444] mt-1">
            When your provider&#39;s agent books or requests appointments, they&#39;ll appear here
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {events.map((event) => (
            <div
              key={event.id}
              className={`rounded-xl p-4 border space-y-1 ${
                event.type === 'auto_booked'
                  ? 'bg-[#285661]/5 border-[#285661]/20'
                  : event.type === 'policy_blocked'
                  ? 'bg-[#ef4444]/5 border-[#ef4444]/20'
                  : 'bg-white/3 border-white/5'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm">
                    {event.type === 'auto_booked' && '&#9989;'}
                    {event.type === 'auto_approved' && '&#128276;'}
                    {event.type === 'policy_blocked' && '&#128683;'}
                  </span>
                  <p className="text-sm font-medium text-white">
                    {event.type === 'auto_booked' && 'Auto-booked'}
                    {event.type === 'auto_approved' && 'Auto-approved'}
                    {event.type === 'policy_blocked' && 'Blocked by policy'}
                  </p>
                </div>
                <span className="text-xs text-[#555]">
                  {new Date(event.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>

              <p className="text-sm text-[#888]">
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
                <p className="text-xs text-[#555]">{event.reason}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
