'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import QRCode from 'qrcode'

type Grant = {
  id: string
  granterHandle: string
  scopes: string[]
  expiresAt: string | null
  createdAt: string
}

export default function PracticeDashboard() {
  const params = useParams()
  const router = useRouter()
  const handle = params.handle as string
  const [grants, setGrants] = useState<Grant[]>([])
  const [prevGrantIds, setPrevGrantIds] = useState<Set<string>>(new Set())
  const [fadingOutIds, setFadingOutIds] = useState<Set<string>>(new Set())

  const practiceName = handle === 'greenfieldpt' ? 'Greenfield PT' : handle
  const [qrDataUrl, setQrDataUrl] = useState<string>('')
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://world.bomed.ai'
  const qrUrl = `${appUrl}?practice=${handle}&scopes=appointments:read,appointments:book,patients:read`

  useEffect(() => {
    QRCode.toDataURL(qrUrl, { width: 200, margin: 1, color: { dark: '#02043d', light: '#ffffff' } })
      .then(setQrDataUrl)
      .catch(console.error)
  }, [qrUrl])

  useEffect(() => {
    fetchGrants()
    const interval = setInterval(fetchGrants, 3000)
    return () => clearInterval(interval)
  }, [])

  async function fetchGrants() {
    try {
      const res = await fetch('/api/practice/grants')
      const data = await res.json()
      const newGrants = data.grants || []

      // Detect removed grants
      const newIds = new Set<string>(newGrants.map((g: Grant) => g.id))
      const removed = Array.from(prevGrantIds).filter(id => !newIds.has(id))

      if (removed.length > 0) {
        setFadingOutIds(new Set(removed))
        setTimeout(() => {
          setGrants(newGrants)
          setFadingOutIds(new Set())
          setPrevGrantIds(newIds)
        }, 600) // Match CSS transition duration
      } else {
        setGrants(newGrants)
        setPrevGrantIds(newIds)
      }
    } catch (error) {
      console.error('Failed to fetch grants:', error)
    }
  }

  function scopeIcon(scope: string) {
    if (scope.startsWith('appointments')) return '📅'
    if (scope.startsWith('demographics')) return '👤'
    if (scope.startsWith('vitals')) return '💓'
    if (scope.startsWith('lab')) return '🔬'
    if (scope.startsWith('medications')) return '💊'
    if (scope.startsWith('patients')) return '👥'
    return '📋'
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-[#f9fafb] to-[#f3f4f6]">
      {/* Header */}
      <header className="bg-white border-b border-[#e5e7eb] shadow-sm">
        <div className="max-w-6xl mx-auto px-6 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-[#0d9488] to-[#14b8a6] rounded-xl flex items-center justify-center text-white text-2xl shadow-md">
                🏥
              </div>
              <div>
                <h1 className="text-2xl font-bold text-[#02043d]">{practiceName}</h1>
                <p className="text-sm text-[#6b7280]">Live Patient Access Dashboard</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 px-3 py-2 bg-[#dcfce7] border border-[#86efac] rounded-lg">
                <div className="w-2 h-2 rounded-full bg-[#22c55e] animate-pulse" />
                <span className="text-sm font-semibold text-[#166534]">Live</span>
              </div>
              <Link
                href={`/practice/${handle}/qr`}
                className="px-4 py-2 bg-[#0d9488] text-white text-sm font-semibold rounded-lg hover:bg-[#0f766e] transition-colors"
              >
                View QR Code
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-6 py-8 flex gap-6">
        {/* QR Panel */}
        <div className="w-56 flex-shrink-0 print:block">
          <div className="bg-white rounded-xl border border-[#e5e7eb] shadow-sm p-4 sticky top-6 text-center">
            <p className="text-xs font-semibold text-[#6b7280] uppercase tracking-wide mb-3">New Patient</p>
            {qrDataUrl ? (
              <img src={qrDataUrl} alt="Patient QR" className="w-full rounded-lg border border-[#e5e7eb]" />
            ) : (
              <div className="w-full aspect-square bg-[#f3f4f6] rounded-lg animate-pulse" />
            )}
            <p className="text-xs text-[#6b7280] mt-3 leading-relaxed">Scan with World App to connect your BoMed identity</p>
            <Link
              href={`/practice/${handle}/qr`}
              target="_blank"
              className="mt-3 inline-block text-xs text-[#0d9488] font-semibold hover:underline"
            >
              Print full-size →
            </Link>
          </div>
        </div>

        {/* Grants */}
        <div className="flex-1">
          {grants.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="w-20 h-20 rounded-2xl bg-white border border-[#e5e7eb] flex items-center justify-center mb-5 shadow-sm">
                <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-[#f3f4f6] to-[#e5e7eb] flex items-center justify-center animate-pulse">
                  <svg className="w-8 h-8 text-[#9ca3af]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
              </div>
              <h2 className="text-xl font-bold text-[#02043d] mb-2">Waiting for patients...</h2>
              <p className="text-sm text-[#6b7280] text-center max-w-md">
                When patients scan your QR code and grant access, they'll appear here in real-time
              </p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {grants.map(grant => (
                <div
                  key={grant.id}
                  className={`bg-white rounded-xl border border-[#e5e7eb] p-5 shadow-sm hover:shadow-md transition-all ${
                    fadingOutIds.has(grant.id) ? 'opacity-0 scale-95' : 'opacity-100 scale-100'
                  }`}
                  style={{ transition: 'all 0.6s ease-out' }}
                >
                  {/* Patient handle */}
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#0d9488] to-[#14b8a6] flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                      {grant.granterHandle?.replace('@', '').slice(0, 2).toUpperCase() || '??'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-base font-bold text-[#02043d] truncate">
                        {grant.granterHandle ? `@${grant.granterHandle}` : 'Unknown'}
                      </p>
                      <p className="text-xs text-[#9ca3af]">
                        {new Date(grant.createdAt).toLocaleString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          hour: 'numeric',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                    <div className="w-2 h-2 rounded-full bg-[#22c55e] flex-shrink-0" />
                  </div>

                  {/* Scopes */}
                  <div>
                    <p className="text-[10px] font-semibold text-[#9ca3af] uppercase tracking-wide mb-2">
                      Granted Access
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {grant.scopes.map(scope => (
                        <div
                          key={scope}
                          className="flex items-center gap-1.5 px-2.5 py-1.5 bg-[#f0fdf4] border border-[#bbf7d0] rounded-lg"
                        >
                          <span className="text-sm">{scopeIcon(scope)}</span>
                          <span className="text-xs font-medium text-[#166534]">
                            {scope.split(':')[0]}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Expiration */}
                  {grant.expiresAt && (
                    <div className="mt-3 pt-3 border-t border-[#f1f3f8]">
                      <p className="text-xs text-[#9ca3af]">
                        Expires {new Date(grant.expiresAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Footer stats */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-[#e5e7eb] shadow-lg">
        <div className="max-w-6xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-[#22c55e]" />
              <span className="text-sm font-medium text-[#02043d]">
                {grants.length} {grants.length === 1 ? 'patient' : 'patients'} connected
              </span>
            </div>
          </div>
          <p className="text-xs text-[#9ca3af]">Updates every 3 seconds</p>
        </div>
      </div>
    </main>
  )
}
