/**
 * BoMed A2A (Agent-to-Agent) AutoBook Server
 *
 * Implements the A2A protocol for autonomous healthcare scheduling.
 * Exposes the agent card at /.well-known/agent.json and handles
 * JSON-RPC task requests for appointment booking, permission management,
 * and vitals monitoring.
 *
 * Uses BoMed's MCP tools internally for all healthcare operations.
 * All data flows through Bolospot's permission-gated relay.
 *
 * Run: npx tsx agents/a2a-autobook/server.ts
 * Requires: BOLO_API_KEY, BOLO_API_URL, PORT (default 3001)
 */

import { createServer, type IncomingMessage, type ServerResponse } from 'node:http'
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))

const PORT = parseInt(process.env.A2A_PORT || '3001', 10)
const API_KEY = process.env.BOLO_API_KEY || ''
const BASE_URL = process.env.BOLO_API_URL || 'https://api.bolospot.com'
const WIDGET_SLUG = process.env.BOLO_WIDGET_SLUG || 'bomed'

// --- Bolospot client ---

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
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Bolo API ${res.status}: ${text}`)
  }
  return res.json() as Promise<T>
}

// --- A2A Types ---

interface A2ATask {
  id: string
  status: {
    state: 'submitted' | 'working' | 'input-required' | 'completed' | 'failed' | 'canceled'
    message?: A2AMessage
    timestamp: string
  }
  history?: A2AStatus[]
  artifacts?: A2AArtifact[]
  metadata?: Record<string, unknown>
}

interface A2AStatus {
  state: string
  message?: A2AMessage
  timestamp: string
}

interface A2AMessage {
  role: 'user' | 'agent'
  parts: A2APart[]
}

interface A2APart {
  type: 'text' | 'data' | 'file'
  text?: string
  data?: unknown
  mimeType?: string
}

interface A2AArtifact {
  name: string
  description?: string
  parts: A2APart[]
}

// --- Scheduling Policy ---

interface Policy {
  autoApprove: boolean
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
  try {
    return JSON.parse(match[1]) as Policy
  } catch {
    return null
  }
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
        const minutesFromNow = (candidate.getTime() - now.getTime()) / 60000
        if (minutesFromNow >= policy.minBufferMinutes) {
          return new Date(candidate)
        }
      }
    }
    candidate.setDate(candidate.getDate() + 1)
    candidate.setHours(policy.allowedHoursStart, 0, 0, 0)
  }
  return null
}

// --- FHIR Builders (inline for A2A standalone) ---

function fhirAppointment(params: {
  id: string
  patientHandle: string
  practiceHandle: string
  dateTime: string
  duration: number
  type?: string
}) {
  const start = new Date(params.dateTime)
  const end = new Date(start.getTime() + params.duration * 60000)
  return {
    resourceType: 'Appointment',
    id: params.id,
    status: 'booked',
    start: start.toISOString(),
    end: end.toISOString(),
    minutesDuration: params.duration,
    participant: [
      { actor: { reference: `Patient/${params.patientHandle.replace(/^@/, '')}` }, status: 'accepted' },
      { actor: { reference: `Practitioner/${params.practiceHandle.replace(/^@/, '')}` }, status: 'accepted' },
    ],
  }
}

function fhirObservation(params: {
  id: string
  patientHandle: string
  type: string
  value: string
  unit: string
}) {
  const loincMap: Record<string, { code: string; display: string }> = {
    temperature: { code: '8310-5', display: 'Body temperature' },
    heart_rate: { code: '8867-4', display: 'Heart rate' },
    oxygen: { code: '2708-6', display: 'Oxygen saturation' },
  }
  const loinc = loincMap[params.type] || loincMap.temperature
  return {
    resourceType: 'Observation',
    id: params.id,
    status: 'final',
    code: { coding: [{ system: 'http://loinc.org', ...loinc }] },
    subject: { reference: `Patient/${params.patientHandle.replace(/^@/, '')}` },
    effectiveDateTime: new Date().toISOString(),
    valueQuantity: { value: parseFloat(params.value), unit: params.unit },
  }
}

// --- Task Handlers ---

const activeTasks = new Map<string, A2ATask>()

function createTaskId(): string {
  return `task-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function textPart(text: string): A2APart {
  return { type: 'text', text }
}

