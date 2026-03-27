'use client'

import { useState, useEffect } from 'react'
import { MiniKit, VerifyCommandInput, VerificationLevel } from '@worldcoin/minikit-js'
import { PolicyControls, DEFAULT_POLICY, type Policy } from './components/PolicyControls'
import { AutoBookFeed } from './components/AutoBookFeed'
import { VitalsCard } from './components/VitalsCard'
import { DemoPanel } from './components/DemoPanel'

type Step = 'welcome' | 'verifying' | 'handle' | 'dashboard'

export default function Home() {
  const [step, setStep] = useState<Step>('welcome')
  const [verified, setVerified] = useState(false)
  const [nullifierHash, setNullifierHash] = useState<string | null>(null)
  const [handle, setHandle] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [handleInput, setHandleInput] = useState('')
  const [handleError, setHandleError] = useState('')
  const [handleLoading, setHandleLoading] = useState(false)
  const [isMiniApp, setIsMiniApp] = useState(false)

  useEffect(() => {
    setIsMiniApp(MiniKit.isInstalled())
  }, [])

  // Auto-generate suggested handle from name (must be at top level, not inside conditional)
  const suggestedHandle = firstName && lastName
    ? `${firstName}${lastName}`.toLowerCase().replace(/\s+/g, '')
    : ''

  useEffect(() => {
    if (suggestedHandle && !handleInput) {
      setHandleInput(suggestedHandle)
    }
  }, [suggestedHandle])

  async function handleVerify() {
    setStep('verifying')

    if (!MiniKit.isInstalled()) {
      // Dev/demo mode — simulate verification
      await new Promise(r => setTimeout(r, 1500))
      setNullifierHash('dev_' + Math.random().toString(36).slice(2))
      setVerified(true)
      setStep('handle')
      return
    }

    try {
      const verifyPayload: VerifyCommandInput = {
        action: process.env.NEXT_PUBLIC_WORLD_ACTION || 'verify-patient',
        verification_level: VerificationLevel.Orb,
      }

      const { finalPayload } = await MiniKit.commandsAsync.verify(verifyPayload)

      if (finalPayload.status === 'error') {
        setStep('welcome')
        return
      }

      // Verify on backend
      const res = await fetch('/api/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          payload: finalPayload,
          action: verifyPayload.action,
        }),
      })

      const data = await res.json()

      if (data.verified) {
        setNullifierHash(data.nullifier_hash)
        setVerified(true)

        // Check if they already have a handle linked
        if (data.handle) {
          setHandle(data.handle)
          setStep('dashboard')
        } else {
          setStep('handle')
        }
      } else {
        setStep('welcome')
      }
    } catch {
      setStep('welcome')
    }
  }

  async function handleLinkHandle() {
    setHandleError('')
    setHandleLoading(true)

    let cleanHandle = handleInput.startsWith('@') ? handleInput : `@${handleInput}`
    let attempt = 0
    const maxAttempts = 10
    const baseHandle = cleanHandle.replace(/\d+$/, '') // Remove trailing numbers if any

    while (attempt < maxAttempts) {
      const tryHandle = attempt === 0 ? cleanHandle : `${baseHandle}${attempt + 1}`

      try {
        const res = await fetch('/api/handle/link', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            handle: tryHandle,
            nullifierHash,
          }),
        })

        const data = await res.json()

        if (data.success) {
          setHandle(data.handle)
          setStep('dashboard')
          return
        } else if (data.error?.includes('already exists') || data.error?.includes('taken') || data.error?.includes('conflict')) {
          // Handle is taken, try next variation
          attempt++
          continue
        } else {
          // Other error, show it
          setHandleError(data.error || 'Could not link handle')
          setHandleLoading(false)
          return
        }
      } catch {
        setHandleError('Network error. Please try again.')
        setHandleLoading(false)
        return
      }
    }

    // Tried all variations, still failed
    setHandleError('Handle is taken. Please try a different one.')
    setHandleLoading(false)
  }

  // Welcome / Verify screen
  if (step === 'welcome' || step === 'verifying') {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center px-6 py-10">
        <div className="w-full max-w-sm mx-auto text-center space-y-10">
          {/* Logo badge - enhanced with more visual punch */}
          <div className="space-y-5">
            <div className="relative inline-block">
              <div className="absolute inset-0 bg-[#F4A63C]/20 blur-2xl rounded-full scale-150" />
              <div className="relative w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-white to-[#F0F2F5] p-2 shadow-2xl">
                <img src="/logo-icon.png" alt="BoMed" className="w-full h-full object-contain" />
              </div>
            </div>
            <div className="space-y-2">
              <h1 className="text-5xl font-extrabold text-white leading-tight tracking-tight">
                BoMed
              </h1>
              <p className="text-lg font-medium text-[#9CA3AF]">Patient Identity Portal</p>
            </div>
          </div>

          {/* Explainer Card - improved spacing and hierarchy */}
          <div className="glass-card p-6 space-y-6">
            <p className="text-[15px] text-[#D1D5DB] leading-relaxed text-left font-normal">
              BoMed uses Bolospot to connect your verified identity to your healthcare providers — like Stripe connects your bank to merchants. Your @handle is your address. Providers request access, you approve it. Nothing moves without your say-so.
            </p>
            <div className="space-y-4 text-left">
              <div className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full bg-[#F4A63C] flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-white text-xs font-bold">✓</span>
                </div>
                <span className="text-[15px] text-[#D1D5DB] leading-relaxed">Proof of personhood — no passwords</span>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full bg-[#F4A63C] flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-white text-xs font-bold">✓</span>
                </div>
                <span className="text-[15px] text-[#D1D5DB] leading-relaxed">Scoped permissions — share only what you choose</span>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full bg-[#F4A63C] flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-white text-xs font-bold">✓</span>
                </div>
                <span className="text-[15px] text-[#D1D5DB] leading-relaxed">Instant revocation — always in control</span>
              </div>
            </div>
          </div>

          {/* Verify button - premium design with glow */}
          <button
            onClick={handleVerify}
            disabled={step === 'verifying'}
            className="w-full px-6 py-4 rounded-xl font-bold text-base text-white bg-gradient-to-r from-[#285661] to-[#3A7D8F] hover:from-[#3A7D8F] hover:to-[#285661] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed btn-glow-teal"
          >
            {step === 'verifying' ? (
              <span className="flex items-center justify-center gap-3">
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Verifying identity...
              </span>
            ) : (
              'Verify with World ID'
            )}
          </button>

          {!isMiniApp && (
            <div className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-[#F4A63C]/10 border border-[#F4A63C]/30">
              <div className="w-2 h-2 rounded-full bg-[#F4A63C] animate-pulse" />
              <p className="text-xs font-medium text-[#FFB84D]">
                Demo mode — running outside World App
              </p>
            </div>
          )}
        </div>
      </main>
    )
  }

  // Handle linking screen
  if (step === 'handle') {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center px-6 py-10">
        <div className="w-full max-w-sm mx-auto space-y-8">
          {/* Verified badge - more prominent */}
          <div className="text-center space-y-5">
            <div className="relative inline-block">
              <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-[#F4A63C] to-[#FFB84D] flex items-center justify-center pulse-orange shadow-2xl">
                <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
            </div>
            <div className="space-y-2">
              <h2 className="text-3xl font-bold text-white">Identity Verified</h2>
              <p className="text-base font-medium text-[#9CA3AF]">Choose your Bolospot handle</p>
            </div>
          </div>

          {/* Name inputs and Handle input */}
          <div className="glass-card p-6 space-y-6">
            {/* Name inputs */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-semibold text-[#9CA3AF] mb-2">
                  First name
                </label>
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => {
                    setFirstName(e.target.value)
                    setHandleError('')
                  }}
                  placeholder="Alison"
                  className="w-full px-4 py-3 bg-[#141440] border border-white/10 rounded-lg text-white font-medium placeholder-[#9CA3AF]/40 focus:outline-none focus:border-[#F4A63C] focus:ring-2 focus:ring-[#F4A63C]/20 transition-all"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-[#9CA3AF] mb-2">
                  Last name
                </label>
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => {
                    setLastName(e.target.value)
                    setHandleError('')
                  }}
                  placeholder="Park"
                  className="w-full px-4 py-3 bg-[#141440] border border-white/10 rounded-lg text-white font-medium placeholder-[#9CA3AF]/40 focus:outline-none focus:border-[#F4A63C] focus:ring-2 focus:ring-[#F4A63C]/20 transition-all"
                />
              </div>
            </div>

            {/* Handle input */}
            <div>
              <label className="block text-sm font-semibold text-[#9CA3AF] mb-2">
                Your @handle
              </label>
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#9CA3AF] font-semibold">@</span>
                  <input
                    type="text"
                    value={handleInput}
                    onChange={(e) => {
                      setHandleInput(e.target.value.replace(/^@/, ''))
                      setHandleError('')
                    }}
                    placeholder="yourhandle"
                    className="w-full pl-9 pr-4 py-3 bg-[#141440] border border-white/10 rounded-lg text-white font-medium placeholder-[#9CA3AF]/40 focus:outline-none focus:border-[#F4A63C] focus:ring-2 focus:ring-[#F4A63C]/20 transition-all"
                  />
                </div>
              </div>
              {handleInput && (
                <p className="text-sm text-[#9CA3AF] mt-2">
                  Your handle will be <span className="font-semibold text-[#FFB84D]">@{handleInput}</span> — change it if you like
                </p>
              )}
            </div>

            {handleError && (
              <div className="px-4 py-3 rounded-lg bg-[#ef4444]/10 border border-[#ef4444]/30">
                <p className="text-sm font-medium text-[#ef4444]">{handleError}</p>
              </div>
            )}

            <p className="text-sm text-[#D1D5DB] leading-relaxed">
              This creates your Bolospot identity, verified by World ID.
              Healthcare providers will send permission requests here.
            </p>
          </div>

          <button
            onClick={handleLinkHandle}
            disabled={!handleInput.trim() || handleLoading}
            className="w-full px-6 py-4 rounded-xl font-bold text-base text-white bg-gradient-to-r from-[#285661] to-[#3A7D8F] hover:from-[#3A7D8F] hover:to-[#285661] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed btn-glow-teal"
          >
            {handleLoading ? (
              <span className="flex items-center justify-center gap-3">
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Creating identity...
              </span>
            ) : (
              'Create & Link Handle'
            )}
          </button>
        </div>
      </main>
    )
  }

  // Dashboard — redirect to dashboard page
  if (step === 'dashboard') {
    return <Dashboard handle={handle} nullifierHash={nullifierHash} />
  }

  return null
}

// Inline dashboard component
function Dashboard({ handle, nullifierHash }: { handle: string; nullifierHash: string | null }) {
  const [showDemo, setShowDemo] = useState(false)
  const [tapCount, setTapCount] = useState(0)

  function handleLogoTap() {
    const next = tapCount + 1
    setTapCount(next)
    if (next >= 5) {
      setShowDemo(true)
      setTapCount(0)
    }
    // Reset after 2s of no taps
    setTimeout(() => setTapCount(0), 2000)
  }

  return (
    <main className="min-h-screen pb-24">
      {/* Header - Identity Card Design */}
      <header className="sticky top-0 z-50 bg-gradient-to-b from-[#141440] to-[#141440]/95 backdrop-blur-xl border-b border-white/12 shadow-lg">
        <div className="max-w-sm mx-auto px-6 py-5">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="absolute inset-0 bg-[#F4A63C]/30 blur-lg rounded-xl" />
              <div className="relative w-12 h-12 rounded-xl bg-gradient-to-br from-white to-[#F0F2F5] p-1.5 cursor-pointer select-none shadow-xl" onClick={handleLogoTap}>
                <img src="/logo-icon.png" alt="BoMed" className="w-full h-full object-contain" />
              </div>
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <p className="text-base font-bold text-white">{handle}</p>
                <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#F4A63C]/20 border border-[#F4A63C]/40">
                  <svg className="w-3 h-3 text-[#FFB84D]" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="text-xs font-bold text-[#FFB84D]">Verified</span>
                </div>
              </div>
              <p className="text-xs font-medium text-[#9CA3AF] mt-0.5">World ID Patient</p>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-sm mx-auto px-6 py-8 space-y-6">
        {/* Agent Activity Feed */}
        <AutoBookFeed handle={handle} />

        {/* Pending Requests */}
        <PendingRequests handle={handle} />

        {/* Active Grants */}
        <ActiveGrants handle={handle} />

        {/* Vitals from Ladybug.bot */}
        <VitalsCard handle={handle} />

        {/* Appointments */}
        <Appointments handle={handle} />
      </div>

      {/* Demo panel — tap logo 5x to open */}
      {showDemo && <DemoPanel handle={handle} onClose={() => setShowDemo(false)} />}
    </main>
  )
}

// Pending bolo requests section
function PendingRequests({ handle }: { handle: string }) {
  const [requests, setRequests] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchRequests()
  }, [handle])

  async function fetchRequests() {
    try {
      const res = await fetch(`/api/requests?handle=${encodeURIComponent(handle)}`)
      const data = await res.json()
      setRequests(data.requests || [])
    } catch {
      // Silent fail
    } finally {
      setLoading(false)
    }
  }

  async function handleRespond(requestId: string, approved: boolean, scopes: string[], policy?: Policy) {
    try {
      await fetch('/api/requests/respond', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId, approved, scopes, handle, policy }),
      })
      fetchRequests()
    } catch {
      // Silent fail
    }
  }

  if (loading) {
    return (
      <section className="glass-card p-6">
        <h3 className="text-sm font-bold text-[#9CA3AF] uppercase tracking-wider mb-5">
          Incoming Requests
        </h3>
        <div className="flex items-center justify-center py-8">
          <div className="flex items-center gap-3">
            <svg className="animate-spin h-5 w-5 text-[#9CA3AF]" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <span className="text-sm font-medium text-[#9CA3AF]">Loading requests...</span>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className="glass-card p-6">
      <h3 className="text-sm font-bold text-[#9CA3AF] uppercase tracking-wider mb-5">
        Incoming Requests
      </h3>
      {requests.length === 0 ? (
        <div className="text-center py-10">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-[#FFB84D]/10 flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-[#F4A63C]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
            </svg>
          </div>
          <p className="text-base font-semibold text-white mb-1">All clear</p>
          <p className="text-sm text-[#9CA3AF]">
            No pending permission requests
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {requests.map((req) => (
            <RequestCard
              key={req.id}
              request={req}
              onRespond={handleRespond}
            />
          ))}
        </div>
      )}
    </section>
  )
}

function RequestCard({
  request,
  onRespond,
}: {
  request: any
  onRespond: (id: string, approved: boolean, scopes: string[], policy?: Policy) => void
}) {
  const [selectedScopes, setSelectedScopes] = useState<Set<string>>(
    new Set(request.scopes || [])
  )
  const [policy, setPolicy] = useState<Policy>(DEFAULT_POLICY)

  function toggleScope(scope: string) {
    const next = new Set(selectedScopes)
    if (next.has(scope)) next.delete(scope)
    else next.add(scope)
    setSelectedScopes(next)
  }

  const hasAppointmentScopes = Array.from(selectedScopes).some(
    (s) => s.startsWith('appointments:')
  )

  return (
    <div className="relative bg-gradient-to-br from-[#252865] to-[#1E2154] rounded-2xl p-5 border border-white/12 shadow-lg space-y-4 trust-indicator">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <p className="text-base font-bold text-white">{request.fromName || request.fromHandle}</p>
          </div>
          <p className="text-xs font-semibold text-[#9CA3AF] uppercase tracking-wide">{request.widgetName || request.widget}</p>
        </div>
        <span className="badge-pending text-xs px-3 py-1.5 rounded-full whitespace-nowrap">
          Pending
        </span>
      </div>

      {request.reason && (
        <div className="px-4 py-3 rounded-xl bg-[#141440] border border-white/8">
          <p className="text-sm text-[#D1D5DB] italic leading-relaxed">&ldquo;{request.reason}&rdquo;</p>
        </div>
      )}

      {/* Scope toggles */}
      <div className="space-y-3">
        <p className="text-sm text-[#9CA3AF] font-bold uppercase tracking-wide">Requested access:</p>
        <div className="space-y-2.5">
          {(request.scopes || []).map((scope: string) => (
            <label key={scope} className="flex items-center gap-3 cursor-pointer group">
              <input
                type="checkbox"
                checked={selectedScopes.has(scope)}
                onChange={() => toggleScope(scope)}
                className="accent-[#F4A63C] w-4 h-4 rounded"
              />
              <span className="text-sm font-medium text-[#F0F2F5] group-hover:text-white transition-colors">
                {scope.replace(/[_:]/g, ' ')}
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* Policy controls — shown when appointment scopes are selected */}
      <PolicyControls
        policy={policy}
        onChange={setPolicy}
        scopeHasAppointments={hasAppointmentScopes}
      />

      {/* Action buttons */}
      <div className="flex gap-3 pt-2">
        <button
          onClick={() => onRespond(request.id, true, Array.from(selectedScopes), policy)}
          disabled={selectedScopes.size === 0}
          className="flex-1 px-5 py-3 rounded-xl text-sm font-bold bg-gradient-to-r from-[#285661] to-[#3A7D8F] text-white hover:from-[#3A7D8F] hover:to-[#285661] transition-all shadow-lg disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Grant Access
        </button>
        <button
          onClick={() => onRespond(request.id, false, [])}
          className="flex-1 px-5 py-3 rounded-xl text-sm font-bold bg-transparent text-[#ef4444] border-2 border-[#ef4444] hover:bg-[#ef4444]/10 transition-all"
        >
          Deny
        </button>
      </div>
    </div>
  )
}

// Active grants section
function ActiveGrants({ handle }: { handle: string }) {
  const [grants, setGrants] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchGrants()
  }, [handle])

  async function fetchGrants() {
    try {
      const res = await fetch(`/api/grants?handle=${encodeURIComponent(handle)}`)
      const data = await res.json()
      setGrants(data.grants || [])
    } catch {
      // Silent fail
    } finally {
      setLoading(false)
    }
  }

  async function handleRevoke(grantId: string) {
    try {
      await fetch('/api/grants/revoke', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ grantId, handle }),
      })
      fetchGrants()
    } catch {
      // Silent fail
    }
  }

  if (loading) {
    return (
      <section className="glass-card p-6">
        <h3 className="text-sm font-bold text-[#9CA3AF] uppercase tracking-wider mb-5">
          Active Grants
        </h3>
        <div className="flex items-center justify-center py-8">
          <div className="flex items-center gap-3">
            <svg className="animate-spin h-5 w-5 text-[#9CA3AF]" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <span className="text-sm font-medium text-[#9CA3AF]">Loading grants...</span>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className="glass-card p-6">
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-sm font-bold text-[#9CA3AF] uppercase tracking-wider">
          Active Grants
        </h3>
        {grants.length > 0 && (
          <span className="text-xs font-bold text-[#285661] bg-[#285661]/20 px-2.5 py-1 rounded-full border border-[#285661]/30">
            {grants.length} active
          </span>
        )}
      </div>
      {grants.length === 0 ? (
        <div className="text-center py-10">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-[#285661]/10 flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-[#285661]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <p className="text-base font-semibold text-white mb-1">No active grants</p>
          <p className="text-sm text-[#9CA3AF]">
            You haven&apos;t shared access with anyone yet
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {grants.map((grant) => (
            <div key={grant.id} className="bg-gradient-to-br from-[#252865] to-[#1E2154] rounded-2xl p-5 border border-white/12 shadow-lg space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <p className="text-base font-bold text-white mb-1">{grant.granteeHandle}</p>
                  <p className="text-xs font-semibold text-[#9CA3AF] uppercase tracking-wide">{grant.widgetName || grant.widget}</p>
                </div>
                <span className="badge-granted text-xs px-3 py-1.5 rounded-full whitespace-nowrap">
                  Active
                </span>
              </div>

              <div className="flex flex-wrap gap-2">
                {(grant.scopes || []).map((scope: string) => (
                  <span key={scope} className="text-xs font-medium bg-[#141440] text-[#9CA3AF] px-3 py-1.5 rounded-lg border border-white/5">
                    {scope.replace(/[_:]/g, ' ')}
                  </span>
                ))}
              </div>

              <button
                onClick={() => handleRevoke(grant.id)}
                className="w-full px-5 py-3 rounded-xl text-sm font-bold text-[#ef4444] bg-transparent border-2 border-[#ef4444] hover:bg-[#ef4444]/10 transition-all"
              >
                Revoke Access
              </button>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

// Appointments section
function Appointments({ handle }: { handle: string }) {
  const [messages, setMessages] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchMessages()
  }, [handle])

  async function fetchMessages() {
    try {
      const res = await fetch(`/api/relay/inbox?handle=${encodeURIComponent(handle)}`)
      const data = await res.json()
      setMessages(data.messages || [])
    } catch {
      // Silent fail
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <section className="glass-card p-6">
        <h3 className="text-sm font-bold text-[#9CA3AF] uppercase tracking-wider mb-5">
          Messages
        </h3>
        <div className="flex items-center justify-center py-8">
          <div className="flex items-center gap-3">
            <svg className="animate-spin h-5 w-5 text-[#9CA3AF]" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <span className="text-sm font-medium text-[#9CA3AF]">Loading messages...</span>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className="glass-card p-6">
      <h3 className="text-sm font-bold text-[#9CA3AF] uppercase tracking-wider mb-5">
        Messages &amp; Appointments
      </h3>
      {messages.length === 0 ? (
        <div className="text-center py-10">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-[#638AC1]/10 flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-[#638AC1]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
            </svg>
          </div>
          <p className="text-base font-semibold text-white mb-1">No messages</p>
          <p className="text-sm text-[#9CA3AF]">
            Appointment confirmations will appear here
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {messages.map((msg) => (
            <div key={msg.id} className="bg-gradient-to-br from-[#252865] to-[#1E2154] rounded-2xl p-5 border border-white/12 shadow-lg">
              <div className="flex items-start justify-between mb-3 gap-3">
                <p className="text-base font-bold text-white">{msg.senderHandle}</p>
                <span className="text-xs font-medium text-[#9CA3AF]">
                  {new Date(msg.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                </span>
              </div>
              <p className="text-sm text-[#D1D5DB] leading-relaxed mb-3">{msg.content}</p>
              {msg.widgetSlug && (
                <span className="inline-block text-xs font-medium bg-[#141440] text-[#9CA3AF] px-3 py-1.5 rounded-lg border border-white/5">
                  via {msg.widgetSlug}
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
