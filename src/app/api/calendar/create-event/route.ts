import { NextRequest, NextResponse } from 'next/server'
import { calendarTokens } from '@/lib/calendar-tokens'

export async function POST(req: NextRequest) {
  try {
    const { handle, title, startTime, endTime, description, location } = await req.json()

    if (!handle || !title || !startTime || !endTime) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const tokenData = calendarTokens.get(handle)

    if (!tokenData) {
      return NextResponse.json(
        { success: false, error: 'No calendar connected for this user' },
        { status: 404 }
      )
    }

    const event = {
      summary: title,
      start: {
        dateTime: startTime,
        timeZone: 'America/New_York',
      },
      end: {
        dateTime: endTime,
        timeZone: 'America/New_York',
      },
      description: description || '',
      location: location || '',
    }

    const response = await fetch(
      'https://www.googleapis.com/calendar/v3/calendars/primary/events',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${tokenData.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(event),
      }
    )

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Google Calendar API error:', response.status, errorText)
      return NextResponse.json(
        { success: false, error: `Failed to create event: ${response.status}` },
        { status: response.status }
      )
    }

    const createdEvent = await response.json()

    return NextResponse.json({
      success: true,
      eventId: createdEvent.id,
      htmlLink: createdEvent.htmlLink,
    })
  } catch (error) {
    console.error('Create event error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create calendar event' },
      { status: 500 }
    )
  }
}
