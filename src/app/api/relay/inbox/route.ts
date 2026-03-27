import { NextRequest, NextResponse } from 'next/server'

const BASE_URL = process.env.BOLO_API_URL || 'https://api.bolospot.com'
const API_KEY = process.env.BOLO_API_KEY || ''

export async function GET(req: NextRequest) {
  const boloToken = req.headers.get('x-bolo-token')

  // Use patient's JWT if available, fall back to widget API key
  const headers: Record<string, string> = boloToken
    ? { Authorization: `Bearer ${boloToken}` }
    : { 'X-API-Key': API_KEY }

  try {
    const res = await fetch(`${BASE_URL}/api/relay/inbox`, { headers })

    if (!res.ok) {
      console.error('Bolo relay/inbox error:', res.status, await res.text())
      return NextResponse.json({ messages: [] })
    }

    const data = await res.json()
    const items = Array.isArray(data) ? data : (data.messages || data.items || [])

    const messages = items.map((m: any) => ({
      id: m.id,
      senderHandle: m.senderHandle ? `@${m.senderHandle}` : 'Unknown',
      content: m.content || m.message || '',
      widgetSlug: m.widgetSlug || m.widget || '',
      createdAt: m.createdAt,
    }))

    return NextResponse.json({ messages })
  } catch (error) {
    console.error('Relay inbox error:', error)
    return NextResponse.json({ messages: [] })
  }
}
