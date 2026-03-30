import { NextRequest, NextResponse } from 'next/server'
import { getBoloClient } from '@/lib/bolo'

// Fires welcome requests from both demo practices to a new BoMed patient
// Called automatically after every new handle creation
export async function POST(req: NextRequest) {
  try {
    const { patientHandle } = await req.json()
    const handle = patientHandle.replace(/^@/, '')
    const bolo = getBoloClient()

    const results = await Promise.allSettled([
      bolo.requestAccess({
        targetHandle: handle,
        widget: 'bomed',
        scopes: ['appointments:read', 'appointments:request', 'vitals:write'],
        reason: 'Demo Physical Therapy: Schedule PT sessions and receive appointment reminders',
      }),
      bolo.requestAccess({
        targetHandle: handle,
        widget: 'bomed',
        scopes: ['appointments:read', 'insurance:read', 'demographics:read'],
        reason: 'Test Orthopedics: Verify insurance and coordinate specialist visits',
      }),
    ])

    return NextResponse.json({ success: true, sent: results.length })
  } catch (error: any) {
    // Non-fatal — don't block the user from continuing
    console.error('Welcome requests error:', error)
    return NextResponse.json({ success: false, error: error?.message })
  }
}
