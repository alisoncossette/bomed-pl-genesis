import { NextRequest, NextResponse } from 'next/server'
import { getBoloClient } from '@/lib/bolo'

export async function GET(req: NextRequest) {
  const handle = req.nextUrl.searchParams.get('handle')

  if (!handle) {
    return NextResponse.json({ events: [] }, { status: 400 })
  }

  try {
    const bolo = getBoloClient()
    const inbox = await bolo.relayInbox()

    // Transform relay messages into auto-book events
    const events = (inbox?.messages || [])
      .filter((msg: any) => msg.metadata?.type === 'appointment' || msg.widgetSlug === 'bomed')
      .map((msg: any) => ({
        id: msg.id,
        type: msg.metadata?.autoBooked ? 'auto_booked'
          : msg.metadata?.policyBlocked ? 'policy_blocked'
          : 'auto_approved',
        practiceHandle: msg.senderHandle ? `@${msg.senderHandle}` : 'Unknown',
        practiceName: msg.metadata?.practiceName || msg.senderHandle || 'Practice',
        dateTime: msg.metadata?.dateTime || msg.createdAt,
        duration: msg.metadata?.duration || 60,
        reason: msg.content,
        timestamp: msg.createdAt,
      }))

    return NextResponse.json({ events })
  } catch (error) {
    console.error('Auto-book feed error:', error)
    return NextResponse.json({ events: [] })
  }
}
