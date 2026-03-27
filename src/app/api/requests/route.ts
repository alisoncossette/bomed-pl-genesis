import { NextRequest, NextResponse } from 'next/server'

const BASE_URL = process.env.BOLO_API_URL || 'https://api.bolospot.com'

export async function GET(req: NextRequest) {
  const boloToken = req.headers.get('x-bolo-token')

  if (!boloToken) {
    return NextResponse.json({ requests: [] })
  }

  try {
    const res = await fetch(`${BASE_URL}/api/grants/requests`, {
      headers: { Authorization: `Bearer ${boloToken}` },
    })

    if (!res.ok) {
      console.error('Bolo grants/requests error:', res.status, await res.text())
      return NextResponse.json({ requests: [] })
    }

    const data = await res.json()
    const items = Array.isArray(data) ? data : (data.requests || data.items || [])

    const requests = items.map((r: any) => ({
      id: r.id,
      fromHandle: r.requesterHandle ? `@${r.requesterHandle}` : r.granteeHandle ? `@${r.granteeHandle}` : 'Unknown',
      fromName: r.requesterName || r.requesterHandle || 'Unknown',
      widget: r.widget,
      widgetName: r.widgetName || r.widget,
      scopes: r.scopes || [],
      reason: r.reason || r.note || '',
      status: 'pending',
      createdAt: r.createdAt,
    }))

    return NextResponse.json({ requests })
  } catch (error) {
    console.error('Requests fetch error:', error)
    return NextResponse.json({ requests: [] })
  }
}
