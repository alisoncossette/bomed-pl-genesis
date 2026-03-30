'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { MiniKit, VerifyCommandInput, VerificationLevel } from '@worldcoin/minikit-js'

type Step = 'welcome' | 'setup' | 'calendar' | 'dashboard' | 'sending-request'
type Tab = 'home' | 'schedule' | 'health' | 'insurance' | 'profile'

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
    const calendar = searchParams.get('calendar')

    if (practice) {
      setPracticeHandle(practice)
      setPracticeScopes(scopes ? scopes.split(',') : [])
    }

    // Returning from Bolospot calendar OAuth
    if (calendar === 'connected') {
      setStep('dashboard')
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
  }, [suggestedHandle, handleInput])

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

          // Auto-send welcome requests from demo practices (non-blocking)
          fetch('/api/demo/welcome', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ patientHandle: data.handle }),
          }).catch(() => {}) // fire and forget

          // If we came from a practice QR code, auto-send the request
          if (practiceHandle && practiceScopes.length > 0) {
            await sendPracticeRequest(data.handle, data.accessToken, practiceHandle, practiceScopes)
          } else {
            setStep('calendar')
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

  // ── CALENDAR ─────────────────────────────────────────────────────────────
  if (step === 'calendar') {
    const [calendarConnecting, setCalendarConnecting] = useState(false)

    async function handleConnectCalendar() {
      setCalendarConnecting(true)
      try {
        // Get OAuth URL from Bolospot — uses the user's session token
        // so the calendar gets stored in Bolospot and powers booking API
        const res = await fetch(`${process.env.NEXT_PUBLIC_BOLO_API_URL || 'https://api.bolospot.com'}/api/connections/google/authorize`, {
          headers: { Authorization: `Bearer ${boloToken}` },
        })

        if (res.ok) {
          const data = await res.json()
          if (data.url) {
            window.location.href = data.url
            return
          }
        }

        // Fallback to our own Google OAuth if Bolospot rejects
        const fallback = await fetch(`/api/calendar/authorize?handle=${encodeURIComponent(handle)}`)
        const fallbackData = await fallback.json()
        if (fallbackData.url) {
          window.location.href = fallbackData.url
        } else {
          setCalendarConnecting(false)
        }
      } catch (error) {
        console.error('Failed to get calendar OAuth URL:', error)
        setCalendarConnecting(false)
      }
    }

    return (
      <main className="min-h-screen bg-[#f4f6fb] flex flex-col items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm mx-auto flex flex-col gap-7">

          {/* Header */}
          <div className="flex flex-col items-center gap-3 text-center">
            <div className="w-16 h-16 rounded-2xl bg-[#0d9488] flex items-center justify-center text-3xl shadow-lg">
              📅
            </div>
            <div>
              <h2 className="text-2xl font-bold text-[#02043d]">Connect your calendar</h2>
              <p className="text-sm text-[#6b7280] mt-1 leading-relaxed">
                So providers can check your availability<br />and book appointments automatically
              </p>
            </div>
          </div>

          {/* Benefits */}
          <div className="bm-card p-5 flex flex-col gap-3">
            {[
              { icon: '⚡', text: 'Providers book around your real availability' },
              { icon: '🔒', text: 'They see free/busy only — never your event details' },
              { icon: '↩️', text: 'Disconnect anytime from your profile' },
            ].map(b => (
              <div key={b.text} className="flex items-start gap-3">
                <span className="text-lg">{b.icon}</span>
                <p className="text-sm text-[#4b5563]">{b.text}</p>
              </div>
            ))}
          </div>

          {/* Calendar options */}
          <div className="flex flex-col gap-3">
            <button
              onClick={handleConnectCalendar}
              disabled={calendarConnecting}
              className="bm-btn-primary flex items-center justify-center gap-3"
            >
              {calendarConnecting ? (
                <>
                  <Spinner />
                  Connecting...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" viewBox="0 0 24 24"><path fill="#fff" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#fff" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#fff" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/><path fill="#fff" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                  Connect Google Calendar
                </>
              )}
            </button>

            <button
              onClick={() => setStep('dashboard')}
              className="text-center text-sm text-[#9ca3af] py-2 hover:text-[#6b7280] transition-colors"
            >
              Skip for now — I'll connect later
            </button>
          </div>

          <p className="text-center text-[11px] text-[#9ca3af] leading-relaxed px-4">
            Your calendar is stored securely in Bolospot — not BoMed.<br />
            Providers only see when you&apos;re free or busy.
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
    const isDemoMode = !MiniKit.isInstalled()
    return <Dashboard handle={handle} isDemoMode={isDemoMode} onSignOut={() => setStep('welcome')} />
  }

  return null
}

// ═══════════════════════════════════════════════════════════════════════════
// DASHBOARD (iOS-style with bottom nav)
// ═══════════════════════════════════════════════════════════════════════════
function Dashboard({ handle, isDemoMode, onSignOut }: { handle: string; isDemoMode: boolean; onSignOut: () => void }) {
  const [activeTab, setActiveTab] = useState<Tab>('home')
  const [tapCount, setTapCount] = useState(0)
  const [showDemo, setShowDemo] = useState(false)
  const [showGrantSheet, setShowGrantSheet] = useState(false)

  function handleLogoTap() {
    const next = tapCount + 1
    setTapCount(next)
    if (next >= 5) { setShowDemo(true); setTapCount(0) }
    setTimeout(() => setTapCount(0), 2000)
  }

  // Demo mode: use demo data
  const displayName = isDemoMode ? 'Dana' : handle.replace('@', '')
  const userHandle = isDemoMode ? '@demopatient' : handle
  const initials = displayName.slice(0, 2).toUpperCase()

  return (
    <div className="ios-app">
      {/* Status bar */}
      <div className="ios-statusbar">
        <span className="ios-statusbar-time">9:41</span>
        <div className="ios-statusbar-icons">
          {/* Signal, WiFi, Battery icons */}
          <svg width="17" height="12" viewBox="0 0 17 12" fill="#0f172a"><rect x="0" y="4" width="3" height="8" rx="1"/><rect x="4.5" y="2.5" width="3" height="9.5" rx="1"/><rect x="9" y="0" width="3" height="12" rx="1"/><rect x="13.5" y="1.5" width="3" height="10.5" rx="1" opacity=".25"/></svg>
          <svg width="16" height="12" viewBox="0 0 24 14" fill="none" stroke="#0f172a" strokeWidth="2.2" strokeLinecap="round"><path d="M1.5 7S5 1 12 1s10.5 6 10.5 6"/><path d="M5 10s2-3 7-3 7 3 7 3"/><circle cx="12" cy="13" r="1.2" fill="#0f172a" stroke="none"/></svg>
          <svg width="27" height="13" viewBox="0 0 27 13" fill="none"><rect x="0.75" y="0.75" width="22.5" height="11.5" rx="3.25" stroke="#0f172a" strokeWidth="1.5"/><rect x="2" y="2" width="17" height="9" rx="2" fill="#0f172a"/><path d="M24.5 4.5v4c1.1-.5 1.1-3.5 0-4z" fill="#0f172a"/></svg>
        </div>
      </div>

      {/* Top bar */}
      {activeTab === 'home' && (
        <div className="ios-topbar">
          <div className="ios-topbar-main">
            <div>
              <div className="ios-topbar-title">Good morning, {displayName}</div>
              <div className="ios-topbar-sub">{userHandle}</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '5px' }}>
              <div className="ios-avatar" onClick={handleLogoTap}>{initials}</div>
              <div className="ios-verified-pill">World ID</div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'schedule' && (
        <div className="ios-topbar">
          <div className="ios-topbar-main">
            <div><div className="ios-topbar-title">Schedule</div><div className="ios-topbar-sub">3 upcoming</div></div>
            <button className="ios-btn-small">+ Request</button>
          </div>
        </div>
      )}

      {activeTab === 'health' && (
        <div className="ios-topbar">
          <div className="ios-topbar-main">
            <div><div className="ios-topbar-title">Health</div><div className="ios-topbar-sub">Last updated Mar 25</div></div>
            <div className="ios-avatar" style={{ background: 'linear-gradient(135deg,#f43f5e,#e11d48)' }}>❤️</div>
          </div>
        </div>
      )}

      {activeTab === 'insurance' && (
        <div className="ios-topbar">
          <div className="ios-topbar-main">
            <div><div className="ios-topbar-title">Insurance</div><div className="ios-topbar-sub">Aetna POS II · Active</div></div>
            <button className="ios-btn-text">+ Add</button>
          </div>
        </div>
      )}

      {activeTab === 'profile' && (
        <div className="ios-topbar">
          <div className="ios-topbar-main">
            <div className="ios-topbar-title">Profile</div>
          </div>
        </div>
      )}

      {/* Scrollable content */}
      <div className="ios-content">
        {activeTab === 'home' && <HomeTab isDemoMode={isDemoMode} onShowGrant={() => setShowGrantSheet(true)} />}
        {activeTab === 'schedule' && <ScheduleTab />}
        {activeTab === 'health' && <HealthTab />}
        {activeTab === 'insurance' && <InsuranceTab />}
        {activeTab === 'profile' && <ProfileTab onSignOut={onSignOut} />}
      </div>

      {/* Grant access overlay */}
      {showGrantSheet && (
        <div className="ios-overlay" onClick={() => setShowGrantSheet(false)}>
          <div className="ios-sheet" onClick={e => e.stopPropagation()}>
            <div className="ios-sheet-drag" />
            <div className="ios-sheet-section" style={{ paddingTop: '10px' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#0ea5e9', textTransform: 'uppercase', letterSpacing: '0.6px' }}>Access Request</div>
              <div style={{ fontSize: '13px', color: '#94a3b8', marginTop: '2px' }}>Review what this practice is asking for</div>
            </div>
            <div className="ios-sheet-practice-row">
              <div className="ios-spr-icon" style={{ background: '#fef3c7' }}>🏥</div>
              <div>
                <div className="ios-spr-name">City Family Medicine</div>
                <div className="ios-spr-sub">BoMed Scheduling · @cityfamilymed</div>
              </div>
            </div>
            <div className="ios-sheet-quote">"Schedule check-ups and share visit records with your care team"</div>
            <div className="ios-perm-label">Requested access</div>
            <PermissionRow icon="📅" bg="#e0f2fe" title="View appointments" desc="See your upcoming schedule" checked />
            <PermissionRow icon="📋" bg="#f3e8ff" title="Request appointments" desc="Propose new booking times" checked />
            <PermissionRow icon="🧪" bg="#fce7f3" title="Share visit records" desc="Visit summaries and notes" checked={false} />
            <div className="ios-perm-label">Scheduling policy</div>
            <div className="ios-policy-banner">
              <span style={{ fontSize: '20px' }}>⚡</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '13px', fontWeight: 600, color: '#0f172a' }}>Auto-approve requests</div>
                <div style={{ fontSize: '11px', color: '#64748b', marginTop: '1px' }}>They can book directly without your approval</div>
              </div>
              <IOSToggle checked={false} />
            </div>
            <div className="ios-sheet-cta">
              <button className="ios-btn-grant" onClick={() => setShowGrantSheet(false)}>Grant access</button>
              <button className="ios-btn-deny" onClick={() => setShowGrantSheet(false)}>Deny</button>
            </div>
            <div style={{ height: '16px' }} />
          </div>
        </div>
      )}

      {/* Bottom navigation */}
      <div className="ios-bnav">
        <NavItem icon={<HomeIcon />} label="Home" active={activeTab === 'home'} onClick={() => setActiveTab('home')} />
        <NavItem icon={<CalendarIcon />} label="Schedule" active={activeTab === 'schedule'} onClick={() => setActiveTab('schedule')} />
        <NavItem icon={<HeartIcon />} label="Health" active={activeTab === 'health'} onClick={() => setActiveTab('health')} />
        <NavItem icon={<CardIcon />} label="Insurance" active={activeTab === 'insurance'} onClick={() => setActiveTab('insurance')} />
        <NavItem icon={<UserIcon />} label="Profile" active={activeTab === 'profile'} onClick={() => setActiveTab('profile')} />
      </div>

      {/* Demo panel */}
      {showDemo && (
        <div className="fixed inset-0 z-[9999] bg-black/50 flex items-center justify-center p-6">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full">
            <h3 className="text-lg font-bold text-[#02043d] mb-3">🎭 Demo Mode</h3>
            <p className="text-sm text-[#6b7280] mb-4">You are logged in as the demo patient account.</p>
            <button onClick={() => setShowDemo(false)} className="bm-btn-primary w-full">Close</button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Nav item ───────────────────────────────────────────────────────────────
function NavItem({ icon, label, active, onClick }: { icon: React.ReactNode; label: string; active: boolean; onClick: () => void }) {
  return (
    <div className={`ios-bn-item ${active ? 'active' : ''}`} onClick={onClick}>
      {active && <div className="ios-bn-dot" />}
      <div className="ios-bn-icon">{icon}</div>
      <div className="ios-bn-label">{label}</div>
    </div>
  )
}

// ─── Icons ──────────────────────────────────────────────────────────────────
function HomeIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  )
}

function CalendarIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  )
}

function HeartIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
    </svg>
  )
}

function CardIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1" y="4" width="22" height="16" rx="2" />
      <line x1="1" y1="10" x2="23" y2="10" />
    </svg>
  )
}

function UserIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  )
}

// ─── iOS Toggle ─────────────────────────────────────────────────────────────
function IOSToggle({ checked }: { checked: boolean }) {
  const [isOn, setIsOn] = useState(checked)
  return (
    <div className={`ios-toggle ${isOn ? 'on' : ''}`} onClick={() => setIsOn(!isOn)} />
  )
}

// ─── Permission row ─────────────────────────────────────────────────────────
function PermissionRow({ icon, bg, title, desc, checked }: { icon: string; bg: string; title: string; desc: string; checked: boolean }) {
  const [isOn, setIsOn] = useState(checked)
  return (
    <div className="ios-perm-row">
      <div className="ios-pr-ico" style={{ background: bg }}>{icon}</div>
      <div style={{ flex: 1 }}>
        <div className="ios-pr-name">{title}</div>
        <div className="ios-pr-desc">{desc}</div>
      </div>
      <div className={`ios-toggle ${isOn ? 'on' : ''}`} onClick={() => setIsOn(!isOn)} />
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// HOME TAB
// ═══════════════════════════════════════════════════════════════════════════
function HomeTab({ isDemoMode, onShowGrant }: { isDemoMode: boolean; onShowGrant: () => void }) {
  return (
    <>
      {/* Hero card - next appointment */}
      <div className="ios-hero" onClick={() => {}}>
        <div className="ios-hero-eyebrow"><div className="ios-hero-pulse" />Next appointment</div>
        <div className="ios-hero-time">2:30 PM</div>
        <div className="ios-hero-date">Tuesday, April 1 · 45 min · In person</div>
        <div className="ios-hero-divider" />
        <div className="ios-hero-provider">
          <div className="ios-hero-provider-av">SK</div>
          <div>
            <div className="ios-hero-provider-name">Dr. Sarah Kim</div>
            <div className="ios-hero-provider-role">Physical Therapy · Greenfield PT</div>
          </div>
          <div className="ios-hero-actions">
            <button className="ios-hero-btn ios-hero-btn-secondary">Reschedule</button>
            <button className="ios-hero-btn ios-hero-btn-primary">Directions</button>
          </div>
        </div>
      </div>

      {/* Quick actions */}
      <div className="ios-quick-actions">
        <QuickActionButton icon="📅" label="Request appt" bg="#e0f2fe" />
        <QuickActionButton icon="💳" label="Insurance" bg="#fef3c7" />
        <QuickActionButton icon="❤️" label="Health data" bg="#fce7f3" />
        <QuickActionButton icon="📋" label="Records" bg="#f3e8ff" />
      </div>

      {/* My practices */}
      <div className="ios-slabel">My Practices</div>
      <div className="ios-practices-scroll">
        <PracticeCard icon="🏃" bg="#e0f2fe" name="Greenfield PT" sub="Next: Apr 1 · 2:30 PM" badgeType="active" />
        <PracticeCard icon="🏥" bg="#fef3c7" name="City Family Med" sub="Requesting access" badgeType="pending" onClick={onShowGrant} />
        <div className="ios-practice-add">
          <div className="ios-practice-add-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0ea5e9" strokeWidth="2.5">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </div>
          <div className="ios-practice-add-label">Connect practice</div>
        </div>
      </div>

      {/* Recent activity */}
      <div className="ios-slabel">Recent</div>
      <ActivityItem icon="✅" bg="#dcfce7" title="PT Session confirmed" sub="Greenfield PT · Apr 1" time="2h ago" badge="Confirmed" badgeClass="badge-confirmed" />
      <ActivityItem icon="💊" bg="#e0f2fe" title="Insurance updated" sub="Aetna POS II propagated" time="Yesterday" badge="Sent" badgeClass="badge-new" />
      <ActivityItem icon="❤️" bg="#fce7f3" title="Vitals logged" sub="BP 118/76 · Weight 142 lbs" time="Mar 25" badge="Via Greenfield" badgeClass="badge-new" />
    </>
  )
}

function QuickActionButton({ icon, label, bg }: { icon: string; label: string; bg: string }) {
  return (
    <div className="ios-qa">
      <div className="ios-qa-icon" style={{ background: bg }}>{icon}</div>
      <div className="ios-qa-label">{label}</div>
    </div>
  )
}

function PracticeCard({ icon, bg, name, sub, badgeType, onClick }: { icon: string; bg: string; name: string; sub: string; badgeType: 'active' | 'pending'; onClick?: () => void }) {
  return (
    <div className="ios-practice-card" onClick={onClick}>
      <div className="ios-pc-icon" style={{ background: bg }}>{icon}</div>
      <div className="ios-pc-name">{name}</div>
      <div className="ios-pc-sub">{sub}</div>
      <div className={`ios-pc-badge ${badgeType}`}>
        {badgeType === 'active' ? 'Active' : 'Review →'}
      </div>
    </div>
  )
}

function ActivityItem({ icon, bg, title, sub, time, badge, badgeClass }: { icon: string; bg: string; title: string; sub: string; time: string; badge: string; badgeClass: string }) {
  return (
    <div className="ios-activity-item">
      <div className="ios-ai-icon" style={{ background: bg }}>{icon}</div>
      <div>
        <div className="ios-ai-title">{title}</div>
        <div className="ios-ai-sub">{sub}</div>
      </div>
      <div className="ios-ai-right">
        <div className="ios-ai-time">{time}</div>
        <div className={`ios-ai-badge ${badgeClass}`}>{badge}</div>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// SCHEDULE TAB
// ═══════════════════════════════════════════════════════════════════════════
function ScheduleTab() {
  return (
    <>
      <div className="ios-slabel">Upcoming</div>
      <AppointmentItem month="APR" day="1" title="PT Session" meta="2:30 PM · Dr. Sarah Kim · 45 min" status="Confirmed" />
      <AppointmentItem month="APR" day="8" title="Follow-up" meta="10:00 AM · Dr. Sarah Kim · 30 min" status="Confirmed" />
      <AppointmentItem month="APR" day="15" title="Evaluation" meta="2:00 PM · Dr. Sarah Kim · 60 min" status="Pending" />
      <div className="ios-slabel" style={{ marginTop: '6px' }}>Past</div>
      <div style={{ opacity: 0.6 }}>
        <AppointmentItem month="MAR" day="25" title="Initial eval" meta="11:00 AM · Dr. Sarah Kim · 60 min" status="Done" />
      </div>
    </>
  )
}

function AppointmentItem({ month, day, title, meta, status }: { month: string; day: string; title: string; meta: string; status: string }) {
  const statusClass = status === 'Confirmed' ? 'badge-confirmed' : status === 'Pending' ? 'badge-pending' : 'badge-done'
  return (
    <div className="ios-appt-item">
      <div className="ios-appt-date-block">
        <div className="ios-adb-month">{month}</div>
        <div className="ios-adb-day">{day}</div>
      </div>
      <div className="ios-appt-divider" />
      <div className="ios-appt-info">
        <div className="ios-appt-title">{title}</div>
        <div className="ios-appt-meta">{meta}</div>
      </div>
      <div className="ios-appt-right">
        <div className={`ios-ai-badge ${statusClass}`}>{status}</div>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// HEALTH TAB
// ═══════════════════════════════════════════════════════════════════════════
function HealthTab() {
  return (
    <>
      <div className="ios-slabel">Vitals</div>
      <VitalRow icon="🫀" bg="#fee2e2" name="Blood Pressure" sub="Via Greenfield PT · Mar 25" value="118/76" unit="mmHg" trend="↓ Normal" trendClass="trend-ok" />
      <VitalRow icon="⚖️" bg="#fef3c7" name="Weight" sub="Via Greenfield PT · Mar 25" value="142" unit="lbs" trend="→ Stable" trendClass="trend-ok" />
      <VitalRow icon="🌡️" bg="#dcfce7" name="Temperature" sub="Via Greenfield PT · Mar 25" value="98.6" unit="°F" trend="✓ Normal" trendClass="trend-ok" />

      <div className="ios-slabel">Documents</div>
      <ActivityItem icon="📄" bg="#e0f2fe" title="Initial Evaluation" sub="Greenfield PT · Mar 25" time="" badge="View" badgeClass="badge-new" />
      <ActivityItem icon="📋" bg="#f3e8ff" title="Treatment Plan" sub="Greenfield PT · Mar 25" time="" badge="View" badgeClass="badge-new" />

      <div style={{ background: '#fff', borderRadius: '16px', padding: '16px', marginTop: '4px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
        <div style={{ fontSize: '13px', color: '#94a3b8', textAlign: 'center', lineHeight: 1.5 }}>
          Your health data is shared only with practices you&apos;ve explicitly granted access to.
        </div>
      </div>
    </>
  )
}

function VitalRow({ icon, bg, name, sub, value, unit, trend, trendClass }: { icon: string; bg: string; name: string; sub: string; value: string; unit: string; trend: string; trendClass: string }) {
  return (
    <div className="ios-vital-row">
      <div className="ios-vital-icon" style={{ background: bg }}>{icon}</div>
      <div>
        <div className="ios-vital-name">{name}</div>
        <div className="ios-vital-sub">{sub}</div>
      </div>
      <div className="ios-vital-value">
        <div className="ios-vital-number">{value}</div>
        <div className="ios-vital-unit">{unit}</div>
        <div className={`ios-vital-trend ${trendClass}`}>{trend}</div>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// INSURANCE TAB
// ═══════════════════════════════════════════════════════════════════════════
function InsuranceTab() {
  return (
    <>
      <div className="ios-ins-card">
        <div className="ios-ic-provider">Aetna</div>
        <div className="ios-ic-name">Aetna POS II</div>
        <div className="ios-ic-plan">Group Health Plan · Active coverage</div>
        <div className="ios-ic-row">
          <div>
            <div className="ios-ic-field-label">Member ID</div>
            <div className="ios-ic-field-value">AET4892710</div>
          </div>
          <div>
            <div className="ios-ic-field-label">Group</div>
            <div className="ios-ic-field-value">00425</div>
          </div>
          <div>
            <div className="ios-ic-field-label">Copay</div>
            <div className="ios-ic-field-value">$25</div>
          </div>
          <div className="ios-ic-chip">✓ Verified</div>
        </div>
      </div>

      <button className="ios-btn-propagate">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
        </svg>
        Propagate to Practices
      </button>
      <div style={{ fontSize: '12px', color: '#94a3b8', textAlign: 'center', marginTop: '-8px', marginBottom: '14px' }}>
        Sends updated coverage to all connected practices
      </div>

      <div className="ios-slabel">Shared with</div>
      <ActivityItem icon="🏃" bg="#e0f2fe" title="Greenfield Physical Therapy" sub="Updated 2 days ago" time="" badge="Current" badgeClass="badge-confirmed" />

      <div className="ios-slabel">Coverage details</div>
      <div className="ios-coverage-box">
        <CoverageRow label="Deductible" value="$500 / $1,500" />
        <CoverageRow label="Out-of-pocket max" value="$4,200 / $6,000" />
        <CoverageRow label="PT visits covered" value="20 remaining" valueColor="#16a34a" />
        <CoverageRow label="Plan year" value="Jan 2026 – Dec 2026" last />
      </div>
    </>
  )
}

function CoverageRow({ label, value, valueColor, last }: { label: string; value: string; valueColor?: string; last?: boolean }) {
  return (
    <div className="ios-coverage-row" style={{ borderBottom: last ? 'none' : '1px solid #f8fafc' }}>
      <span style={{ color: '#64748b', fontWeight: 500 }}>{label}</span>
      <span style={{ fontWeight: 700, color: valueColor || '#0f172a' }}>{value}</span>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// PROFILE TAB
// ═══════════════════════════════════════════════════════════════════════════
function ProfileTab({ onSignOut }: { onSignOut: () => void }) {
  return (
    <>
      <div className="ios-profile-hero">
        <div className="ios-ph-avatar">DE</div>
        <div className="ios-ph-name">Dana Ellison</div>
        <div className="ios-ph-handle">@demopatient · World ID verified ✓</div>
        <div style={{ marginTop: '12px', display: 'flex', gap: '8px' }}>
          <div style={{ flex: 1, background: '#f8fafc', borderRadius: '12px', padding: '10px', textAlign: 'center' }}>
            <div style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a' }}>2</div>
            <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 600, marginTop: '1px' }}>Practices</div>
          </div>
          <div style={{ flex: 1, background: '#f8fafc', borderRadius: '12px', padding: '10px', textAlign: 'center' }}>
            <div style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a' }}>7</div>
            <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 600, marginTop: '1px' }}>Appointments</div>
          </div>
          <div style={{ flex: 1, background: '#f8fafc', borderRadius: '12px', padding: '10px', textAlign: 'center' }}>
            <div style={{ fontSize: '18px', fontWeight: 800, color: '#16a34a' }}>Active</div>
            <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 600, marginTop: '1px' }}>Coverage</div>
          </div>
        </div>
      </div>

      <div className="ios-slabel">Personal info</div>
      <SettingRow icon="👤" bg="#e0f2fe" title="Date of birth" sub="May 12, 1988" />
      <SettingRow icon="📍" bg="#f3e8ff" title="Address" sub="123 Main St, Springfield" />
      <SettingRow icon="📞" bg="#fce7f3" title="Emergency contact" sub="Not set" />

      <div className="ios-slabel">Access & permissions</div>
      <SettingRow icon="🏃" bg="#dcfce7" title="Greenfield PT" sub="3 permissions · Active" />
      <SettingRow icon="🏥" bg="#fef3c7" title="City Family Med" sub="Pending review" badge="Review" />

      <div className="ios-slabel">Account</div>
      <SettingRow icon="🔔" bg="#f1f5f9" title="Notifications" sub="Appointments, reminders" />
      <SettingRow icon="🔐" bg="#f1f5f9" title="Security" sub="World ID · Passkey" />
      <div className="ios-setting-row" onClick={onSignOut}>
        <div className="ios-sr-icon" style={{ background: '#fee2e2' }}>🚪</div>
        <div>
          <div className="ios-sr-title" style={{ color: '#ef4444' }}>Sign out</div>
        </div>
      </div>
    </>
  )
}

function SettingRow({ icon, bg, title, sub, badge }: { icon: string; bg: string; title: string; sub: string; badge?: string }) {
  return (
    <div className="ios-setting-row">
      <div className="ios-sr-icon" style={{ background: bg }}>{icon}</div>
      <div>
        <div className="ios-sr-title">{title}</div>
        <div className="ios-sr-sub">{sub}</div>
      </div>
      {badge ? (
        <div style={{ padding: '3px 10px', background: '#fef3c7', borderRadius: '20px', fontSize: '10px', fontWeight: 700, color: '#d97706' }}>{badge}</div>
      ) : (
        <div className="ios-sr-arrow">›</div>
      )}
    </div>
  )
}

export default function Home() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-white" />}>
      <HomeContent />
    </Suspense>
  )
}
