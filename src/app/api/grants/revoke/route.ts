import { NextRequest, NextResponse } from 'next/server'

const BASE_URL = process.env.BOLO_API_URL || 'https://api.bolospot.com'

export async function POST(req: NextRequest) {
  try {
    const { grantId } = await req.json()
    const boloToken = req.headers.get('x-bolo-token')

    if (!grantId) {
      return NextResponse.json(
        { success: false, error: 'Grant ID required' },
        { status: 400 }
      )
    }

    if (!boloToken) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      )
    }

    // DELETE /api/grants/{id} — the real Bolo revoke endpoint
    const res = await fetch(`${BASE_URL}/api/grants/${grantId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${boloToken}` },
    })

    if (!res.ok) {
      const text = await res.text()
      console.error('Bolo revoke error:', res.status, text)
      return NextResponse.json(
        { success: false, error: `Bolo error: ${res.status}` },
        { status: res.status }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Revoke error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to revoke grant' },
      { status: 500 }
    )
  }
}
