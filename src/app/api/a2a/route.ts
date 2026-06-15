import { NextRequest, NextResponse } from 'next/server'
import agentCard from '../../../../agents/a2a-autobook/agent-card.json'

export async function GET() {
  return NextResponse.json(agentCard)
}

const BASE_URL = process.env.BOLO_API_URL || 'https://api.bolospot.com'
const API_KEY = process.env.BOLO_API_KEY || ''
const WIDGET_SLUG = process.env.BOLO_WIDGET_SLUG || 'bomed'

async function boloFetch<T>(
  endpoint: string,
  opts?: { method?: string; body?: unknown; token?: string }
): Promise<T> {
  const { method = 'GET', body, token } = opts || {}
  const res = await fetch(`${BASE_URL}/api${endpoint}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token || API_KEY}`,
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  })
  if (!res.ok) throw new Error(`Bolo API ${res.status}: ${await res.text()}`)
  return res.json() as Promise<T>
}

interface Policy {
  autoBook: boolean
  minBufferMinutes: number
  allowedHoursStart: number
  allowedHoursEnd: number
  maxPerWeek: number
  allowedDays: number[]
}

function parsePolicy(note: string | null): Policy | null {
  if (!note) return null
  const match = note.match(/Policy:\s*({.*})/)
  if (!match) return null
  try { return JSON.parse(match[1]) } catch { return null }
}

function findNextSlot(policy: Policy): Date | null {
  const now = new Date()
  const candidate = new Date(now)
  candidate.setDate(candidate.getDate() + 1)
  candidate.setHours(policy.allowedHoursStart, 0, 0, 0)
  for (let day = 0; day < 14; day++) {
    if (policy.allowedDays.includes(candidate.getDay())) {
      for (let hour = policy.allowedHoursStart; hour < policy.allowedHoursEnd; hour++) {
        candidate.setHours(hour, 0, 0, 0)
        if ((candidate.getTime() - now.getTime()) / 60000 >= policy.minBufferMinutes) {
          return new Date(candidate)
        }
      }
    }
    candidate.setDate(candidate.getDate() + 1)
    candidate.setHours(policy.allowedHoursStart, 0, 0, 0)
  }
  return null
}

export async function POST(req: NextRequest) {
  try {
    const rpc = await req.json()
    if (rpc.jsonrpc !== '2.0' || !rpc.method) {
      return NextResponse.json({ jsonrpc: '2.0', id: rpc.id || 0, error: { code: -32600, message: 'Invalid request' } }, { status: 400 })
    }

    const params = rpc.params || {}

    if (rpc.method === 'tasks/send') {
      const message = params.message as { parts?: Array<{ type: string; text?: string; data?: Record<string, unknown> }> }
      const text = message?.parts?.find((p: { type: string }) => p.type === 'text')?.text || ''
      const data = message?.parts?.find((p: { type: string }) => p.type === 'data')?.data as Record<string, unknown> | undefined
      const patientHandle = (data?.patientHandle as string) || ''
      const token = (data?.boloToken as string) || undefined
      const taskId = `task-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

      if (text.toLowerCase().includes('schedule') || text.toLowerCase().includes('book')) {
        const grants = await boloFetch<Array<{
          id: string; grantorHandle: string; widget: string; scopes: string[]; note: string | null; isActive: boolean
        }>>('/grants?direction=received', { token })

        const booked: Array<{ patientHandle: string; dateTime: string }> = []
        for (const g of grants.filter((g) => g.isActive && g.widget === WIDGET_SLUG && g.scopes.some((s) => s.startsWith('appointments:')))) {
          const policy = parsePolicy(g.note)
          if (!policy?.autoBook) continue
          const slot = findNextSlot(policy)
          if (!slot) continue
          await boloFetch('/relay/send', {
            method: 'POST',
            body: { recipientHandle: g.grantorHandle, content: `Auto-booked: Session on ${slot.toLocaleDateString()}`, widgetSlug: WIDGET_SLUG, metadata: { type: 'appointment', autoBooked: true, dateTime: slot.toISOString(), duration: 60 } },
            token,
          })
          booked.push({ patientHandle: g.grantorHandle, dateTime: slot.toISOString() })
        }

        return NextResponse.json({
          jsonrpc: '2.0', id: rpc.id,
          result: {
            id: taskId,
            status: { state: 'completed', message: { role: 'agent', parts: [{ type: 'text', text: booked.length > 0 ? `Booked ${booked.length} appointment(s).` : 'No eligible auto-book grants found.' }] }, timestamp: new Date().toISOString() },
            artifacts: booked.map((b) => ({
              name: `appointment-${b.patientHandle}`,
              parts: [{ type: 'data', mimeType: 'application/fhir+json', data: { resourceType: 'Appointment', status: 'booked', start: b.dateTime, participant: [{ actor: { reference: `Patient/${b.patientHandle}` }, status: 'accepted' }] } }],
            })),
          },
        })
      }

      if (text.toLowerCase().includes('vital')) {
        const inbox = await boloFetch<{ messages?: Array<{ id: string; metadata?: Record<string, unknown>; createdAt?: string }> }>('/relay/inbox', { token })
        const vitals = (inbox.messages || []).filter((m) => m.metadata?.type === 'vital')
        return NextResponse.json({
          jsonrpc: '2.0', id: rpc.id,
          result: {
            id: taskId,
            status: { state: 'completed', message: { role: 'agent', parts: [{ type: 'text', text: `Found ${vitals.length} vital reading(s) for ${patientHandle}.` }] }, timestamp: new Date().toISOString() },
            artifacts: [{ name: 'vitals', parts: [{ type: 'data', mimeType: 'application/fhir+json', data: { resourceType: 'Bundle', type: 'searchset', total: vitals.length, entry: vitals.map((v) => ({ resource: { resourceType: 'Observation', id: v.id, status: 'final', code: { coding: [{ system: 'http://loinc.org', code: '8310-5' }] }, valueQuantity: { value: parseFloat(String(v.metadata?.value)), unit: v.metadata?.unit } } })) } }] }],
          },
        })
      }

      return NextResponse.json({
        jsonrpc: '2.0', id: rpc.id,
        result: { id: taskId, status: { state: 'completed', message: { role: 'agent', parts: [{ type: 'text', text: 'Available skills: schedule-appointment, monitor-vitals, manage-permissions. Send a message describing what you need.' }] }, timestamp: new Date().toISOString() } },
      })
    }

    return NextResponse.json({ jsonrpc: '2.0', id: rpc.id, error: { code: -32601, message: `Unknown method: ${rpc.method}` } })
  } catch (error: unknown) {
    return NextResponse.json({ jsonrpc: '2.0', id: 0, error: { code: -32700, message: 'Parse error' } }, { status: 400 })
  }
}
