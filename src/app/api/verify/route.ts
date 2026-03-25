import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { payload, action } = await req.json()

    // Verify the proof with World ID cloud API
    const verifyRes = await fetch(
      `https://developer.worldcoin.org/api/v2/verify/${process.env.NEXT_PUBLIC_WORLD_APP_ID}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...payload,
          action,
        }),
      }
    )

    if (!verifyRes.ok) {
      const err = await verifyRes.text()
      console.error('World ID verification failed:', err)
      return NextResponse.json({ verified: false, error: 'Verification failed' }, { status: 400 })
    }

    const verifyData = await verifyRes.json()

    // TODO: Look up if this nullifier_hash already has a linked handle
    // For now, return verified status
    return NextResponse.json({
      verified: true,
      nullifier_hash: verifyData.nullifier_hash || payload.nullifier_hash,
      handle: null, // Will be populated once handle linking is implemented with DB
    })
  } catch (error) {
    console.error('Verify error:', error)
    return NextResponse.json({ verified: false, error: 'Internal error' }, { status: 500 })
  }
}
