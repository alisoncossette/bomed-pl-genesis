import { NextRequest, NextResponse } from 'next/server'
import { calendarTokens } from '@/lib/calendar-tokens'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const code = searchParams.get('code')
    const state = searchParams.get('state')
    const error = searchParams.get('error')

    const APP_BASE = process.env.NEXT_PUBLIC_APP_URL || 'https://world.bomed.ai'

    if (error) {
      console.error('Google OAuth error:', error)
      return NextResponse.redirect(`${APP_BASE}?calendar=error`)
    }

    if (!code || !state) {
      return NextResponse.redirect(`${APP_BASE}?calendar=error`)
    }

    const handle = decodeURIComponent(state)
    const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID
    const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET
    const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://world.bomed.ai'

    if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
      console.error('Missing Google OAuth credentials')
      return NextResponse.redirect(`${APP_URL}?calendar=error`)
    }

    const redirectUri = `${APP_URL}/api/calendar/callback`

    // Exchange code for tokens
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    })

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text()
      console.error('Token exchange failed:', errorText)
      return NextResponse.redirect(`${APP_URL}?calendar=error`)
    }

    const tokens = await tokenResponse.json()

    // Store tokens in memory
    calendarTokens.set(handle, {
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expiry_date: tokens.expires_in ? Date.now() + tokens.expires_in * 1000 : undefined,
    })

    console.log(`Calendar connected for ${handle}`)

    return NextResponse.redirect(`${APP_URL}?calendar=connected`)
  } catch (error) {
    console.error('Calendar callback error:', error)
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL || 'https://world.bomed.ai'}?calendar=error`)
  }
}