function dataPart(data: unknown): A2APart {
  return { type: 'data', data, mimeType: 'application/fhir+json' }
}

async function handleScheduleAppointment(
  taskId: string,
  params: { patientHandle: string; practiceHandle?: string; token?: string }
): Promise<A2ATask> {
  const task: A2ATask = {
    id: taskId,
    status: { state: 'working', timestamp: new Date().toISOString() },
    history: [{ state: 'submitted', timestamp: new Date().toISOString() }],
  }
  activeTasks.set(taskId, task)

  try {
    const grants = await boloFetch<Array<{
      id: string; grantorHandle: string; widget: string; scopes: string[]; note: string | null; isActive: boolean
    }>>('/grants?direction=received', { token: params.token })

    const eligibleGrants = grants.filter(
      (g) =>
        g.isActive &&
        g.widget === WIDGET_SLUG &&
        g.scopes.some((s) => s.startsWith('appointments:'))
    )

    if (eligibleGrants.length === 0) {
      task.status = {
        state: 'completed',
        message: { role: 'agent', parts: [textPart('No eligible grants with appointment scopes found.')] },
        timestamp: new Date().toISOString(),
      }
      return task
    }

    const booked: A2AArtifact[] = []

    for (const grant of eligibleGrants) {
      if (params.practiceHandle && grant.grantorHandle !== params.practiceHandle.replace(/^@/, '')) {
        continue
      }

      const policy = parsePolicy(grant.note)
      if (!policy?.autoBook) continue

      const slot = findNextSlot(policy)
      if (!slot) continue

      const result = await boloFetch<{ id: string }>('/relay/send', {
        method: 'POST',
        body: {
          recipientHandle: grant.grantorHandle,
          content: `Auto-booked: Session on ${slot.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })} at ${slot.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`,
          widgetSlug: WIDGET_SLUG,
          metadata: {
            type: 'appointment',
            autoBooked: true,
            dateTime: slot.toISOString(),
            duration: 60,
            policyApplied: true,
          },
        },
        token: params.token,
      })

      const fhir = fhirAppointment({
        id: result.id,
        patientHandle: grant.grantorHandle,
        practiceHandle: 'self',
        dateTime: slot.toISOString(),
        duration: 60,
      })

      booked.push({
        name: `appointment-${grant.grantorHandle}`,
        description: `Appointment booked for @${grant.grantorHandle}`,
        parts: [dataPart(fhir)],
      })
    }

    task.artifacts = booked
    task.status = {
      state: 'completed',
      message: {
        role: 'agent',
        parts: [
          textPart(
            booked.length > 0
              ? `Successfully booked ${booked.length} appointment(s) within policy constraints.`
              : 'No appointments booked — no eligible grants with auto-book policies found.'
          ),
        ],
      },
      timestamp: new Date().toISOString(),
    }
  } catch (error: unknown) {
    task.status = {
      state: 'failed',
      message: { role: 'agent', parts: [textPart(`Error: ${error instanceof Error ? error.message : String(error)}`)] },
      timestamp: new Date().toISOString(),
    }
  }

  return task
}

