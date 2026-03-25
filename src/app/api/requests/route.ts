import { NextRequest, NextResponse } from 'next/server'
import { boloFetch } from '@/lib/bolo'

interface AccessRequest {
  id: string
  requesterHandle: string
  widget: string
  scopes: string[]
  reason: string | null
  status: string
  createdAt: string
}

export async function GET(req: NextRequest) {
  const handle = req.nextUrl.searchParams.get('handle')

  if (!handle) {
    return NextResponse.json({ requests: [] }, { status: 400 })
  }

  try {
    // Fetch pending access requests received by this patient
    const data = await boloFetch<AccessRequest[]>('/access-requests?direction=received&status=pending')

    const requests = (data || []).map((r) => ({
      id: r.id,
      fromHandle: r.requesterHandle ? `@${r.requesterHandle}` : 'Unknown',
      fromName: r.requesterHandle || 'Unknown',
      widget: r.widget,
      widgetName: r.widget,
      scopes: r.scopes || [],
      reason: r.reason || '',
      status: 'pending',
      createdAt: r.createdAt,
    }))

    return NextResponse.json({ requests })
  } catch (error) {
    console.error('Requests fetch error:', error)
    return NextResponse.json({ requests: [] })
  }
}
