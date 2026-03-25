import { NextRequest, NextResponse } from 'next/server'
import { getBoloClient } from '@/lib/bolo'

export async function GET(req: NextRequest) {
  const handle = req.nextUrl.searchParams.get('handle')

  if (!handle) {
    return NextResponse.json({ vitals: [] }, { status: 400 })
  }

  try {
    const bolo = getBoloClient()
    const inbox = await bolo.relayInbox()

    // Filter for vitals messages from Ladybug.bot or any device
    const vitals = (inbox?.messages || [])
      .filter((msg: any) =>
        msg.metadata?.type === 'vital' ||
        msg.widgetSlug === 'ladybug' ||
        msg.metadata?.vitalType
      )
      .map((msg: any) => ({
        id: msg.id,
        source: msg.senderHandle || 'unknown',
        sourceName: msg.metadata?.deviceName || 'Ladybug.bot',
        type: msg.metadata?.vitalType || 'temperature',
        value: msg.metadata?.value || msg.content,
        unit: msg.metadata?.unit || '',
        timestamp: msg.createdAt,
      }))

    return NextResponse.json({ vitals })
  } catch (error) {
    console.error('Vitals fetch error:', error)
    return NextResponse.json({ vitals: [] })
  }
}
