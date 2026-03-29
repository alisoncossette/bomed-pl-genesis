import { NextRequest, NextResponse } from 'next/server'

const BASE_URL = process.env.BOLO_API_URL || 'https://api.bolospot.com'

export async function POST(req: NextRequest) {
  try {
    const { handle, password } = await req.json()

    if (!handle || !password) {
      return NextResponse.json(
        { success: false, error: 'Handle and password are required' },
        { status: 400 }
      )
    }

    const cleanHandle = handle.replace(/^@/, '').toLowerCase().trim()

    // Look up the user's email from their handle
    const profileRes = await fetch(`${BASE_URL}/api/users/@${cleanHandle}`)
    if (!profileRes.ok) {
      return NextResponse.json(
        { success: false, error: 'Handle not found' },
        { status: 404 }
      )
    }

    const profile = await profileRes.json()
    const email = profile.email || profile.user?.email

    if (!email) {
      return NextResponse.json(
        { success: false, error: 'Could not resolve account for this handle' },
        { status: 404 }
      )
    }

    // Log in with the resolved email + password
    const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })

    const loginData = await loginRes.json()

    if (!loginRes.ok) {
      return NextResponse.json(
        { success: false, error: loginData.message || 'Invalid password' },
        { status: 401 }
      )
    }

    return NextResponse.json({
      success: true,
      accessToken: loginData.accessToken,
      handle: `@${loginData.user?.handle || cleanHandle}`,
    })
  } catch (error) {
    console.error('Bolo login error:', error)
    return NextResponse.json(
      { success: false, error: 'Login failed. Please try again.' },
      { status: 500 }
    )
  }
}
