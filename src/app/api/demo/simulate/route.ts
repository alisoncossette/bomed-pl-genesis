import { NextRequest, NextResponse } from 'next/server'
import { getBoloClient } from '@/lib/bolo'

// Demo endpoint: simulates BoMed's agent auto-booking an appointment
// This would normally come from the practice side, but for the demo
// we trigger it manually to show the auto-book flow
export async function POST(req: NextRequest) {
  try {
    const { patientHandle, practiceName, practiceHandle } = await req.json()

    const bolo = getBoloClient()

    // Find next available slot (simulated)
    const now = new Date()
    const nextSlot = new Date(now)
    nextSlot.setDate(now.getDate() + 2) // 2 days from now
    nextSlot.setHours(14, 0, 0, 0) // 2:00 PM

    // Send appointment through relay
    const result = await bolo.relaySend({
      recipientHandle: patientHandle.replace(/^@/, ''),
      content: `Auto-booked: PT session on ${nextSlot.toLocaleDateString(undefined, {
        weekday: 'long',
        month: 'short',
        day: 'numeric',
      })} at ${nextSlot.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`,
      widgetSlug: 'bomed',
      metadata: {
        type: 'appointment',
        autoBooked: true,
        practiceName: practiceName || 'Acme Physical Therapy',
        dateTime: nextSlot.toISOString(),
        duration: 60,
        appointmentType: 'PT_SESSION',
      },
    })

    return NextResponse.json({
      success: true,
      appointment: {
        id: result.id,
        dateTime: nextSlot.toISOString(),
        duration: 60,
        practice: practiceName || 'Acme Physical Therapy',
      },
    })
  } catch (error) {
    console.error('Demo simulate error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to simulate auto-book' },
      { status: 500 }
    )
  }
}
