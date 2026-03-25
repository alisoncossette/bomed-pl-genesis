import { NextRequest, NextResponse } from 'next/server'
import { boloFetch } from '@/lib/bolo'

interface Grant {
  id: string
  grantorHandle: string
  granteeHandle: string
  widget: string
  scopes: string[]
  note: string | null
  isActive: boolean
  createdAt: string
  expiresAt: string | null
}

export async function GET(req: NextRequest) {
  const handle = req.nextUrl.searchParams.get('handle')

  if (!handle) {
    return NextResponse.json({ grants: [] }, { status: 400 })
  }

  try {
    // Use direct API — list grants sent by this patient
    const grants = await boloFetch<Grant[]>('/grants?direction=sent')
    const active = (grants || []).filter((g) => g.isActive)

    return NextResponse.json({ grants: active })
  } catch (error) {
    console.error('Grants fetch error:', error)
    return NextResponse.json({ grants: [] })
  }
}
