import { NextRequest, NextResponse } from 'next/server'
import { getBoloClient, boloFetch } from '@/lib/bolo'

export async function POST(req: NextRequest) {
  try {
    const { handle, nullifierHash } = await req.json()

    if (!handle || !nullifierHash) {
      return NextResponse.json(
        { success: false, error: 'Handle and nullifier hash required' },
        { status: 400 }
      )
    }

    const cleanHandle = handle.replace(/^@/, '').toLowerCase()
    const bolo = getBoloClient()

    // Check handle availability on Bolospot (best-effort — don't fail if API is down)
    try {
      const res = await fetch(`${process.env.BOLO_API_URL || 'https://api.bolospot.com'}/api/users/check-handle/${cleanHandle}`)
      if (res.ok) {
        const data = await res.json()
        // If handle is explicitly taken, reject early
        if (data.available === false) {
          return NextResponse.json(
            { success: false, error: 'Handle already exists' },
            { status: 409 }
          )
        }
      }
    } catch {
      // API down — proceed anyway, handle linking still works locally
    }

    // TODO: Persist the nullifierHash <-> handle mapping in a database
    // For MVP, we just validate and return success

    return NextResponse.json({
      success: true,
      handle: `@${cleanHandle}`,
    })
  } catch (error) {
    console.error('Handle link error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal error' },
      { status: 500 }
    )
  }
}
