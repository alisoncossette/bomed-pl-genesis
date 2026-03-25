import { NextRequest, NextResponse } from 'next/server'
import { getBoloClient } from '@/lib/bolo'

export async function GET(req: NextRequest) {
  const handle = req.nextUrl.searchParams.get('handle')

  if (!handle) {
    return NextResponse.json({ messages: [] }, { status: 400 })
  }

  try {
    const bolo = getBoloClient()
    const inbox = await bolo.relayInbox()

    // Return messages — the relay inbox returns all messages for the authenticated user
    const messages = (inbox?.messages || []).map((msg: any) => ({
      id: msg.id,
      senderHandle: msg.senderHandle ? `@${msg.senderHandle}` : 'Unknown',
      content: msg.content,
      widgetSlug: msg.widgetSlug,
      metadata: msg.metadata,
      createdAt: msg.createdAt,
    }))

    return NextResponse.json({ messages })
  } catch (error) {
    console.error('Relay inbox error:', error)
    return NextResponse.json({ messages: [] })
  }
}
