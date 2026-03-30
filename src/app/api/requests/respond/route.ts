import { NextRequest, NextResponse } from 'next/server'

const BASE_URL = process.env.BOLO_API_URL || 'https://api.bolospot.com'
const BOLO_API_KEY = process.env.BOLO_API_KEY || ''

export async function POST(req: NextRequest) {
  try {
    const { requestId, approved, scopes, handle, policy, practiceName } = await req.json()
    const boloToken = req.headers.get('x-bolo-token')

    if (!requestId) {
      return NextResponse.json({ success: false, error: 'Request ID required' }, { status: 400 })
    }

    if (!boloToken) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 })
    }

    // Approve or deny the grant request
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
      return NextResponse.json({ success: false, error: `Bolo error: ${res.status}` }, { status: res.status })
    }

    // If approved and scopes include appointments, book a real demo appointment
    // via Bolospot's booking API — writes to patient's connected calendar
    if (approved && handle && scopes) {
      const hasAppointmentScope = scopes.some((s: string) =>
        s === 'appointments:request' || s === 'appointments:book' || s === 'appointments:read'
      )

      if (hasAppointmentScope) {
        const cleanHandle = handle.replace(/^@/, '')

        // Book 3 days from now at 2pm local
        const appointmentDate = new Date()
        appointmentDate.setDate(appointmentDate.getDate() + 3)
        appointmentDate.setHours(14, 0, 0, 0)

        try {
          const bookRes = await fetch(`${BASE_URL}/api/booking/@${cleanHandle}/book`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${BOLO_API_KEY}`,
            },
            body: JSON.stringify({
              startTime: appointmentDate.toISOString(),
              duration: 60,
              timezone: 'America/New_York',
              name: practiceName || 'BoMed Demo Practice',
              email: 'demo@bomed.ai',
              notes: `Your first BoMed appointment with ${practiceName || 'your provider'}. This was automatically scheduled when you granted access.`,
            }),
          })

          if (bookRes.ok) {
            const bookData = await bookRes.json()
            console.log(`✓ Booked real appointment for @${cleanHandle}:`, bookData)
          } else {
            const errText = await bookRes.text()
            console.log(`Calendar booking note (non-fatal): ${bookRes.status} ${errText}`)
          }
        } catch (error) {
          console.log('Calendar booking skipped (non-fatal):', error)
          // Don't fail the grant approval if booking fails
        }
      }
    }

    return NextResponse.json({ success: true, action: approved ? 'granted' : 'denied' })
  } catch (error) {
    console.error('Respond error:', error)
    return NextResponse.json({ success: false, error: 'Failed to respond' }, { status: 500 })
  }
}
