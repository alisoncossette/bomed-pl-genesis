'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { MiniKit, VerifyCommandInput, VerificationLevel } from '@worldcoin/minikit-js'
import { PolicyControls, DEFAULT_POLICY, type Policy } from './components/PolicyControls'
import { AutoBookFeed } from './components/AutoBookFeed'
import { VitalsCard } from './components/VitalsCard'
import { DemoPanel } from './components/DemoPanel'

type Step = 'welcome' | 'setup' | 'dashboard' | 'sending-request'

// ─── Spinner ────────────────────────────────────────────────────────────────
function Spinner({ dark }: { dark?: boolean }) {
  return (
    <div className={`bm-spinner ${dark ? 'bm-spinner-teal' : ''}`} />
  )
}

// ─── Logo mark ──────────────────────────────────────────────────────────────
function LogoMark({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const dims = size === 'sm' ? 'w-10 h-8' : size === 'lg' ? 'w-28 h-20' : 'w-20 h-14'
  const pad  = size === 'sm' ? 'p-1' : size === 'lg' ? 'p-3' : 'p-2'
  return (
    <div className={`${dims} ${pad} bg-white border border-[#e5e7eb] rounded-xl shadow-sm flex items-center justify-center flex-shrink-0`}>
      <img src="/logo-icon.png" alt="BoMed" className="w-full h-full object-contain" />
    </div>
  )
}

// ─── Check icon ─────────────────────────────────────────────────────────────
function CheckIcon() {
  return (
    <svg className="w-3 h-3 text-white" viewBox="0 0 12 12" fill="none"
      stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 6l3 3 5-5" />
    </svg>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// HOME
// ═══════════════════════════════════════════════════════════════════════════
function HomeContent() {
  const searchParams = useSearchParams()
  const [step, setStep]               = useState<Step>('welcome')
  const [isVerifying, setIsVerifying] = useState(false)
  const [nullifierHash, setNullifierHash] = useState<string | null>(null)
  const [handle, setHandle]           = useState('')
  const [boloToken, setBoloToken]     = useState<string | null>(null)
  const [firstName, setFirstName]     = useState('')
  const [lastName, setLastName]       = useState('')
  const [email, setEmail]             = useState('')
  const [handleInput, setHandleInput] = useState('')
  const [handleError, setHandleError] = useState('')
  const [isMiniApp, setIsMiniApp]     = useState(false)
  const [practiceHandle, setPracticeHandle] = useState<string | null>(null)
  const [practiceScopes, setPracticeScopes] = useState<string[]>([])

  useEffect(() => { setIsMiniApp(MiniKit.isInstalled()) }, [])

  useEffect(() => {
    const practice = searchParams.get('practice')
    const scopes = searchParams.get('scopes')
    if (practice) {
      setPracticeHandle(practice)
      setPracticeScopes(scopes ? scopes.split(',') : [])
    }
  }, [searchParams])

  const suggestedHandle = firstName && lastName
    ? `${firstName}${lastName}`.toLowerCase().replace(/\s+/g, '')
    : ''

  // Priority-ordered handle suggestions when the preferred one is taken
  function getHandleFallbacks(first: string, last: string): string[] {
    const f = first.toLowerCase().replace(/\s+/g, '')
    const l = last.toLowerCase().replace(/\s+/g, '')
    if (!f || !l) return []
    return [
      `${f}${l}`,            // allisonpark
      `${f[0]}${l}`,         // apark
      `${f.slice(0,2)}${l}`, // alpark
      `${f}.${l}`,           // allison.park
      `${f[0]}.${l}`,        // a.park
      `${f}${l[0]}`,         // allisonp
      `${f}${l}1`,
      `${f}${l}2`,
    ]
  }

  useEffect(() => {
    if (suggestedHandle && !handleInput) setHandleInput(suggestedHandle)
  }, [suggestedHandle])

  async function sendPracticeRequest(userHandle: string, token: string, practice: string, scopes: string[]) {
    setStep('sending-request')

    const BASE_URL = process.env.NEXT_PUBLIC_BOLO_API_URL || 'https://api.bolospot.com'

    try {
      await fetch(`${BASE_URL}/api/@${practice}/request`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ scopes }),
      })

      // Brief delay to show the "sending" state
      await new Promise(r => setTimeout(r, 1500))
    } catch (error) {
      console.error('Failed to send practice request:', error)
    }

    setStep('dashboard')
  }

  async function handleSetupAndVerify() {
    if (!handleInput.trim()) {
      setHandleError('Please choose a handle')
      return
    }
    setHandleError('')
    setIsVerifying(true)

    if (!MiniKit.isInstalled()) {
      // Demo mode — log in as the real demo patient account
      await new Promise(r => setTimeout(r, 1500))
      try {
        const res = await fetch('/api/demo/login', { method: 'POST' })
        const data = await res.json()
        if (data.success) {
          setNullifierHash('demo')
          setBoloToken(data.accessToken)
          setHandle(data.handle)

          // If we came from a practice QR code, auto-send the request
          if (practiceHandle && practiceScopes.length > 0) {
            await sendPracticeRequest(data.handle, data.accessToken, practiceHandle, practiceScopes)
          } else {
            setStep('dashboard')
          }

          setIsVerifying(false)
          return
        }
      } catch { /* fall through to manual handle creation */ }
      const devHash = 'dev_' + Math.random().toString(36).slice(2)
      setNullifierHash(devHash)
      await createHandle(devHash)
      return
    }

    try {
      const verifyPayload: VerifyCommandInput = {
        action: process.env.NEXT_PUBLIC_WORLD_ACTION || 'verify-patient',
        verification_level: VerificationLevel.Orb,
      }

      const { finalPayload } = await MiniKit.commandsAsync.verify(verifyPayload)

      if (finalPayload.status === 'error') {
        setHandleError('Verification cancelled.')
        setIsVerifying(false)
        return
      }

      const res = await fetch('/api/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payload: finalPayload, action: verifyPayload.action }),
      })

      const data = await res.json()

      if (data.verified) {
        setNullifierHash(data.nullifier_hash)
        if (data.handle) {
          // Returning user — already has a handle
          setHandle(data.handle)

          // If we came from a practice QR code, auto-send the request
          if (practiceHandle && practiceScopes.length > 0 && boloToken) {
            await sendPracticeRequest(data.handle, boloToken, practiceHandle, practiceScopes)
          } else {
            setStep('dashboard')
          }

          setIsVerifying(false)
        } else {
          await createHandle(data.nullifier_hash)
        }
      } else {
        setHandleError('Verification failed. Please try again.')
        setIsVerifying(false)
      }
    } catch {
      setHandleError('Something went wrong. Please try again.')
      setIsVerifying(false)
    }
  }

  async function createHandle(hash: string) {
    // Build ordered list: user's input first, then smart fallbacks
    const userInput = handleInput.replace(/^@/, '').toLowerCase().trim()
    const fallbacks = getHandleFallbacks(firstName, lastName)
    const candidates = [userInput, ...fallbacks.filter(h => h !== userInput)]

    for (const candidate of candidates) {
      const tryHandle = `@${candidate}`
      try {
        const displayName = [firstName, lastName].filter(Boolean).join(' ') || candidate

        const res = await fetch('/api/handle/link', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ handle: tryHandle, nullifierHash: hash, displayName, email: email.trim() || undefined }),
        })

        const data = await res.json()

        if (data.success) {
          setHandle(data.handle)
          if (data.accessToken) setBoloToken(data.accessToken)

          // If we came from a practice QR code, auto-send the request
          if (practiceHandle && practiceScopes.length > 0) {
            await sendPracticeRequest(data.handle, data.accessToken, practiceHandle, practiceScopes)
          } else {
            setStep('dashboard')
          }

          setIsVerifying(false)
          return
        } else if (data.error?.includes('already exists') || data.error?.includes('taken') || data.error?.includes('conflict')) {
          continue // try next fallback
        } else {
          setHandleError(data.error || 'Could not create your identity')
          setIsVerifying(false)
          return
        }
      } catch {
        setHandleError('Network error. Please try again.')
        setIsVerifying(false)
        return
      }
    }

    setHandleError('That handle is taken. Please choose a different one.')
    setIsVerifying(false)
  }

  // ── WELCOME ──────────────────────────────────────────────────────────────
  if (step === 'welcome') {
    return (
      <main className="min-h-screen bg-white flex flex-col items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm mx-auto flex flex-col items-center gap-10">

          {/* Logo + wordmark */}
          <div className="flex flex-col items-center gap-4">
            <LogoMark size="lg" />
            <div className="text-center">
              <h1 className="text-4xl font-bold text-[#02043d] tracking-tight">BoMed</h1>
              <p className="text-base text-[#6b7280] mt-1">Patient Identity Portal</p>
            </div>
          </div>

          {/* Feature list */}
          <div className="w-full flex flex-col gap-4">
            {[
              { title: 'Proof of personhood', desc: 'No passwords, no forms — just you' },
              { title: 'Scoped permissions', desc: 'Share only exactly what you choose' },
              { title: 'Instant revocation', desc: 'Always in control of your data' },
            ].map(f => (
              <div key={f.title} className="flex items-start gap-3">
                <div className="w-[22px] h-[22px] rounded-full bg-[#0d9488] flex items-center justify-center flex-shrink-0 mt-0.5">
                  <CheckIcon />
                </div>
                <div>
                  <span className="text-sm font-semibold text-[#02043d]">{f.title}</span>
                  <span className="text-sm text-[#6b7280]"> — {f.desc}</span>
                </div>
              </div>
            ))}
          </div>

          {/* CTA */}
          <div className="w-full flex flex-col gap-3">
            <button
              onClick={() => setStep('setup')}
              className="bm-btn-primary"
            >
              Get started
              <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none"
                stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 8h10M9 4l4 4-4 4" />
              </svg>
            </button>

            {!isMiniApp && (
              <div className="demo-notice">
                <div className="w-1.5 h-1.5 rounded-full bg-[#ffa350]" />
                <p className="text-xs font-medium text-[#92400e]">
                  Demo mode — running outside World App
                </p>
              </div>
            )}
          </div>

        </div>
      </main>
    )
  }

  // ── SETUP ─────────────────────────────────────────────────────────────────
  if (step === 'setup') {
    return (
      <main className="min-h-screen bg-[#f4f6fb] flex flex-col items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm mx-auto flex flex-col gap-7">

          {/* Header */}
          <div className="flex flex-col items-center gap-3 text-center">
            <LogoMark size="md" />
            <div>
              <h2 className="text-2xl font-bold text-[#02043d]">Create your identity</h2>
              <p className="text-sm text-[#6b7280] mt-1">
                Your BoMed handle is your address<br />for healthcare permissions
              </p>
            </div>
          </div>

          {/* Form card */}
          <div className="bm-card p-5 flex flex-col gap-5">

            {/* Name row */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-[#6b7280] mb-1.5">
                  First name
                </label>
                <input
                  type="text"
                  value={firstName}
                  onChange={e => { setFirstName(e.target.value); setHandleError('') }}
                  placeholder="Alison"
                  autoFocus
                  className="bm-input"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#6b7280] mb-1.5">
                  Last name
                </label>
                <input
                  type="text"
                  value={lastName}
                  onChange={e => { setLastName(e.target.value); setHandleError('') }}
                  placeholder="Park"
                  className="bm-input"
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block text-xs font-semibold text-[#6b7280] mb-1.5">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="bm-input w-full"
              />
              <p className="text-xs text-[#9ca3af] mt-1.5 pl-0.5">
                For appointment confirmations and your Bolo account
              </p>
            </div>

            {/* Handle */}
            <div>
              <label className="block text-xs font-semibold text-[#6b7280] mb-1.5">
                Your @handle
              </label>
              <div className={`flex rounded-xl border overflow-hidden transition-all ${handleError ? 'border-[#dc2626] ring-2 ring-[#dc2626]/10' : 'border-[#e5e7eb] focus-within:border-[#0d9488] focus-within:ring-2 focus-within:ring-[#0d9488]/10'}`}>
                <span className="flex items-center px-3 bg-[#f4f6fb] border-r border-[#e5e7eb] text-sm font-semibold text-[#9ca3af] select-none">@</span>
                <input
                  type="text"
                  value={handleInput}
                  onChange={e => { setHandleInput(e.target.value.replace(/^@/, '')); setHandleError('') }}
                  placeholder="yourhandle"
                  className="flex-1 px-3 py-3 bg-white text-sm font-medium text-[#02043d] outline-none placeholder-[#9ca3af]/60"
                />
              </div>
              {handleInput && !handleError && (
                <p className="text-xs text-[#9ca3af] mt-1.5 pl-0.5">
                  Auto-filled from your name — you can edit this
                </p>
              )}
              {handleError && (
                <p className="text-xs text-[#dc2626] mt-1.5 pl-0.5 font-medium">{handleError}</p>
              )}
            </div>

            {/* Divider */}
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-[#e5e7eb]" />
              <span className="text-xs text-[#9ca3af] font-medium whitespace-nowrap">then verify you&apos;re human</span>
              <div className="flex-1 h-px bg-[#e5e7eb]" />
            </div>

            {/* Verify & Create button */}
            <div className="flex flex-col gap-2">
              <button
                onClick={handleSetupAndVerify}
                disabled={isVerifying || !handleInput.trim()}
                className="bm-btn-primary"
              >
                {isVerifying ? (
                  <>
                    <Spinner />
                    Verifying identity...
                  </>
                ) : (
                  <>
                    <span className="text-lg leading-none">⌀</span>
                    Verify &amp; Create with World ID
                  </>
                )}
              </button>
              <p className="text-center text-[11px] text-[#9ca3af]">
                Proves you&apos;re a real person — takes ~10 seconds
              </p>
            </div>

          </div>

          <p className="text-center text-[11px] text-[#9ca3af] leading-relaxed px-4">
            Your handle is stored on Bolospot. Healthcare providers use it to send you permission requests.
          </p>

        </div>
      </main>
    )
  }

  // ── SENDING REQUEST ──────────────────────────────────────────────────────
  if (step === 'sending-request') {
    return (
      <main className="min-h-screen bg-white flex flex-col items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm mx-auto flex flex-col items-center gap-6">
          <LogoMark size="md" />
          <div className="flex flex-col items-center gap-3 text-center">
            <Spinner dark />
            <div>
              <h2 className="text-xl font-bold text-[#02043d]">
                Sending request to {practiceHandle ? `@${practiceHandle}` : 'practice'}...
              </h2>
              <p className="text-sm text-[#6b7280] mt-1">
                Your permissions will be ready to grant
              </p>
            </div>
          </div>
        </div>
      </main>
    )
  }

  // ── DASHBOARD ────────────────────────────────────────────────────────────
  if (step === 'dashboard') {
    return <Dashboard handle={handle} nullifierHash={nullifierHash} boloToken={boloToken} />
  }

  return null
}

// ═══════════════════════════════════════════════════════════════════════════
// DASHBOARD
// ═══════════════════════════════════════════════════════════════════════════
function Dashboard({ handle, nullifierHash, boloToken }: { handle: string; nullifierHash: string | null; boloToken: string | null }) {
  const [showDemo, setShowDemo] = useState(false)
  const [tapCount, setTapCount] = useState(0)

  function handleLogoTap() {
    const next = tapCount + 1
    setTapCount(next)
    if (next >= 5) { setShowDemo(true); setTapCount(0) }
    setTimeout(() => setTapCount(0), 2000)
  }

  const initials = handle
    .replace('@', '')
    .slice(0, 2)
    .toUpperCase()

  return (
    <main className="min-h-screen bg-[#f4f6fb] pb-10">

      {/* Header */}
      <header className="sticky top-0 z-50 bg-white border-b border-[#e5e7eb] shadow-sm">
        <div className="max-w-sm mx-auto px-4 py-3 flex items-center gap-3">
          <div onClick={handleLogoTap} className="cursor-pointer select-none">
            <LogoMark size="sm" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-[#02043d] truncate">{handle}</span>
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#ffa350] bg-[#fff7ed] border border-[rgba(255,163,80,0.3)] rounded-full px-2 py-0.5 whitespace-nowrap">
                <svg className="w-2.5 h-2.5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                Verified
              </span>
            </div>
            <p className="text-xs text-[#9ca3af] mt-0.5">World ID Patient</p>
          </div>
          <div className="w-9 h-9 rounded-full bg-[#0d9488] flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
            {initials}
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="max-w-sm mx-auto px-4 py-5 flex flex-col gap-4">
        <AutoBookFeed handle={handle} />
        <PendingRequests handle={handle} boloToken={boloToken} />
        <ActiveGrants handle={handle} boloToken={boloToken} />
        <VitalsCard handle={handle} />
        <Appointments handle={handle} boloToken={boloToken} />
      </div>

      {showDemo && <DemoPanel handle={handle} onClose={() => setShowDemo(false)} />}
    </main>
  )
}

// ─── Section wrapper ────────────────────────────────────────────────────────
function Section({
  title,
  badge,
  children,
  live,
}: {
  title: string
  badge?: string
  children: React.ReactNode
  live?: boolean
}) {
  return (
    <section className="bm-card overflow-hidden">
      <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-[#f1f3f8]">
        <div className="flex items-center gap-2">
          {live && <div className="w-2 h-2 rounded-full bg-[#0d9488] animate-pulse" />}
          <h3 className="text-sm font-bold text-[#02043d]">{title}</h3>
        </div>
        {badge && (
          <span className="text-[11px] font-semibold text-[#0d9488] bg-[#ccfbf1] border border-[rgba(13,148,136,0.2)] rounded-full px-2 py-0.5">
            {badge}
          </span>
        )}
      </div>
      {children}
    </section>
  )
}

// ─── Loading state ──────────────────────────────────────────────────────────
function LoadingRows() {
  return (
    <div className="flex items-center justify-center gap-2 py-10 text-[#9ca3af]">
      <div className="bm-spinner bm-spinner-teal" />
      <span className="text-sm">Loading…</span>
    </div>
  )
}

// ─── Empty state ────────────────────────────────────────────────────────────
function EmptyState({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="flex flex-col items-center py-10 px-6 text-center">
      <div className="w-11 h-11 rounded-xl bg-[#f4f6fb] flex items-center justify-center mb-3">
        {icon}
      </div>
      <p className="text-sm font-semibold text-[#02043d] mb-1">{title}</p>
      <p className="text-xs text-[#9ca3af] leading-relaxed max-w-[220px]">{desc}</p>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// PENDING REQUESTS
// ═══════════════════════════════════════════════════════════════════════════
function PendingRequests({ handle, boloToken }: { handle: string; boloToken: string | null }) {
  const [requests, setRequests] = useState<any[]>([])
  const [loading, setLoading]   = useState(true)

  useEffect(() => { fetchRequests() }, [handle, boloToken])

  async function fetchRequests() {
    try {
      const headers: Record<string, string> = {}
      if (boloToken) headers['x-bolo-token'] = boloToken
      const res  = await fetch(`/api/requests?handle=${encodeURIComponent(handle)}`, { headers })
      const data = await res.json()
      setRequests(data.requests || [])
    } catch { /* silent */ } finally { setLoading(false) }
  }

  async function handleRespond(requestId: string, approved: boolean, scopes: string[], policy?: Policy) {
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      if (boloToken) headers['x-bolo-token'] = boloToken
      await fetch('/api/requests/respond', {
        method: 'POST',
        headers,
        body: JSON.stringify({ requestId, approved, scopes, handle, policy }),
      })
      fetchRequests()
    } catch { /* silent */ }
  }

  return (
    <Section
      title="Incoming Requests"
      badge={requests.length > 0 ? `${requests.length} pending` : undefined}
    >
      {loading ? <LoadingRows /> : requests.length === 0 ? (
        <EmptyState
          icon={<svg className="w-5 h-5 text-[#9ca3af]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" /></svg>}
          title="All clear"
          desc="No pending permission requests"
        />
      ) : (
        <div className="divide-y divide-[#f1f3f8]">
          {requests.map(req => (
            <RequestCard key={req.id} request={req} onRespond={handleRespond} />
          ))}
        </div>
      )}
    </Section>
  )
}

// ─── Request card ───────────────────────────────────────────────────────────
function RequestCard({
  request,
  onRespond,
}: {
  request: any
  onRespond: (id: string, approved: boolean, scopes: string[], policy?: Policy) => void
}) {
  const [selectedScopes, setSelectedScopes] = useState<Set<string>>(new Set(request.scopes || []))
  const [policy, setPolicy]                 = useState<Policy>(DEFAULT_POLICY)

  function toggleScope(scope: string) {
    const next = new Set(selectedScopes)
    next.has(scope) ? next.delete(scope) : next.add(scope)
    setSelectedScopes(next)
  }

  const hasAppointmentScopes = Array.from(selectedScopes).some(s => s.startsWith('appointments:'))

  function scopeIcon(scope: string) {
    if (scope.startsWith('appointments')) return '📅'
    if (scope.startsWith('demographics')) return '👤'
    if (scope.startsWith('vitals'))       return '💓'
    if (scope.startsWith('lab'))          return '🔬'
    if (scope.startsWith('medications'))  return '💊'
    return '📋'
  }

  return (
    <div className="p-4 flex flex-col gap-4">

      {/* Provider row */}
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-[#e0f2fe] flex items-center justify-center text-xl flex-shrink-0">🏥</div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-[#02043d]">{request.fromName || request.fromHandle}</p>
          <p className="text-xs text-[#9ca3af] mt-0.5">{request.widgetName || request.widget}</p>
        </div>
        <span className="badge-pending text-[11px] px-2.5 py-1 rounded-full whitespace-nowrap">Pending</span>
      </div>

      {/* Reason */}
      {request.reason && (
        <div className="px-3 py-2.5 rounded-lg bg-[#f9fafb] border border-[#f1f3f8]">
          <p className="text-xs text-[#4b5563] italic leading-relaxed">&ldquo;{request.reason}&rdquo;</p>
        </div>
      )}

      {/* Scopes */}
      <div>
        <p className="text-[11px] font-semibold text-[#9ca3af] uppercase tracking-wide mb-2">Requested access</p>
        <div className="flex flex-col gap-0 divide-y divide-[#f1f3f8]">
          {(request.scopes || []).map((scope: string) => (
            <label key={scope} className="flex items-center justify-between py-2.5 cursor-pointer">
              <div className="flex items-center gap-2.5">
                <span className="text-base">{scopeIcon(scope)}</span>
                <div>
                  <p className="text-sm font-medium text-[#02043d]">
                    {scope.split(':')[0].charAt(0).toUpperCase() + scope.split(':')[0].slice(1)}
                  </p>
                  <p className="text-[11px] text-[#9ca3af]">{scope.replace(/[_:]/g, ' ')}</p>
                </div>
              </div>
              <label className="bm-toggle">
                <input
                  type="checkbox"
                  checked={selectedScopes.has(scope)}
                  onChange={() => toggleScope(scope)}
                />
                <span className="bm-toggle-track" />
              </label>
            </label>
          ))}
        </div>
      </div>

      {/* Policy controls */}
      <PolicyControls
        policy={policy}
        onChange={setPolicy}
        scopeHasAppointments={hasAppointmentScopes}
      />

      {/* Actions */}
      <div className="flex gap-2 pt-1">
        <button
          onClick={() => onRespond(request.id, true, Array.from(selectedScopes), policy)}
          disabled={selectedScopes.size === 0}
          className="bm-btn-teal flex-1 text-sm py-2.5"
        >
          Grant access
        </button>
        <button
          onClick={() => onRespond(request.id, false, [])}
          className="bm-btn-danger"
        >
          Deny
        </button>
      </div>

    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// ACTIVE GRANTS
// ═══════════════════════════════════════════════════════════════════════════
function ActiveGrants({ handle, boloToken }: { handle: string; boloToken: string | null }) {
  const [grants, setGrants]   = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { fetchGrants() }, [handle, boloToken])

  async function fetchGrants() {
    try {
      const headers: Record<string, string> = {}
      if (boloToken) headers['x-bolo-token'] = boloToken
      const res  = await fetch(`/api/grants?handle=${encodeURIComponent(handle)}`, { headers })
      const data = await res.json()
      setGrants(data.grants || [])
    } catch { /* silent */ } finally { setLoading(false) }
  }

  async function handleRevoke(grantId: string) {
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      if (boloToken) headers['x-bolo-token'] = boloToken
      await fetch('/api/grants/revoke', {
        method: 'POST',
        headers,
        body: JSON.stringify({ grantId, handle }),
      })
      fetchGrants()
    } catch { /* silent */ }
  }

  return (
    <Section
      title="Active Grants"
      badge={grants.length > 0 ? `${grants.length} active` : undefined}
    >
      {loading ? <LoadingRows /> : grants.length === 0 ? (
        <EmptyState
          icon={<svg className="w-5 h-5 text-[#9ca3af]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>}
          title="No active grants"
          desc="You haven't shared access with anyone yet"
        />
      ) : (
        <div className="divide-y divide-[#f1f3f8]">
          {grants.map(grant => (
            <div key={grant.id} className="p-4 flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#f0fdf4] flex items-center justify-center text-xl flex-shrink-0">🏥</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <p className="text-sm font-bold text-[#02043d] truncate">{grant.granteeHandle}</p>
                  <span className="badge-granted text-[11px] px-2.5 py-0.5 rounded-full whitespace-nowrap">Active</span>
                </div>
                <p className="text-xs text-[#9ca3af] mb-2">{grant.widgetName || grant.widget}</p>
                <div className="flex flex-wrap gap-1 mb-3">
                  {(grant.scopes || []).map((scope: string) => (
                    <span key={scope} className="scope-tag">{scope.replace(/[_:]/g, ' ')}</span>
                  ))}
                </div>
                <button
                  onClick={() => handleRevoke(grant.id)}
                  className="bm-btn-danger text-xs py-1.5 px-3"
                >
                  Revoke access
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </Section>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// APPOINTMENTS / MESSAGES
// ═══════════════════════════════════════════════════════════════════════════
function Appointments({ handle, boloToken }: { handle: string; boloToken: string | null }) {
  const [messages, setMessages] = useState<any[]>([])
  const [loading, setLoading]   = useState(true)

  useEffect(() => { fetchMessages() }, [handle, boloToken])

  async function fetchMessages() {
    try {
      const headers: Record<string, string> = {}
      if (boloToken) headers['x-bolo-token'] = boloToken
      const res  = await fetch(`/api/relay/inbox?handle=${encodeURIComponent(handle)}`, { headers })
      const data = await res.json()
      setMessages(data.messages || [])
    } catch { /* silent */ } finally { setLoading(false) }
  }

  return (
    <Section title="Messages & Appointments">
      {loading ? <LoadingRows /> : messages.length === 0 ? (
        <EmptyState
          icon={<svg className="w-5 h-5 text-[#9ca3af]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>}
          title="No messages"
          desc="Appointment confirmations will appear here"
        />
      ) : (
        <div className="divide-y divide-[#f1f3f8]">
          {messages.map(msg => (
            <div key={msg.id} className="p-4">
              <div className="flex items-start justify-between gap-2 mb-1.5">
                <p className="text-sm font-bold text-[#02043d]">{msg.senderHandle}</p>
                <span className="text-xs text-[#9ca3af] whitespace-nowrap">
                  {new Date(msg.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                </span>
              </div>
              <p className="text-sm text-[#4b5563] leading-relaxed mb-2">{msg.content}</p>
              {msg.widgetSlug && (
                <span className="text-[11px] font-medium text-[#9ca3af] bg-[#f4f6fb] px-2 py-1 rounded-md">
                  via {msg.widgetSlug}
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </Section>
  )
}

export default function Home() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-white" />}>
      <HomeContent />
    </Suspense>
  )
}
