import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const handle = searchParams.get('handle')

    if (!handle) {
      return NextResponse.json(
        { error: 'Missing handle parameter' },
        { status: 400 }
      )
    }

    const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID
    const APP_URL = process.env.NEXT_PUBLIC_APP_URL

    if (!GOOGLE_CLIENT_ID) {
      return NextResponse.json(
        { error: 'Google Calendar OAuth is not configured (missing GOOGLE_CLIENT_ID)' },
        { status: 503 }
      )
    }

    if (!APP_URL) {
      return NextResponse.json(
        { error: 'App URL is not configured (missing NEXT_PUBLIC_APP_URL)' },
        { status: 503 }
      )
    }

    const redirectUri = `${APP_URL}/api/calendar/callback`
    const scope = 'https://www.googleapis.com/auth/calendar.events'
    const state = encodeURIComponent(handle)

    const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth')
    authUrl.searchParams.set('client_id', GOOGLE_CLIENT_ID)
    authUrl.searchParams.set('redirect_uri', redirectUri)
    authUrl.searchParams.set('response_type', 'code')
    authUrl.searchParams.set('scope', scope)
    authUrl.searchParams.set('state', state)
    authUrl.searchParams.set('access_type', 'offline')
    authUrl.searchParams.set('prompt', 'consent')

    return NextResponse.json({ url: authUrl.toString() })
  } catch (error) {
    console.error('Calendar authorize error:', error)
    return NextResponse.json(
      { error: 'Failed to build authorization URL' },
      { status: 500 }
    )
  }
}
