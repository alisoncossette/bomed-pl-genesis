import { NextResponse } from 'next/server'

const BASE_URL = process.env.BOLO_API_URL || 'https://api.bolospot.com'

export async function POST() {
  try {
    const res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: process.env.DEMO_PATIENT_EMAIL || 'demo.patient@bomed.ai',
        password: process.env.DEMO_PATIENT_PASSWORD || 'BoMed_Demo2026!',
      }),
    })

    if (!res.ok) {
      return NextResponse.json({ success: false }, { status: 500 })
    }

    const data = await res.json()
    return NextResponse.json({
      success: true,
      accessToken: data.accessToken,
      handle: `@${data.user.handle}`,
    })
  } catch (error) {
    console.error('Demo login error:', error)
    return NextResponse.json({ success: false }, { status: 500 })
  }
}
