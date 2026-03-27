import { NextRequest, NextResponse } from 'next/server'
import { createHash } from 'crypto'

const BASE_URL = process.env.BOLO_API_URL || 'https://api.bolospot.com'

// Derive deterministic credentials from World ID nullifier hash
// This gives every World ID user a real Bolo account without requiring email input
function deriveBoloCredentials(nullifierHash: string) {
  const seed = `worldid:${nullifierHash}`
  const hash = createHash('sha256').update(seed).digest('hex')
  return {
    email: `${hash.slice(0, 16)}@worldid.bomed.ai`,
    password: `WID_${hash.slice(0, 24)}!`,
  }
}

async function boloRegister(email: string, password: string, handle: string, name?: string) {
  const res = await fetch(`${BASE_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, handle, name: name || handle }),
  })
  const data = await res.json()
  if (!res.ok) {
    throw Object.assign(new Error(data.message || 'Registration failed'), { status: res.status, data })
  }
  return data as { accessToken: string; user: { handle: string } }
}

async function boloLogin(email: string, password: string) {
  const res = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  const data = await res.json()
  if (!res.ok) {
    throw Object.assign(new Error(data.message || 'Login failed'), { status: res.status, data })
  }
  return data as { accessToken: string; user: { handle: string } }
}

async function checkHandleAvailable(handle: string): Promise<boolean> {
  try {
    const res = await fetch(`${BASE_URL}/api/users/check-handle/${handle}`)
    if (!res.ok) return true // assume available if API errors
    const data = await res.json()
    return data.available !== false
  } catch {
    return true // assume available if network error
  }
}

export async function POST(req: NextRequest) {
  try {
    const { handle, nullifierHash, displayName } = await req.json()

    if (!handle || !nullifierHash) {
      return NextResponse.json(
        { success: false, error: 'Handle and nullifier hash required' },
        { status: 400 }
      )
    }

    const cleanHandle = handle.replace(/^@/, '').toLowerCase().trim()

    // Check handle availability before attempting registration
    const available = await checkHandleAvailable(cleanHandle)
    if (!available) {
      return NextResponse.json(
        { success: false, error: 'Handle already exists' },
        { status: 409 }
      )
    }

    const { email, password } = deriveBoloCredentials(nullifierHash)

    let accessToken: string
    let boloHandle: string

    try {
      // Try to register as a new user
      const result = await boloRegister(email, password, cleanHandle, displayName)
      accessToken = result.accessToken
      boloHandle = result.user.handle
    } catch (err: any) {
      if (err.status === 409 || err.status === 400) {
        // User already exists (returning user) — log them in
        try {
          const result = await boloLogin(email, password)
          accessToken = result.accessToken
          boloHandle = result.user.handle
        } catch (loginErr: any) {
          console.error('Bolo login failed for returning user:', loginErr)
          return NextResponse.json(
            { success: false, error: 'Could not authenticate with Bolo. Please try again.' },
            { status: 500 }
          )
        }
      } else {
        console.error('Bolo registration error:', err)
        return NextResponse.json(
          { success: false, error: 'Could not create your Bolo identity. Please try again.' },
          { status: 500 }
        )
      }
    }

    return NextResponse.json({
      success: true,
      handle: `@${boloHandle}`,
      accessToken, // return to client for subsequent authenticated calls
    })
  } catch (error) {
    console.error('Handle link error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal error' },
      { status: 500 }
    )
  }
}
