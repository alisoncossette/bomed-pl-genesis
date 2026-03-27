import { NextRequest, NextResponse } from 'next/server'

const BASE_URL = process.env.BOLO_API_URL || 'https://api.bolospot.com'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { practiceHandle, patientHandle, boloToken, scopes } = body

    if (!practiceHandle || !patientHandle || !boloToken) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Default scopes if not provided
    const grantScopes = scopes || ['appointments:read', 'appointments:book', 'patients:read']

    // Create grant on Bolo API
    const cleanPracticeHandle = practiceHandle.replace(/^@/, '')
    const res = await fetch(`${BASE_URL}/api/grants`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${boloToken}`,
      },
      body: JSON.stringify({
        granteeHandle: cleanPracticeHandle,
        widget: 'bomed',
        scopes: grantScopes,
      }),
    })

    if (!res.ok) {
      const errorText = await res.text()
      console.error('Bolo grant creation error:', res.status, errorText)
      return NextResponse.json(
        { success: false, error: 'Failed to create grant' },
        { status: res.status }
      )
    }

    const data = await res.json()

    return NextResponse.json({
      success: true,
      grantId: data.id || data.grantId,
    })
  } catch (error) {
    console.error('Practice connect error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