async function handleReadVitals(
  taskId: string,
  params: { patientHandle: string; vitalType?: string; token?: string }
): Promise<A2ATask> {
  const task: A2ATask = {
    id: taskId,
    status: { state: 'working', timestamp: new Date().toISOString() },
    history: [{ state: 'submitted', timestamp: new Date().toISOString() }],
  }
  activeTasks.set(taskId, task)

  try {
    const inbox = await boloFetch<{ messages?: Array<{ id: string; metadata?: Record<string, unknown>; createdAt?: string }> }>(
      '/relay/inbox',
      { token: params.token }
    )

    const vitals = (inbox.messages || [])
      .filter((m) => m.metadata?.type === 'vital')
      .filter((m) => !params.vitalType || m.metadata?.vitalType === params.vitalType)
      .map((m) =>
        fhirObservation({
          id: m.id,
          patientHandle: params.patientHandle,
          type: (m.metadata?.vitalType as string) || 'temperature',
          value: String(m.metadata?.value || '0'),
          unit: (m.metadata?.unit as string) || '',
        })
      )

    task.artifacts = [
      {
        name: 'vitals-bundle',
        description: `${vitals.length} vital sign reading(s)`,
        parts: [dataPart({ resourceType: 'Bundle', type: 'searchset', total: vitals.length, entry: vitals.map((v) => ({ resource: v })) })],
      },
    ]
    task.status = {
      state: 'completed',
      message: { role: 'agent', parts: [textPart(`Retrieved ${vitals.length} vital reading(s) for ${params.patientHandle}.`)] },
      timestamp: new Date().toISOString(),
    }
  } catch (error: unknown) {
    task.status = {
      state: 'failed',
      message: { role: 'agent', parts: [textPart(`Error: ${error instanceof Error ? error.message : String(error)}`)] },
      timestamp: new Date().toISOString(),
    }
  }

  return task
}

async function handleCheckPermission(
  taskId: string,
  params: { patientHandle: string; scope: string; token?: string }
): Promise<A2ATask> {
  const task: A2ATask = {
    id: taskId,
    status: { state: 'working', timestamp: new Date().toISOString() },
  }
  activeTasks.set(taskId, task)

  try {
    const access = await boloFetch<{ widgets?: Array<{ status: string; scopes?: string[] }> }>(
      `/access/check?handle=${params.patientHandle.replace(/^@/, '')}`,
      { token: params.token }
    )
    const granted = access.widgets?.some(
      (w) => w.status === 'granted' && w.scopes?.includes(params.scope)
    )

    task.status = {
      state: 'completed',
      message: {
        role: 'agent',
        parts: [textPart(`Permission ${params.scope} for ${params.patientHandle}: ${granted ? 'GRANTED' : 'NOT GRANTED'}`)],
      },
      timestamp: new Date().toISOString(),
    }
    task.artifacts = [{ name: 'permission-check', parts: [dataPart({ granted, scope: params.scope, patientHandle: params.patientHandle })] }]
  } catch (error: unknown) {
    task.status = {
      state: 'failed',
      message: { role: 'agent', parts: [textPart(`Error: ${error instanceof Error ? error.message : String(error)}`)] },
      timestamp: new Date().toISOString(),
    }
  }

  return task
}

// --- JSON-RPC Handler ---

interface JsonRpcRequest {
  jsonrpc: '2.0'
  id: string | number
  method: string
  params?: Record<string, unknown>
}

function jsonRpcResponse(id: string | number, result: unknown) {
  return { jsonrpc: '2.0', id, result }
}

function jsonRpcError(id: string | number, code: number, message: string) {
  return { jsonrpc: '2.0', id, error: { code, message } }
}

