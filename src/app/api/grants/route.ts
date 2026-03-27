import { NextRequest, NextResponse } from 'next/server'

const BASE_URL = process.env.BOLO_API_URL || 'https://api.bolospot.com'

export async function GET(req: NextRequest) {
  const boloToken = req.headers.get('x-bolo-token')

  if (!boloToken) {
    return NextResponse.json({ grants: [] })
  }

  try {
    const res = await fetch(`${BASE_URL}/api/grants/given`, {
      headers: { Authorization: `Bearer ${boloToken}` },
    })

    if (!res.ok) {
      console.error('Bolo grants/given error:', res.status, await res.text())
      return NextResponse.json({ grants: [] })
    }

    const data = await res.json()
    const items = Array.isArray(data) ? data : (data.grants || data.items || [])

    const grants = items.map((g: any) => ({
      id: g.id,
      granteeHandle: g.granteeHandle ? `@${g.granteeHandle}` : 'Unknown',
      widget: g.widget,
      widgetName: g.widgetName || g.widget,
      scopes: g.scopes || [],
      expiresAt: g.expiresAt || null,
      createdAt: g.createdAt,
    }))

    return NextResponse.json({ grants })
  } catch (error) {
    console.error('Grants fetch error:', error)
    return NextResponse.json({ grants: [] })
  }
}
