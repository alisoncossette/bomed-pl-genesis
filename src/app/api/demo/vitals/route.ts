import { NextRequest, NextResponse } from 'next/server'
import { getBoloClient } from '@/lib/bolo'

// Demo endpoint: simulates Ladybug.bot sending a vital reading
// In production, this would come from the actual robot via its own API key
export async function POST(req: NextRequest) {
  try {
    const { patientHandle, vitalType = 'temperature' } = await req.json()

    const bolo = getBoloClient()

    // Generate realistic vital values
    const vitalData: Record<string, { value: string; unit: string; label: string }> = {
      temperature: {
        value: (97.5 + Math.random() * 2.0).toFixed(1),
        unit: '\u00B0F',
        label: 'Temperature',
      },
      heart_rate: {
        value: String(Math.floor(65 + Math.random() * 25)),
        unit: 'bpm',
        label: 'Heart Rate',
      },
      oxygen: {
        value: String(Math.floor(95 + Math.random() * 5)),
        unit: '%',
        label: 'SpO2',
      },
    }

    const vital = vitalData[vitalType] || vitalData.temperature

    const result = await bolo.relaySend({
      recipientHandle: patientHandle.replace(/^@/, ''),
      content: `${vital.label}: ${vital.value}${vital.unit}`,
      widgetSlug: 'ladybug',
      metadata: {
        type: 'vital',
        vitalType,
        value: vital.value,
        unit: vital.unit,
        deviceName: 'Ladybug.bot',
        deviceType: 'reading_robot',
        measuredAt: new Date().toISOString(),
      },
    })

    return NextResponse.json({
      success: true,
      vital: {
        id: result.id,
        type: vitalType,
        value: vital.value,
        unit: vital.unit,
      },
    })
  } catch (error) {
    console.error('Demo vitals error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to simulate vital reading' },
      { status: 500 }
    )
  }
}
