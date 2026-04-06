'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { MiniKit, VerifyCommandInput, VerificationLevel } from '@worldcoin/minikit-js'
import { AutoBookFeed } from './components/AutoBookFeed'

type Step = 'welcome' | 'setup' | 'calendar' | 'dashboard' | 'sending-request'
type Tab = 'home' | 'schedule' | 'health' | 'insurance' | 'profile'

// Policy type for grants
type Policy = {
  autoApprove: boolean
  requireConfirmation: boolean
  allowRescheduling: boolean
}

const DEFAULT_POLICY: Policy = {
  autoApprove: false,
  requireConfirmation: true,
  allowRescheduling: true,
}

// ─── QR Code Scanner ────────────────────────────────────────────────────────
function decodeQR(imageData: ImageData): string | null {
  try {
    const jsQR = require('jsqr')
    const code = jsQR(imageData.data, imageData.width, imageData.height)
    return code ? code.data : null
  } catch {
    return null
  }
}

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
  const [worldIdPayload, setWorldIdPayload] = useState<any>(null)
  const [worldIdAction, setWorldIdAction] = useState<string | null>(null)
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

    // Returning from Google social login via Bolospot
    const googleToken = searchParams.get('google_token')
    const googleHandle = searchParams.get('handle')
    if (googleToken && googleHandle) {
      setBoloToken(googleToken)
      setHandle(googleHandle)
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
        setWorldIdPayload(finalPayload)
        setWorldIdAction(String(verifyPayload.action))
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
          body: JSON.stringify({ handle: tryHandle, nullifierHash: hash, displayName, email: email.trim() || undefined, worldIdPayload, worldIdAction }),
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
      <main className="min-h-screen bg-white flex flex-col items-center justify-start px-6 pt-12 pb-6">
        <div className="w-full max-w-sm mx-auto flex flex-col items-center gap-4">

          {/* Logo + wordmark */}
          <div className="flex flex-col items-center gap-2">
            <LogoMark size="md" />
            <div className="text-center">
              <h1 className="text-3xl font-bold text-[#02043d] tracking-tight">BoMed</h1>
              <p className="text-sm text-[#6b7280] mt-0.5">Patient Identity Portal</p>
            </div>
          </div>

          {/* Feature list */}
          <div className="w-full flex flex-col gap-1.5">
            {[
              { title: 'Proof of personhood', desc: 'No passwords, no forms — just you' },
              { title: 'Scoped permissions', desc: 'Share only exactly what you choose' },
              { title: 'Instant revocation', desc: 'Always in control of your data' },
            ].map(f => (
              <div key={f.title} className="flex items-center gap-3">
                <div className="w-5 h-5 rounded-full bg-[#0d9488] flex items-center justify-center flex-shrink-0">
                  <CheckIcon />
                </div>
                <span className="text-sm text-[#4b5563]">
                  <span className="font-semibold text-[#02043d]">{f.title}</span> — {f.desc}
                </span>
              </div>
            ))}
          </div>

          {/* CTA */}
          <div className="w-full flex flex-col gap-2">

            {/* Not in World App — compact notice */}
            {!isMiniApp && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#fef3c7] border border-[#fde68a]">
                <span className="text-sm flex-shrink-0">⌀</span>
                <p className="text-xs text-[#78350f]">
                  Open in World App for real verification, or try the demo below.
                </p>
              </div>
            )}

            <button
              onClick={() => setStep('setup')}
              className="bm-btn-primary"
            >
              {isMiniApp ? (
                <>
                  Create my account
                  <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none"
                    stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 8h10M9 4l4 4-4 4" />
                  </svg>
                </>
              ) : (
                <>⌀ Verify with World ID</>
              )}
            </button>

            {!isMiniApp && (
              <>
                <a
                  href={`https://api.bolospot.com/api/auth/google/authorize?returnApp=bomed`}
                  className="bm-btn-secondary flex items-center justify-center gap-3 no-underline"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                  Continue with Google
                </a>

                <div className="flex items-center gap-2">
                  <div className="flex-1 h-px bg-[#e5e7eb]" />
                  <span className="text-xs text-[#9ca3af] font-medium">or</span>
                  <div className="flex-1 h-px bg-[#e5e7eb]" />
                </div>

                <button
                  onClick={() => {
                    setHandle('@demopatient')
                    setStep('dashboard')
                  }}
                  className="bm-btn-secondary flex items-center justify-center gap-2"
                >
                  🎭 Try the demo — no account needed
                </button>
              </>
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
        const returnUrl = encodeURIComponent(`${process.env.NEXT_PUBLIC_APP_URL || 'https://world.bomed.ai'}`)
        const res = await fetch(`${process.env.NEXT_PUBLIC_BOLO_API_URL || 'https://api.bolospot.com'}/api/connections/google/authorize?returnUrl=${returnUrl}`, {
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
      <main className="min-h-screen bg-white flex flex-col items-center justify-center px-6 py-24">
        <div className="w-full max-w-sm mx-auto flex flex-col items-center justify-center flex-1 gap-6">
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
    // Demo mode only if no real handle was set (i.e. not logged in via World ID or Google)
    const isDemoMode = !handle || handle === '@demopatient' || handle === 'demopatient'
    return <Dashboard handle={handle} boloToken={boloToken} isDemoMode={isDemoMode} onSignOut={() => setStep('welcome')} />
  }

  return null
}

// ═══════════════════════════════════════════════════════════════════════════
// DASHBOARD (iOS-style with bottom nav)
// ═══════════════════════════════════════════════════════════════════════════
function Dashboard({ handle, boloToken, isDemoMode, onSignOut }: { handle: string; boloToken: string | null; isDemoMode: boolean; onSignOut: () => void }) {
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
        {activeTab === 'home' && <HomeTab handle={handle} boloToken={boloToken} isDemoMode={isDemoMode} onShowGrant={() => setShowGrantSheet(true)} />}
        {activeTab === 'schedule' && <ScheduleTab handle={handle} boloToken={boloToken} />}
        {activeTab === 'health' && <HealthTab />}
        {activeTab === 'insurance' && <InsuranceTab />}
        {activeTab === 'profile' && <ProfileTab onSignOut={onSignOut} handle={userHandle} displayName={displayName} />}
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
            <div style={{ height: '12px' }} />
          </div>
        </div>
      )}

      {/* Bottom navigation */}
      <div className="ios-bnav">
        <NavItem icon={<HomeIcon />} label="Home" active={activeTab === 'home'} onClick={() => setActiveTab('home')} />
        <NavItem icon={<CalendarIcon />} label="Schedule" active={activeTab === 'schedule'} onClick={() => setActiveTab('schedule')} />
        <NavItem icon={<HeartIcon />} label="Health" active={false} onClick={() => {}} disabled />
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
function NavItem({ icon, label, active, onClick, disabled }: { icon: React.ReactNode; label: string; active: boolean; onClick: () => void; disabled?: boolean }) {
  return (
    <div
      className={`ios-bn-item ${active ? 'active' : ''} ${disabled ? 'opacity-30 cursor-not-allowed' : ''}`}
      onClick={disabled ? undefined : onClick}
      title={disabled ? 'Coming soon' : undefined}
    >
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
function HomeTab({ handle, boloToken, isDemoMode, onShowGrant }: { handle: string; boloToken: string | null; isDemoMode: boolean; onShowGrant: () => void }) {
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
        <QuickActionButton icon="❤️" label="Health data" bg="#f3f4f6" disabled />
        <QuickActionButton icon="📋" label="Records" bg="#f3f4f6" disabled />
      </div>

      {/* REAL COMPONENTS BELOW */}
      <div style={{ marginTop: '32px' }} />
      <div className="flex flex-col gap-[32px]">
        <AutoBookFeed handle={handle} boloToken={boloToken} isDemoMode={isDemoMode} />
        <ConnectPractice handle={handle} boloToken={boloToken} isDemoMode={isDemoMode} />
        <PendingRequests handle={handle} boloToken={boloToken} isDemoMode={isDemoMode} />
        <ActiveGrants handle={handle} boloToken={boloToken} isDemoMode={isDemoMode} />
      </div>
    </>
  )
}

function QuickActionButton({ icon, label, bg, disabled }: { icon: string; label: string; bg: string; disabled?: boolean }) {
  return (
    <div className={`ios-qa ${disabled ? 'opacity-30 cursor-not-allowed' : ''}`} title={disabled ? 'Coming soon' : undefined}>
      <div className="ios-qa-icon" style={{ background: bg }}>{disabled ? '🔒' : icon}</div>
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
function ScheduleTab({ handle, boloToken }: { handle: string; boloToken: string | null }) {
  return (
    <>
      <div className="ios-slabel">Upcoming</div>
      <AppointmentItem month="APR" day="1" title="PT Session" meta="2:30 PM · Dr. Sarah Kim · 45 min" status="Confirmed" />
      <AppointmentItem month="APR" day="8" title="Follow-up" meta="10:00 AM · Dr. Sarah Kim · 30 min" status="Confirmed" />
      <AppointmentItem month="APR" day="15" title="Evaluation" meta="2:00 PM · Dr. Sarah Kim · 60 min" status="Pending" />
      <div className="ios-slabel">Past</div>
      <div style={{ opacity: 0.6 }}>
        <AppointmentItem month="MAR" day="25" title="Initial eval" meta="11:00 AM · Dr. Sarah Kim · 60 min" status="Done" />
      </div>

      {/* REAL APPOINTMENTS (relay inbox messages) */}
      <div style={{ marginTop: '32px' }} />
      <Appointments handle={handle} boloToken={boloToken} />
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

      <div style={{ background: '#fff', borderRadius: '16px', padding: '16px', marginTop: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
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
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════
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

function LoadingRows() {
  return (
    <div className="divide-y divide-[#f1f3f8]">
      {[1, 2, 3].map(i => (
        <div key={i} className="flex items-center gap-3 px-4 py-3 animate-pulse">
          <div className="w-9 h-9 rounded-full bg-[#f1f3f8] shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-3 bg-[#f1f3f8] rounded w-2/3" />
            <div className="h-2 bg-[#f1f3f8] rounded w-1/2" />
          </div>
        </div>
      ))}
    </div>
  )
}

function EmptyState({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-6 text-center min-h-[200px]">
      <div className="w-11 h-11 rounded-xl bg-[#f4f6fb] flex items-center justify-center mb-3">
        {icon}
      </div>
      <p className="text-sm font-semibold text-[#02043d] mb-1">{title}</p>
      <p className="text-xs text-[#9ca3af] leading-relaxed max-w-[220px]">{desc}</p>
    </div>
  )
}

function PolicyControls({
  policy,
  onChange,
  scopeHasAppointments,
}: {
  policy: Policy
  onChange: (p: Policy) => void
  scopeHasAppointments: boolean
}) {
  if (!scopeHasAppointments) return null
  return (
    <div className="mt-3 pt-3 border-t border-[#f1f3f8] space-y-2">
      <p className="text-[11px] font-semibold text-[#9ca3af] uppercase tracking-wide mb-1">Appointment policy</p>
      {(
        [
          { key: 'autoApprove', label: 'Auto-approve future requests' },
          { key: 'requireConfirmation', label: 'Require confirmation' },
          { key: 'allowRescheduling', label: 'Allow rescheduling' },
        ] as { key: keyof Policy; label: string }[]
      ).map(({ key, label }) => (
        <label key={key} className="flex items-center justify-between gap-2 cursor-pointer">
          <span className="text-xs text-[#4b5563]">{label}</span>
          <input
            type="checkbox"
            className="sr-only peer"
            checked={policy[key] as boolean}
            onChange={e => onChange({ ...policy, [key]: e.target.checked })}
          />
          <span className="relative w-9 h-5 bg-[#e5e7eb] peer-checked:bg-[#0d9488] rounded-full transition-colors after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:w-4 after:h-4 after:bg-white after:rounded-full after:transition-transform peer-checked:after:translate-x-4" />
        </label>
      ))}
    </div>
  )
}

// PATIENT PROFILE (insurance, DOB, address)
// ═══════════════════════════════════════════════════════════════════════════
function PatientProfile() {
  const [isExpanded, setIsExpanded] = useState(false)
  const [saved, setSaved] = useState(false)
  const [profile, setProfile] = useState({
    dob: '',
    address: '',
    city: '',
    state: '',
    zip: '',
    insuranceProvider: '',
    memberId: '',
    groupNumber: '',
    insurancePhone: '',
  })

  function handleChange(field: string, value: string) {
    setProfile(prev => ({ ...prev, [field]: value }))
    setSaved(false)
  }

  function handleSave() {
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  const hasInsurance = profile.insuranceProvider || profile.memberId

  return (
    <section className="bm-card overflow-hidden">
      <div className="flex items-center justify-between px-4 pt-4 pb-3">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-bold text-[#02043d]">My Profile</h3>
          {hasInsurance && (
            <span className="text-[11px] font-semibold text-[#0d9488] bg-[#ccfbf1] border border-[rgba(13,148,136,0.2)] rounded-full px-2 py-0.5">
              Insurance on file
            </span>
          )}
        </div>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-7 h-7 rounded-lg bg-[#f4f6fb] hover:bg-[#e5e7eb] transition-colors flex items-center justify-center text-[#6b7280]"
        >
          <svg className="w-4 h-4 transition-transform" style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}
            viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 6l4 4 4-4" />
          </svg>
        </button>
      </div>

      {!isExpanded && (
        <div className="px-4 pb-4 flex gap-4">
          {[
            { icon: '📋', label: 'Insurance', filled: !!profile.insuranceProvider },
            { icon: '🎂', label: 'Date of birth', filled: !!profile.dob },
            { icon: '🏠', label: 'Address', filled: !!profile.address },
          ].map(item => (
            <button key={item.label} onClick={() => setIsExpanded(true)}
              className="flex-1 flex flex-col items-center gap-1.5 py-2.5 rounded-xl border border-dashed border-[#e5e7eb] hover:border-[#0d9488] hover:bg-[#f0fdfa] transition-all">
              <span className="text-lg">{item.icon}</span>
              <span className={`text-[10px] font-semibold ${item.filled ? 'text-[#0d9488]' : 'text-[#9ca3af]'}`}>
                {item.filled ? '✓ ' : '+ '}{item.label}
              </span>
            </button>
          ))}
        </div>
      )}

      {isExpanded && (
        <div className="px-4 pb-4 flex flex-col gap-5 border-t border-[#f1f3f8] pt-4">

          {/* Date of birth */}
          <div>
            <label className="block text-xs font-semibold text-[#6b7280] mb-1.5">🎂 Date of birth</label>
            <input type="date" value={profile.dob}
              onChange={e => handleChange('dob', e.target.value)}
              className="bm-input w-full" />
          </div>

          {/* Address */}
          <div className="flex flex-col gap-2">
            <label className="block text-xs font-semibold text-[#6b7280]">🏠 Home address</label>
            <input type="text" value={profile.address} placeholder="Street address"
              onChange={e => handleChange('address', e.target.value)}
              className="bm-input w-full" />
            <div className="grid grid-cols-3 gap-2">
              <input type="text" value={profile.city} placeholder="City"
                onChange={e => handleChange('city', e.target.value)}
                className="bm-input col-span-1" />
              <input type="text" value={profile.state} placeholder="State" maxLength={2}
                onChange={e => handleChange('state', e.target.value.toUpperCase())}
                className="bm-input col-span-1" />
              <input type="text" value={profile.zip} placeholder="ZIP"
                onChange={e => handleChange('zip', e.target.value)}
                className="bm-input col-span-1" />
            </div>
          </div>

          {/* Insurance */}
          <div className="flex flex-col gap-2">
            <label className="block text-xs font-semibold text-[#6b7280]">🏥 Insurance</label>
            <input type="text" value={profile.insuranceProvider} placeholder="Provider (e.g. Blue Cross)"
              onChange={e => handleChange('insuranceProvider', e.target.value)}
              className="bm-input w-full" />
            <div className="grid grid-cols-2 gap-2">
              <input type="text" value={profile.memberId} placeholder="Member ID"
                onChange={e => handleChange('memberId', e.target.value)}
                className="bm-input" />
              <input type="text" value={profile.groupNumber} placeholder="Group #"
                onChange={e => handleChange('groupNumber', e.target.value)}
                className="bm-input" />
            </div>
            <input type="tel" value={profile.insurancePhone} placeholder="Insurance phone (optional)"
              onChange={e => handleChange('insurancePhone', e.target.value)}
              className="bm-input w-full" />
          </div>

          <button onClick={handleSave}
            className={`bm-btn-primary transition-all ${saved ? 'bg-[#16a34a] border-[#16a34a]' : ''}`}>
            {saved ? '✓ Saved' : 'Save profile'}
          </button>

        </div>
      )}
    </section>
  )
}

const CONNECT_SCOPES = [
  { id: 'appointments:read',    label: 'Appointments', icon: '📅', desc: 'View & book appointments' },
  { id: 'insurance:read',       label: 'Insurance',    icon: '🏥', desc: 'Verify coverage' },
  { id: 'demographics:read',    label: 'Address & DOB', icon: '👤', desc: 'Name, address, date of birth' },
  { id: 'vitals:write',         label: 'Vitals',       icon: '💓', desc: 'Send readings to provider' },
]

function ConnectPractice({ handle, boloToken, isDemoMode }: { handle: string; boloToken: string | null; isDemoMode: boolean }) {
  const [isExpanded, setIsExpanded]       = useState(false)
  const [practiceHandleInput, setPracticeHandleInput] = useState('')
  const [isConnecting, setIsConnecting]   = useState(false)
  const [successMessage, setSuccessMessage] = useState('')
  const [errorMessage, setErrorMessage]   = useState('')
  const [isScanning, setIsScanning]       = useState(false)
  const [selectedScopes, setSelectedScopes] = useState<Set<string>>(new Set(['appointments:read']))

  function toggleConnectScope(id: string) {
    setSelectedScopes(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  async function handleConnect() {
    if (!practiceHandleInput.trim()) return

    setIsConnecting(true)
    setErrorMessage('')
    setSuccessMessage('')

    // Demo mode — no API needed
    if (isDemoMode || !boloToken) {
      await new Promise(r => setTimeout(r, 800))
      setSuccessMessage(`✓ Connected to @${practiceHandleInput.replace(/^@/, '')} (demo)`)
      setPracticeHandleInput('')
      setTimeout(() => { setSuccessMessage(''); setIsExpanded(false) }, 2500)
      setIsConnecting(false)
      return
    }

    try {
      const res = await fetch('/api/practice/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          practiceHandle: practiceHandleInput,
          patientHandle: handle,
          boloToken,
          scopes: Array.from(selectedScopes),
        }),
      })

      const data = await res.json()

      if (data.success) {
        setSuccessMessage(`✓ Connected to @${practiceHandleInput.replace(/^@/, '')}`)
        setPracticeHandleInput('')
        setTimeout(() => {
          setSuccessMessage('')
          setIsExpanded(false)
        }, 3000)
      } else {
        setErrorMessage(data.error || 'Failed to connect')
      }
    } catch (error) {
      setErrorMessage('Network error. Please try again.')
    } finally {
      setIsConnecting(false)
    }
  }

  async function handleQRScan(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setIsScanning(true)
    setErrorMessage('')

    try {
      const img = new Image()
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')

      img.onload = async () => {
        canvas.width = img.width
        canvas.height = img.height
        ctx?.drawImage(img, 0, 0)

        const imageData = ctx?.getImageData(0, 0, canvas.width, canvas.height)
        if (!imageData) {
          setErrorMessage('Failed to read image')
          setIsScanning(false)
          return
        }

        const qrData = decodeQR(imageData)
        if (!qrData) {
          setErrorMessage('No QR code found in image')
          setIsScanning(false)
          return
        }

        // Extract practice handle from URL
        // Expected format: https://bomed.world/?practice=greenfieldpt&scopes=...
        try {
          const url = new URL(qrData)
          const practice = url.searchParams.get('practice')
          const scopesParam = url.searchParams.get('scopes')

          if (!practice) {
            setErrorMessage('Invalid QR code: no practice handle found')
            setIsScanning(false)
            return
          }

          const scopes = scopesParam ? scopesParam.split(',') : undefined

          // Auto-connect
          const res = await fetch('/api/practice/connect', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              practiceHandle: practice,
              patientHandle: handle,
              boloToken,
              scopes,
            }),
          })

          const data = await res.json()

          if (data.success) {
            setSuccessMessage(`✓ Connected to @${practice}`)
            setTimeout(() => {
              setSuccessMessage('')
              setIsExpanded(false)
            }, 3000)
          } else {
            setErrorMessage(data.error || 'Failed to connect')
          }
        } catch {
          setErrorMessage('Invalid QR code format')
        } finally {
          setIsScanning(false)
        }
      }

      img.onerror = () => {
        setErrorMessage('Failed to load image')
        setIsScanning(false)
      }

      img.src = URL.createObjectURL(file)
    } catch {
      setErrorMessage('Failed to process image')
      setIsScanning(false)
    }
  }

  return (
    <section className="bm-card overflow-hidden">
      <div className="flex items-center justify-between px-4 pt-4 pb-3">
        <h3 className="text-sm font-bold text-[#02043d]">Connect a Practice</h3>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-7 h-7 rounded-lg bg-[#0d9488] hover:bg-[#0f766e] transition-colors flex items-center justify-center text-white"
          aria-label={isExpanded ? 'Collapse' : 'Expand'}
        >
          <svg
            className="w-4 h-4 transition-transform"
            style={{ transform: isExpanded ? 'rotate(45deg)' : 'rotate(0deg)' }}
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M8 3v10M3 8h10" />
          </svg>
        </button>
      </div>

      {isExpanded && (
        <div className="px-4 pb-4 flex flex-col gap-4 border-t border-[#f1f3f8] pt-4">
          {/* Success message */}
          {successMessage && (
            <div className="px-3 py-2.5 rounded-lg bg-[#f0fdf4] border border-[#86efac] text-sm text-[#15803d] font-medium">
              {successMessage}
            </div>
          )}

          {/* Error message */}
          {errorMessage && (
            <div className="px-3 py-2.5 rounded-lg bg-[#fef2f2] border border-[#fca5a5] text-sm text-[#dc2626] font-medium">
              {errorMessage}
            </div>
          )}

          {/* Example practices */}
          <div>
            <label className="block text-xs font-semibold text-[#6b7280] mb-2">
              Quick connect
            </label>
            <div className="flex flex-wrap gap-2">
              {[
                { name: 'Greenfield PT', handle: 'greenfieldpt' },
                { name: 'Lang Family Practice', handle: 'langfamilypractice' },
                { name: 'GM Orthopedic', handle: 'gmorthopedic' },
              ].map(p => (
                <button
                  key={p.handle}
                  onClick={() => setPracticeHandleInput(p.handle)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                    practiceHandleInput === p.handle
                      ? 'bg-[#0d9488] text-white border-[#0d9488]'
                      : 'bg-white text-[#4b5563] border-[#e5e7eb] hover:border-[#0d9488] hover:text-[#0d9488]'
                  }`}
                >
                  {p.name}
                </button>
              ))}
            </div>
          </div>

          {/* Scope selection */}
          <div>
            <label className="block text-xs font-semibold text-[#6b7280] mb-2">
              What to share
            </label>
            <div className="flex flex-col divide-y divide-[#f1f3f8] rounded-xl border border-[#e5e7eb] overflow-hidden">
              {CONNECT_SCOPES.map(scope => (
                <label key={scope.id} className="flex items-center justify-between px-3 py-2.5 bg-white cursor-pointer hover:bg-[#f9fafb] transition-colors">
                  <div className="flex items-center gap-2.5">
                    <span className="text-base">{scope.icon}</span>
                    <div>
                      <p className="text-sm font-medium text-[#02043d]">{scope.label}</p>
                      <p className="text-[11px] text-[#9ca3af]">{scope.desc}</p>
                    </div>
                  </div>
                  <label className="bm-toggle">
                    <input
                      type="checkbox"
                      checked={selectedScopes.has(scope.id)}
                      onChange={() => toggleConnectScope(scope.id)}
                    />
                    <span className="bm-toggle-track" />
                  </label>
                </label>
              ))}
            </div>
          </div>

          {/* Type handle */}
          <div>
            <label className="block text-xs font-semibold text-[#6b7280] mb-2">
              Or type handle
            </label>
            <div className="flex gap-2">
              <div className="flex-1 flex rounded-xl border border-[#e5e7eb] focus-within:border-[#0d9488] focus-within:ring-2 focus-within:ring-[#0d9488]/10 overflow-hidden">
                <span className="flex items-center px-3 bg-[#f4f6fb] border-r border-[#e5e7eb] text-sm font-semibold text-[#9ca3af] select-none">
                  @
                </span>
                <input
                  type="text"
                  value={practiceHandleInput}
                  onChange={e => setPracticeHandleInput(e.target.value.replace(/^@/, ''))}
                  onKeyDown={e => e.key === 'Enter' && handleConnect()}
                  placeholder="greenfieldpt"
                  className="flex-1 px-3 py-2.5 bg-white text-sm font-medium text-[#02043d] outline-none placeholder-[#9ca3af]/60"
                  disabled={isConnecting}
                />
              </div>
              <button
                onClick={handleConnect}
                disabled={!practiceHandleInput.trim() || isConnecting}
                className="bm-btn-teal px-4 py-2.5 text-sm whitespace-nowrap"
              >
                {isConnecting ? (
                  <>
                    <Spinner />
                    Connecting...
                  </>
                ) : (
                  'Connect'
                )}
              </button>
            </div>
          </div>

          {/* OR divider */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-[#e5e7eb]" />
            <span className="text-xs text-[#9ca3af] font-medium">or</span>
            <div className="flex-1 h-px bg-[#e5e7eb]" />
          </div>

          {/* Scan QR */}
          <div>
            <label className="block text-xs font-semibold text-[#6b7280] mb-2">
              Scan QR code
            </label>
            <label className="bm-btn-teal w-full flex items-center justify-center gap-2 cursor-pointer">
              <input
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleQRScan}
                className="hidden"
                disabled={isScanning || !boloToken}
              />
              {isScanning ? (
                <>
                  <Spinner />
                  Scanning...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                  </svg>
                  Scan with Camera
                </>
              )}
            </label>
          </div>
        </div>
      )}
    </section>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// PENDING REQUESTS
// ═══════════════════════════════════════════════════════════════════════════
const DEMO_REQUESTS = [
  {
    id: 'demo-req-1',
    fromName: 'Greenfield Physical Therapy',
    fromHandle: '@greenfieldpt',
    widgetName: 'BoMed Scheduling',
    reason: 'Book PT sessions and receive appointment reminders',
    scopes: ['appointments:read', 'appointments:request', 'vitals:write'],
  },
  {
    id: 'demo-req-2',
    fromName: 'City Dental Associates',
    fromHandle: '@citydental',
    widgetName: 'BoMed Check-In',
    reason: 'Verify insurance and manage appointment scheduling',
    scopes: ['appointments:read', 'insurance:read'],
  },
]

function PendingRequests({ handle, boloToken, isDemoMode }: { handle: string; boloToken: string | null; isDemoMode: boolean }) {
  const [requests, setRequests] = useState<any[]>(isDemoMode ? DEMO_REQUESTS : [])
  const [loading, setLoading]   = useState(!isDemoMode)

  useEffect(() => {
    if (!isDemoMode) {
      fetchRequests()
    }
  }, [handle, boloToken, isDemoMode])

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
    if (isDemoMode) {
      // In demo mode, just remove from local state
      setRequests(prev => prev.filter(r => r.id !== requestId))
      return
    }

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

  function handleReset() {
    setRequests(DEMO_REQUESTS)
  }

  return (
    <Section
      title="Incoming Requests"
      badge={requests.length > 0 ? `${requests.length} pending` : undefined}
    >
      {loading ? <LoadingRows /> : requests.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 px-6 text-center min-h-[200px]">
          <div className="w-11 h-11 rounded-xl bg-[#f4f6fb] flex items-center justify-center mb-3">
            <svg className="w-5 h-5 text-[#9ca3af]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" /></svg>
          </div>
          <p className="text-sm font-semibold text-[#02043d] mb-1">All clear</p>
          <p className="text-xs text-[#9ca3af] leading-relaxed max-w-[220px] mb-3">No pending permission requests</p>
          {isDemoMode && (
            <button
              onClick={handleReset}
              className="text-xs font-medium text-[#0d9488] hover:text-[#0f766e] underline"
            >
              Reset demo requests
            </button>
          )}
        </div>
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
                  {{
                    'appointments:read':    <><p className="text-sm font-medium text-[#02043d]">View appointments</p><p className="text-[11px] text-[#9ca3af]">See your upcoming schedule</p></>,
                    'appointments:request': <><p className="text-sm font-medium text-[#02043d]">Request appointments</p><p className="text-[11px] text-[#9ca3af]">Ask to book new slots</p></>,
                    'appointments:book':    <><p className="text-sm font-medium text-[#02043d]">Book appointments</p><p className="text-[11px] text-[#9ca3af]">Book directly on your behalf</p></>,
                    'insurance:read':       <><p className="text-sm font-medium text-[#02043d]">View insurance</p><p className="text-[11px] text-[#9ca3af]">Verify your coverage</p></>,
                    'insurance:write':      <><p className="text-sm font-medium text-[#02043d]">Update insurance</p><p className="text-[11px] text-[#9ca3af]">Add or change coverage info</p></>,
                    'demographics:read':    <><p className="text-sm font-medium text-[#02043d]">Address & date of birth</p><p className="text-[11px] text-[#9ca3af]">Name, address, DOB</p></>,
                    'vitals:write':         <><p className="text-sm font-medium text-[#02043d]">Log health readings</p><p className="text-[11px] text-[#9ca3af]">Track vitals like BP, weight, temp</p></>,
                    'vitals:read':          <><p className="text-sm font-medium text-[#02043d]">View health readings</p><p className="text-[11px] text-[#9ca3af]">See your logged vitals</p></>,
                    'labs:read':            <><p className="text-sm font-medium text-[#02043d]">View lab results</p><p className="text-[11px] text-[#9ca3af]">Access test results</p></>,
                    'medications:read':     <><p className="text-sm font-medium text-[#02043d]">View medications</p><p className="text-[11px] text-[#9ca3af]">See your prescriptions</p></>,
                  }[scope] || <><p className="text-sm font-medium text-[#02043d]">{scope.split(':')[0].charAt(0).toUpperCase() + scope.split(':')[0].slice(1)}</p><p className="text-[11px] text-[#9ca3af]">{scope.replace(/[_:]/g, ' ')}</p></>}
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
function ActiveGrants({ handle, boloToken, isDemoMode }: { handle: string; boloToken: string | null; isDemoMode: boolean }) {
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
                  <p className="text-sm font-bold text-[#02043d] truncate">@{(grant.granteeHandle || '').replace(/^@+/, '')}</p>
                  <span className="badge-granted text-[11px] px-2.5 py-0.5 rounded-full whitespace-nowrap">Active</span>
                </div>
                <p className="text-xs text-[#9ca3af] mb-2">{grant.widgetName || grant.widget || 'BoMed'}</p>
                <div className="flex flex-wrap gap-1 mb-3">
                  {(grant.scopes || []).map((scope: string) => {
                    const labels: Record<string, string> = {
                      'appointments:read': '📅 Appointments',
                      'appointments:request': '📅 Appt requests',
                      'appointments:book': '📅 Booking',
                      'insurance:read': '🏥 Insurance',
                      'demographics:read': '👤 Demographics',
                      'vitals:write': '💓 Vitals',
                      'vitals:read': '💓 Vitals (read)',
                      'patients:read': '👤 Patient info',
                      'labs:read': '🔬 Labs',
                      'medications:read': '💊 Medications',
                    }
                    return <span key={scope} className="scope-tag">{labels[scope] || scope.replace(/[_:]/g, ' ')}</span>
                  })}
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
            <div className="ios-ic-field-value">W0275548</div>
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

      {/* REAL PATIENT PROFILE */}
      <div style={{ marginTop: '32px' }} />
      <PatientProfile />
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
function ProfileTab({ onSignOut, handle, displayName }: { onSignOut: () => void; handle: string; displayName: string }) {
  const initials = displayName.slice(0, 2).toUpperCase()
  return (
    <>
      <div className="ios-profile-hero">
        <div className="ios-ph-avatar">{initials}</div>
        <div className="ios-ph-name">{displayName}</div>
        <div className="ios-ph-handle">{handle} · World ID verified ✓</div>
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
