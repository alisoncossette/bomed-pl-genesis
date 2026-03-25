import { NextRequest, NextResponse } from 'next/server'
import { getBoloClient } from '@/lib/bolo'

// Demo endpoint: simulates a practice sending an access request to the patient
// In production, this would come from BoMed's practice dashboard
export async function POST(req: NextRequest) {
  try {
    const { patientHandle } = await req.json()

    const bolo = getBoloClient()

    const result = await bolo.requestAccess({
      targetHandle: patientHandle.replace(/^@/, ''),
      widget: 'bomed',
      scopes: [
        'appointments:read',
        'appointments:request',
        'insurance:read',
        'vitals:write',
      ],
      reason: 'Schedule your PT sessions and receive vitals from Ladybug.bot',
    })

    return NextResponse.json({
      success: true,
      request: result,
    })
  } catch (error: any) {
    console.error('Demo request error:', error)
    // 409 = duplicate request, which is fine for demo
    if (error?.statusCode === 409) {
      return NextResponse.json({
        success: true,
        request: { status: 'already_pending' },
      })
    }
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to send access request' },
      { status: 500 }
    )
  }
}
