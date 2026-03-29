import { NextRequest, NextResponse } from 'next/server'

const BASE_URL = process.env.BOLO_API_URL || 'https://api.bolospot.com'

export async function POST(req: NextRequest) {
  try {
    const { practiceHandle, scopes, boloToken } = await req.json()

    if (!practiceHandle || !boloToken) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const cleanHandle = practiceHandle.replace(/^@/, '')

    const res = await fetch(`${BASE_URL}/api/@${cleanHandle}/request`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${boloToken}`,
      },
      body: JSON.stringify({ scopes: scopes || [] }),
    })

    if (!res.ok) {
      const errorText = await res.text()
      console.error('Bolo practice request error:', res.status, errorText)
      return NextResponse.json(
        { success: false, error: 'Failed to send practice request' },
        { status: res.status }
      )
    }

    const data = await res.json()
    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('Practice request error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
