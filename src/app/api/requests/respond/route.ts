import { NextRequest, NextResponse } from 'next/server'

const BASE_URL = process.env.BOLO_API_URL || 'https://api.bolospot.com'

export async function POST(req: NextRequest) {
  try {
    const { requestId, approved, scopes, handle, policy } = await req.json()
    const boloToken = req.headers.get('x-bolo-token')

    if (!requestId) {
      return NextResponse.json(
        { success: false, error: 'Request ID required' },
        { status: 400 }
      )
    }

    if (!boloToken) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      )
    }

    // Use PATCH /api/grants/requests/{id} — the real Bolo endpoint
    const res = await fetch(`${BASE_URL}/api/grants/requests/${requestId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${boloToken}`,
      },
      body: JSON.stringify({ approve: approved }),
    })

    if (!res.ok) {
      const text = await res.text()
      console.error('Bolo respond error:', res.status, text)
      return NextResponse.json(
        { success: false, error: `Bolo error: ${res.status}` },
        { status: res.status }
      )
    }

    return NextResponse.json({ success: true, action: approved ? 'granted' : 'denied' })
  } catch (error) {
    console.error('Respond error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to respond' },
      { status: 500 }
    )
  }
}
