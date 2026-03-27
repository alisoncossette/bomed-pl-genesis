/**
 * Ladybug.bot — Vitals Relay Agent
 *
 * A real agent that simulates a reading robot sending vital signs
 * through Bolospot's relay. In production, this would run on the
 * robot's hardware and read from actual sensors.
 *
 * For the demo: reads from simulated sensors, sends real relay messages.
 *
 * Run: npx tsx agents/ladybug-bot.ts --patient @handle --type temperature
 * Or in continuous mode: npx tsx agents/ladybug-bot.ts --patient @handle --continuous
 *
 * Requires: BOLO_API_KEY (Ladybug.bot's API key), BOLO_API_URL
 */

const WIDGET_SLUG = 'ladybug'
const CONTINUOUS_INTERVAL = 30_000 // 30 seconds between readings
const API_KEY = process.env.BOLO_API_KEY || ''
const BASE_URL = process.env.BOLO_API_URL || 'https://api.bolospot.com'

// Direct fetch helper
async function boloFetch<T>(endpoint: string, options?: { method?: string; body?: unknown }): Promise<T> {
  const { method = 'GET', body } = options || {}
  const url = `${BASE_URL}/api${endpoint}`
  const res = await fetch(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${API_KEY}`,
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Bolo API error ${res.status}: ${text}`)
  }
  return res.json() as Promise<T>
}

interface VitalReading {
  type: string
  value: string
  unit: string
  label: string
}

function readSensor(type: string): VitalReading {
  // Simulated sensor readings — in production, read from actual hardware
  // Values are realistic ranges with slight randomization
  switch (type) {
    case 'temperature':
      return {
        type: 'temperature',
        value: (97.5 + Math.random() * 2.0).toFixed(1),
        unit: '\u00B0F',
        label: 'Temperature',
      }
    case 'heart_rate':
      return {
        type: 'heart_rate',
        value: String(Math.floor(65 + Math.random() * 25)),
        unit: 'bpm',
        label: 'Heart Rate',
      }
    case 'oxygen':
      return {
        type: 'oxygen',
        value: String(Math.floor(95 + Math.random() * 5)),
        unit: '%',
        label: 'SpO2',
      }
    case 'blood_pressure': {
      const systolic = Math.floor(110 + Math.random() * 30)
      const diastolic = Math.floor(70 + Math.random() * 15)
      return {
        type: 'blood_pressure',
        value: `${systolic}/${diastolic}`,
        unit: 'mmHg',
        label: 'Blood Pressure',
      }
    }
    default:
      return readSensor('temperature')
  }
}

async function sendVital(patientHandle: string, vitalType: string) {
  const reading = readSensor(vitalType)

  console.log(`[Ladybug.bot] Reading: ${reading.label} = ${reading.value}${reading.unit}`)

  try {
    // Check if we have vitals:write access
    const access = await boloFetch<{ widgets?: Array<{ status: string; scopes?: string[] }> }>(`/access/check?handle=${patientHandle.replace(/^@/, '')}`)
    const hasVitalsAccess = access.widgets?.some(
      (w: any) => w.status === 'granted' && w.scopes?.includes('vitals:write')
    )

    if (!hasVitalsAccess) {
      console.log(`[Ladybug.bot] No vitals:write access for ${patientHandle} — skipping`)
      return false
    }

    const result = await boloFetch<{ id: string }>('/relay/send', {
      method: 'POST',
      body: {
        recipientHandle: patientHandle.replace(/^@/, ''),
        content: `${reading.label}: ${reading.value}${reading.unit}`,
        widgetSlug: WIDGET_SLUG,
        metadata: {
          type: 'vital',
          vitalType: reading.type,
          value: reading.value,
          unit: reading.unit,
          deviceName: 'Ladybug.bot',
          deviceType: 'reading_robot',
          measuredAt: new Date().toISOString(),
        },
      },
    })

    console.log(`[Ladybug.bot] Sent to ${patientHandle} (message: ${result.id})`)
    return true
  } catch (error: any) {
    if (error?.statusCode === 403) {
      console.log(`[Ladybug.bot] Access denied for ${patientHandle} — patient may have revoked`)
    } else {
      console.error(`[Ladybug.bot] Error:`, error?.message || error)
    }
    return false
  }
}

async function main() {
  const args = process.argv.slice(2)
  const patientIdx = args.indexOf('--patient')
  const typeIdx = args.indexOf('--type')
  const continuous = args.includes('--continuous')

  const patientHandle = patientIdx !== -1 ? args[patientIdx + 1] : null
  const vitalType = typeIdx !== -1 ? args[typeIdx + 1] : 'temperature'

  if (!patientHandle) {
    console.error('Usage: npx tsx agents/ladybug-bot.ts --patient @handle [--type temperature|heart_rate|oxygen|blood_pressure] [--continuous]')
    process.exit(1)
  }

  console.log('=== Ladybug.bot Vitals Agent ===')
  console.log(`Patient: ${patientHandle}`)
  console.log(`Vital: ${vitalType}`)
  console.log(`Mode: ${continuous ? 'continuous' : 'single reading'}`)
  console.log(`API: ${process.env.BOLO_API_URL || 'https://api.bolospot.com'}`)
  console.log('')

  if (continuous) {
    // Continuous mode — send readings at intervals
    const types = ['temperature', 'heart_rate', 'oxygen']
    let i = 0

    const tick = async () => {
      const type = types[i % types.length]
      await sendVital(patientHandle, type)
      i++
    }

    await tick()
    setInterval(tick, CONTINUOUS_INTERVAL)
  } else {
    // Single reading
    const success = await sendVital(patientHandle, vitalType)
    process.exit(success ? 0 : 1)
  }
}

main().catch(console.error)
