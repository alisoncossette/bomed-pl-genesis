import { NextRequest, NextResponse } from 'next/server'

const BASE_URL = process.env.BOLO_API_URL || 'https://api.bolospot.com'
const API_KEY = process.env.BOLO_API_KEY

export async function GET(req: NextRequest) {
  if (!API_KEY) {
    return NextResponse.json({ error: 'API key not configured' }, { status: 500 })
  }

  try {
    const res = await fetch(`${BASE_URL}/api/grants/received/key`, {
      headers: { Authorization: `Bearer ${API_KEY}` },
    })

    if (!res.ok) {
      console.error('Bolo grants/received/key error:', res.status, await res.text())
      return NextResponse.json({ grants: [] })
    }

    const data = await res.json()
    const items = Array.isArray(data) ? data : (data.grants || data.items || [])

    const grants = items.map((g: any) => ({
      id: g.id,
      granterHandle: g.granterHandle,
      scopes: g.scopes || [],
      expiresAt: g.expiresAt || null,
      createdAt: g.createdAt,
    }))

    return NextResponse.json({ grants })
  } catch (error) {
    console.error('Practice grants fetch error:', error)
    return NextResponse.json({ grants: [] })
  }
}