async function handleRpc(req: JsonRpcRequest) {
  const taskId = createTaskId()
  const p = req.params || {}

  switch (req.method) {
    case 'tasks/send': {
      const message = p.message as A2AMessage | undefined
      if (!message?.parts?.length) {
        return jsonRpcError(req.id, -32602, 'Message with parts required')
      }

      const textContent = message.parts.find((p) => p.type === 'text')?.text || ''
      const dataContent = message.parts.find((p) => p.type === 'data')?.data as Record<string, unknown> | undefined
      const patientHandle = (dataContent?.patientHandle as string) || ''
      const token = (dataContent?.boloToken as string) || undefined

      if (textContent.toLowerCase().includes('schedule') || textContent.toLowerCase().includes('book') || textContent.toLowerCase().includes('appointment')) {
        const task = await handleScheduleAppointment(taskId, {
          patientHandle,
          practiceHandle: dataContent?.practiceHandle as string,
          token,
        })
        return jsonRpcResponse(req.id, task)
      }

      if (textContent.toLowerCase().includes('vital') || textContent.toLowerCase().includes('reading')) {
        const task = await handleReadVitals(taskId, {
          patientHandle,
          vitalType: dataContent?.vitalType as string,
          token,
        })
        return jsonRpcResponse(req.id, task)
      }

      if (textContent.toLowerCase().includes('permission') || textContent.toLowerCase().includes('access') || textContent.toLowerCase().includes('grant')) {
        const task = await handleCheckPermission(taskId, {
          patientHandle,
          scope: (dataContent?.scope as string) || 'appointments:read',
          token,
        })
        return jsonRpcResponse(req.id, task)
      }

      return jsonRpcResponse(req.id, {
        id: taskId,
        status: {
          state: 'completed',
          message: {
            role: 'agent',
            parts: [
              textPart(
                'I can help with: scheduling appointments, reading vitals, and checking permissions. Please specify what you need along with the patient handle.'
              ),
            ],
          },
          timestamp: new Date().toISOString(),
        },
      })
    }

    case 'tasks/get': {
      const id = p.id as string
      const task = activeTasks.get(id)
      if (!task) return jsonRpcError(req.id, -32001, `Task ${id} not found`)
      return jsonRpcResponse(req.id, task)
    }

    case 'tasks/cancel': {
      const id = p.id as string
      const task = activeTasks.get(id)
      if (!task) return jsonRpcError(req.id, -32001, `Task ${id} not found`)
      task.status = { state: 'canceled', timestamp: new Date().toISOString() }
      return jsonRpcResponse(req.id, task)
    }

    default:
      return jsonRpcError(req.id, -32601, `Method not found: ${req.method}`)
  }
}

// --- HTTP Server ---

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    req.on('data', (c: Buffer) => chunks.push(c))
    req.on('end', () => resolve(Buffer.concat(chunks).toString()))
    req.on('error', reject)
  })
}

function sendJson(res: ServerResponse, status: number, data: unknown) {
  const body = JSON.stringify(data, null, 2)
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  })
  res.end(body)
}

const agentCard = JSON.parse(readFileSync(join(__dirname, 'agent-card.json'), 'utf-8'))

const httpServer = createServer(async (req, res) => {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    })
    res.end()
    return
  }

  if (req.url === '/.well-known/agent.json' && req.method === 'GET') {
    return sendJson(res, 200, agentCard)
  }

  if (req.url === '/health' && req.method === 'GET') {
    return sendJson(res, 200, { status: 'healthy', agent: 'bomed-autobook', version: '1.0.0' })
  }

  if (req.method === 'POST' && (req.url === '/' || req.url === '/a2a')) {
    try {
      const body = await readBody(req)
      const rpcReq = JSON.parse(body) as JsonRpcRequest
      if (rpcReq.jsonrpc !== '2.0' || !rpcReq.method) {
        return sendJson(res, 400, jsonRpcError(rpcReq.id || 0, -32600, 'Invalid JSON-RPC request'))
      }
      const result = await handleRpc(rpcReq)
      return sendJson(res, 200, result)
    } catch (error: unknown) {
      return sendJson(res, 400, jsonRpcError(0, -32700, 'Parse error'))
    }
  }

  sendJson(res, 404, { error: 'Not found' })
})

httpServer.listen(PORT, () => {
  console.log(`=== BoMed A2A AutoBook Agent ===`)
  console.log(`Listening on port ${PORT}`)
  console.log(`Agent card: http://localhost:${PORT}/.well-known/agent.json`)
  console.log(`JSON-RPC:   POST http://localhost:${PORT}/`)
  console.log(`Health:     GET  http://localhost:${PORT}/health`)
  console.log(`API:        ${BASE_URL}`)
  console.log('')
})
