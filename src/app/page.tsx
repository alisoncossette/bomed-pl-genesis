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
      <main className="min-h-screen flex flex-col items-center justify-center px-5 py-8">
        <div className="w-full max-w-sm mx-auto text-center space-y-8">
          {/* Logo badge */}
          <div className="space-y-4">
            <div className="w-16 h-16 mx-auto rounded-xl bg-white p-1.5">
              <img src="/logo-icon.png" alt="BoMed" className="w-full h-full object-contain" />
            </div>
            <div className="space-y-1">
              <h1 className="text-4xl font-bold text-[#F0F2F5] leading-tight">BoMed</h1>
              <p className="text-base text-[#9CA3AF]">Patient Portal</p>
            </div>
          </div>

          {/* Explainer Card */}
          <div className="glass-card p-5 space-y-5">
            <p className="text-base text-[#9CA3AF] leading-relaxed text-left">
              BoMed uses Bolospot to connect your verified identity to your healthcare providers — like Stripe connects your bank to merchants. Your @handle is your address. Providers request access, you approve it. Nothing moves without your say-so.
            </p>
            <div className="space-y-3 text-left text-base">
              <div className="flex items-start gap-3 text-[#9CA3AF]">
                <span className="text-[#F4A63C] text-lg">✓</span>
                <span>Proof of personhood — no passwords</span>
              </div>
              <div className="flex items-start gap-3 text-[#9CA3AF]">
                <span className="text-[#F4A63C] text-lg">✓</span>
                <span>Scoped permissions — share only what you choose</span>
              </div>
              <div className="flex items-start gap-3 text-[#9CA3AF]">
                <span className="text-[#F4A63C] text-lg">✓</span>
                <span>Instant revocation — always in control</span>
              </div>
            </div>
          </div>

          {/* Verify button */}
          <button
            onClick={handleVerify}
            disabled={step === 'verifying'}
            className="w-full px-6 py-3 rounded-lg font-semibold text-sm text-white bg-[#285661] hover:bg-[#1f4550] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {step === 'verifying' ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Verifying...
              </span>
            ) : (
              'Verify with World ID'
            )}
          </button>

          {!isMiniApp && (
            <p className="text-xs text-[#9CA3AF]">
              Demo mode — running outside World App
            </p>
          )}
        </div>
      </main>
    )
  }

  // Handle linking screen
  if (step === 'handle') {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center px-5 py-8">
        <div className="w-full max-w-sm mx-auto space-y-8">
          {/* Verified badge */}
          <div className="text-center space-y-4">
            <div className="w-16 h-16 mx-auto rounded-full bg-[#F4A63C] flex items-center justify-center pulse-orange">
              <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div className="space-y-1">
              <h2 className="text-2xl font-bold text-[#F0F2F5]">Identity Verified</h2>
              <p className="text-base text-[#9CA3AF]">Choose your Bolospot handle</p>
            </div>
          </div>

          {/* Name inputs and Handle input */}
          <div className="glass-card p-5 space-y-5">
            {/* Name inputs */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-[#9CA3AF] mb-2">
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
                  className="w-full px-4 py-3 bg-[#141440] border border-white/10 rounded-lg text-[#F0F2F5] placeholder-[#9CA3AF]/40 focus:outline-none focus:border-[#F4A63C] transition-colors"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#9CA3AF] mb-2">
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
                  className="w-full px-4 py-3 bg-[#141440] border border-white/10 rounded-lg text-[#F0F2F5] placeholder-[#9CA3AF]/40 focus:outline-none focus:border-[#F4A63C] transition-colors"
                />
              </div>
            </div>

            {/* Handle input */}
            <div>
              <label className="block text-sm font-medium text-[#9CA3AF] mb-2">
                Your @handle
              </label>
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#9CA3AF]">@</span>
                  <input
                    type="text"
                    value={handleInput}
                    onChange={(e) => {
                      setHandleInput(e.target.value.replace(/^@/, ''))
                      setHandleError('')
                    }}
                    placeholder="yourhandle"
                    className="w-full pl-9 pr-4 py-3 bg-[#141440] border border-white/10 rounded-lg text-[#F0F2F5] placeholder-[#9CA3AF]/40 focus:outline-none focus:border-[#F4A63C] transition-colors"
                  />
                </div>
              </div>
              {handleInput && (
                <p className="text-sm text-[#9CA3AF] mt-2">
                  Your handle will be @{handleInput} — change it if you like
                </p>
              )}
            </div>

            {handleError && (
              <p className="text-sm text-[#ef4444]">{handleError}</p>
            )}

            <p className="text-sm text-[#9CA3AF] leading-relaxed">
              This creates your Bolospot identity, verified by World ID.
              Healthcare providers will send permission requests here.
            </p>
          </div>

          <button
            onClick={handleLinkHandle}
            disabled={!handleInput.trim() || handleLoading}
            className="w-full px-6 py-3 rounded-lg font-semibold text-sm text-white bg-[#285661] hover:bg-[#1f4550] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {handleLoading ? 'Creating...' : 'Create & Link Handle'}
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
      {/* Header */}
      <header className="sticky top-0 z-50 bg-[#141440] border-b border-white/8 px-5 py-4">
        <div className="max-w-sm mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-white p-1 cursor-pointer select-none" onClick={handleLogoTap}>
              <img src="/logo-icon.png" alt="BoMed" className="w-full h-full object-contain" />
            </div>
            <div>
              <p className="text-sm font-semibold text-[#F0F2F5]">{handle}</p>
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-[#F4A63C]" />
                <p className="text-xs text-[#F4A63C]">Verified</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-sm mx-auto px-5 py-8 space-y-5">
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
      <section className="glass-card p-5">
        <h3 className="text-sm font-semibold text-[#9CA3AF] uppercase tracking-wider mb-4">
          Incoming Requests
        </h3>
        <div className="flex items-center justify-center py-6">
          <div className="animate-pulse text-sm text-[#9CA3AF]">Loading...</div>
        </div>
      </section>
    )
  }

  return (
    <section className="glass-card p-5">
      <h3 className="text-sm font-semibold text-[#9CA3AF] uppercase tracking-wider mb-4">
        Incoming Requests
      </h3>
      {requests.length === 0 ? (
        <p className="text-sm text-[#9CA3AF] py-4 text-center">
          No pending requests
        </p>
      ) : (
        <div className="space-y-3">
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
    <div className="bg-[#252865] rounded-xl p-4 border border-white/8 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-[#F0F2F5]">{request.fromName || request.fromHandle}</p>
          <p className="text-xs text-[#9CA3AF]">{request.widgetName || request.widget}</p>
        </div>
        <span className="badge-pending text-xs px-2 py-1 rounded-full">
          Pending
        </span>
      </div>

      {request.reason && (
        <p className="text-sm text-[#9CA3AF] italic">&ldquo;{request.reason}&rdquo;</p>
      )}

      {/* Scope toggles */}
      <div className="space-y-2">
        <p className="text-sm text-[#9CA3AF] font-medium">Requested access:</p>
        {(request.scopes || []).map((scope: string) => (
          <label key={scope} className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={selectedScopes.has(scope)}
              onChange={() => toggleScope(scope)}
              className="accent-[#F4A63C] w-4 h-4"
            />
            <span className="text-sm text-[#F0F2F5]">
              {scope.replace(/[_:]/g, ' ')}
            </span>
          </label>
        ))}
      </div>

      {/* Policy controls — shown when appointment scopes are selected */}
      <PolicyControls
        policy={policy}
        onChange={setPolicy}
        scopeHasAppointments={hasAppointmentScopes}
      />

      {/* Action buttons */}
      <div className="flex gap-2 pt-1">
        <button
          onClick={() => onRespond(request.id, true, Array.from(selectedScopes), policy)}
          disabled={selectedScopes.size === 0}
          className="flex-1 px-4 py-2.5 rounded-lg text-sm font-semibold bg-[#285661] text-white hover:bg-[#1f4550] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Grant
        </button>
        <button
          onClick={() => onRespond(request.id, false, [])}
          className="flex-1 px-4 py-2.5 rounded-lg text-sm font-semibold bg-transparent text-[#ef4444] border border-[#ef4444] hover:bg-[#ef4444]/10 transition-colors"
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
      <section className="glass-card p-5">
        <h3 className="text-sm font-semibold text-[#9CA3AF] uppercase tracking-wider mb-4">
          Active Grants
        </h3>
        <div className="animate-pulse text-sm text-[#9CA3AF] text-center py-6">Loading...</div>
      </section>
    )
  }

  return (
    <section className="glass-card p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-[#9CA3AF] uppercase tracking-wider">
          Active Grants
        </h3>
        <span className="text-xs text-[#9CA3AF]">{grants.length} active</span>
      </div>
      {grants.length === 0 ? (
        <p className="text-sm text-[#9CA3AF] py-4 text-center">
          No active grants — you haven&#39;t shared access with anyone yet
        </p>
      ) : (
        <div className="space-y-3">
          {grants.map((grant) => (
            <div key={grant.id} className="bg-[#252865] rounded-xl p-4 border border-white/8">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <p className="text-sm font-medium text-[#F0F2F5]">{grant.granteeHandle}</p>
                  <p className="text-xs text-[#9CA3AF]">{grant.widgetName || grant.widget}</p>
                </div>
                <span className="badge-granted text-xs px-2 py-1 rounded-full">
                  Active
                </span>
              </div>

              <div className="flex flex-wrap gap-1.5 mb-3">
                {(grant.scopes || []).map((scope: string) => (
                  <span key={scope} className="text-xs bg-[#141440] text-[#9CA3AF] px-2 py-1 rounded-lg">
                    {scope.replace(/[_:]/g, ' ')}
                  </span>
                ))}
              </div>

              <button
                onClick={() => handleRevoke(grant.id)}
                className="w-full px-4 py-2 rounded-lg text-sm font-semibold text-[#ef4444] bg-transparent border border-[#ef4444] hover:bg-[#ef4444]/10 transition-colors"
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
      <section className="glass-card p-5">
        <h3 className="text-sm font-semibold text-[#9CA3AF] uppercase tracking-wider mb-4">
          Messages
        </h3>
        <div className="animate-pulse text-sm text-[#9CA3AF] text-center py-6">Loading...</div>
      </section>
    )
  }

  return (
    <section className="glass-card p-5">
      <h3 className="text-sm font-semibold text-[#9CA3AF] uppercase tracking-wider mb-4">
        Messages &amp; Appointments
      </h3>
      {messages.length === 0 ? (
        <p className="text-sm text-[#9CA3AF] py-4 text-center">
          No messages yet
        </p>
      ) : (
        <div className="space-y-3">
          {messages.map((msg) => (
            <div key={msg.id} className="bg-[#252865] rounded-xl p-4 border border-white/8">
              <div className="flex items-center justify-between mb-1">
                <p className="text-sm font-medium text-[#F0F2F5]">{msg.senderHandle}</p>
                <span className="text-xs text-[#9CA3AF]">
                  {new Date(msg.createdAt).toLocaleDateString()}
                </span>
              </div>
              <p className="text-sm text-[#9CA3AF]">{msg.content}</p>
              {msg.widgetSlug && (
                <span className="inline-block mt-2 text-xs bg-[#141440] text-[#9CA3AF] px-2 py-1 rounded">
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
