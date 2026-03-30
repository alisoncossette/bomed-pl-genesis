import { NextRequest, NextResponse } from 'next/server'
import { calendarTokens } from '@/lib/calendar-tokens'

const BASE_URL = process.env.BOLO_API_URL || 'https://api.bolospot.com'

export async function POST(req: NextRequest) {
  try {
    const { requestId, approved, scopes, handle, policy, practiceName } = await req.json()
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

    // If approved and scopes include appointments, create a demo appointment
    if (approved && handle && scopes) {
      const hasAppointmentScope = scopes.some((s: string) =>
        s === 'appointments:request' || s === 'appointments:book'
      )

      if (hasAppointmentScope) {
        const hasCalendarToken = calendarTokens.has(handle)

        if (hasCalendarToken) {
          // Create demo appointment ~3 days from now at 2pm
          const appointmentDate = new Date()
          appointmentDate.setDate(appointmentDate.getDate() + 3)
          appointmentDate.setHours(14, 0, 0, 0) // 2:00 PM

          const endTime = new Date(appointmentDate)
          endTime.setHours(15, 0, 0, 0) // 3:00 PM (60 minutes)

          const title = `${practiceName || 'Healthcare Provider'} - BoMed Appointment`
          const description = `Demo appointment automatically created by BoMed after granting calendar access to ${practiceName || 'practice'}.`

          try {
            const eventRes = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/calendar/create-event`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                handle,
                title,
                startTime: appointmentDate.toISOString(),
                endTime: endTime.toISOString(),
                description,
                location: '',
              }),
            })

            if (eventRes.ok) {
              const eventData = await eventRes.json()
              console.log(`✓ Created demo appointment for ${handle}:`, eventData.htmlLink)
            } else {
              console.error('Failed to create demo appointment:', await eventRes.text())
            }
          } catch (error) {
            console.error('Error creating demo appointment:', error)
            // Don't fail the grant approval if calendar event fails
          }
        }
      }
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
