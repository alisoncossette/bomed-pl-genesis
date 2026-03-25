import { NextRequest, NextResponse } from 'next/server'
import { boloFetch } from '@/lib/bolo'

export async function POST(req: NextRequest) {
  try {
    const { grantId, handle } = await req.json()

    if (!grantId || !handle) {
      return NextResponse.json(
        { success: false, error: 'Grant ID and handle required' },
        { status: 400 }
      )
    }

    // Direct API call to revoke a grant
    await boloFetch(`/grants/${grantId}/revoke`, { method: 'POST' })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Revoke error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to revoke grant' },
      { status: 500 }
    )
  }
}
