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

    // Check if handle exists on Bolospot
    try {
      const lookup = await bolo.lookupHandle(cleanHandle)
      if (!lookup.exists) {
        // Auto-create the handle with World ID verification
        try {
          await boloFetch('/users/create', {
            method: 'POST',
            body: {
              handle: cleanHandle,
              worldIdNullifier: nullifierHash,
              isHumanVerified: true,
              verificationLevel: 'VERIFIED',
            },
          })
        } catch (createError) {
          console.error('Handle creation error:', createError)
          return NextResponse.json(
            { success: false, error: 'Could not create handle. Please try a different handle or contact support.' },
            { status: 500 }
          )
        }
      }
    } catch {
      // If lookup fails, we'll still try to proceed — handle may exist but lookup API may be down
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
