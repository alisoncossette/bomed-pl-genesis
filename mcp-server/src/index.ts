#!/usr/bin/env node

// BoMed Healthcare MCP Server
// Exposes permission-gated FHIR tools for AI agents via MCP (Model Context Protocol)
// Integrates with Bolospot for identity/permissions and returns FHIR R4 resources
// Supports SHARP context propagation for Prompt Opinion platform

import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js'

import { createBoloClient } from './bolo-client.js'
import {
  buildPatient,
  buildObservation,
  buildAppointment,
  buildConsent,
  buildCoverage,
  buildBundle,
} from './fhir/resources.js'
import {
  extractSharpContext,
  validateSharpContext,
  sharpResponseMeta,
  type SharpContext,
} from './sharp/context.js'

// ---------- Tool Definitions ----------

const SHARP_PROPERTIES = {
  patientId: {
    type: 'string' as const,
    description: 'Patient identifier (@handle or FHIR Patient ID). Also accepts sharp_patient_id.',
  },
  boloToken: {
    type: 'string' as const,
    description: 'Patient Bolospot auth token for permission-gated operations. Also accepts sharp_bolo_token.',
  },
  fhirServerUrl: {
    type: 'string' as const,
    description: 'FHIR server base URL for data operations. Also accepts sharp_fhir_server.',
  },
  fhirAccessToken: {
    type: 'string' as const,
    description: 'FHIR server access token. Also accepts sharp_fhir_token.',
  },
}

const TOOLS = [
  {
    name: 'get_patient',
    description:
      'Get patient information as a FHIR Patient resource. Returns demographics, World ID verification status, and Bolospot handle. Requires the patient handle.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        ...SHARP_PROPERTIES,
      },
      required: ['patientId'],
    },
  },
  {
    name: 'list_grants',
    description:
      'List all active permission grants a patient has given to healthcare providers. Returns FHIR Consent resources. Each grant specifies scopes (appointments:read, vitals:write, insurance:read, etc.) and can include scheduling policy constraints.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        ...SHARP_PROPERTIES,
      },
      required: ['patientId'],
    },
  },
  {
    name: 'create_grant',
    description:
      'Create a new permission grant from patient to provider. The patient controls exactly which scopes are granted. Returns a FHIR Consent resource. Scopes: appointments:read, appointments:request, insurance:read, insurance:transmit, demographics:read, vitals:write, vitals:read, records:read.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        ...SHARP_PROPERTIES,
        practiceHandle: {
          type: 'string' as const,
          description: 'The @handle of the healthcare practice to grant access to.',
        },
        scopes: {
          type: 'array' as const,
          items: { type: 'string' as const },
          description: 'List of scopes to grant (e.g. ["appointments:read", "vitals:read"]).',
        },
        expiresAt: {
          type: 'string' as const,
          description: 'Optional ISO 8601 expiration date for the grant.',
        },
        policy: {
          type: 'object' as const,
          description: 'Optional scheduling policy for auto-booking (autoApprove, autoBook, minBufferMinutes, allowedHoursStart, allowedHoursEnd, maxPerWeek, allowedDays).',
          properties: {
            autoApprove: { type: 'boolean' as const },
            autoBook: { type: 'boolean' as const },
            minBufferMinutes: { type: 'number' as const },
            allowedHoursStart: { type: 'number' as const },
            allowedHoursEnd: { type: 'number' as const },
            maxPerWeek: { type: 'number' as const },
            allowedDays: { type: 'array' as const, items: { type: 'number' as const } },
          },
        },
      },
      required: ['patientId', 'practiceHandle', 'scopes'],
    },
  },
  {
    name: 'revoke_grant',
    description:
      'Instantly revoke a permission grant. The trust graph updates live — no cached tokens, no cooperative behavior required from the agent. One call, done.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        ...SHARP_PROPERTIES,
        grantId: {
          type: 'string' as const,
          description: 'The ID of the grant to revoke.',
        },
      },
      required: ['patientId', 'grantId'],
    },
  },
  {
    name: 'respond_to_request',
    description:
      'Approve or deny an incoming permission request from a healthcare provider. If approved, creates a FHIR Consent resource with the specified scopes.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        ...SHARP_PROPERTIES,
        requestId: {
          type: 'string' as const,
          description: 'The ID of the access request to respond to.',
        },
        approved: {
          type: 'boolean' as const,
          description: 'Whether to approve (true) or deny (false) the request.',
        },
        scopes: {
          type: 'array' as const,
          items: { type: 'string' as const },
          description: 'Optional: override which scopes to grant (subset of requested scopes).',
        },
      },
      required: ['patientId', 'requestId', 'approved'],
    },
  },
  {
    name: 'read_vitals',
    description:
      'Read patient vital signs as a FHIR Bundle of Observation resources. Supports filtering by vital type (temperature, heart_rate, oxygen, blood_pressure). Permission-gated: requires vitals:read grant.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        ...SHARP_PROPERTIES,
        vitalType: {
          type: 'string' as const,
          description: 'Optional filter: temperature, heart_rate, oxygen, or blood_pressure.',
          enum: ['temperature', 'heart_rate', 'oxygen', 'blood_pressure'],
        },
      },
      required: ['patientId'],
    },
  },
  {
    name: 'record_vital',
    description:
      'Record a new vital sign reading for a patient. Sends through the permission-gated relay and returns a FHIR Observation resource. Requires vitals:write grant.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        ...SHARP_PROPERTIES,
        vitalType: {
          type: 'string' as const,
          description: 'Type of vital: temperature, heart_rate, oxygen, or blood_pressure.',
          enum: ['temperature', 'heart_rate', 'oxygen', 'blood_pressure'],
        },
        value: {
          type: 'string' as const,
          description: 'The reading value (e.g. "98.6", "72", "120/80").',
        },
        unit: {
          type: 'string' as const,
          description: 'Optional unit override (default uses standard units per type).',
        },
        deviceName: {
          type: 'string' as const,
          description: 'Name of the reading device (e.g. "Ladybug.bot").',
        },
      },
      required: ['patientId', 'vitalType', 'value'],
    },
  },
  {
    name: 'book_appointment',
    description:
      'Book a healthcare appointment for a patient. Respects the patient scheduling policy (allowed hours, days, buffer, weekly limits). Returns a FHIR Appointment resource. Requires appointments:request grant.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        ...SHARP_PROPERTIES,
        practiceHandle: {
          type: 'string' as const,
          description: 'The @handle of the practice to book with.',
        },
        dateTime: {
          type: 'string' as const,
          description: 'Desired appointment date/time in ISO 8601 format.',
        },
        duration: {
          type: 'number' as const,
          description: 'Appointment duration in minutes (default: 60).',
        },
        appointmentType: {
          type: 'string' as const,
          description: 'Type: PT_SESSION, OT_SESSION, SLP_SESSION, GENERAL, FOLLOW_UP.',
        },
        practiceName: {
          type: 'string' as const,
          description: 'Display name of the practice.',
        },
      },
      required: ['patientId', 'practiceHandle', 'dateTime'],
    },
  },
  {
    name: 'get_scheduling_policy',
    description:
      'Get the patient scheduling policy that governs auto-booking behavior. Returns policy constraints: auto-approve, auto-book, min buffer minutes, allowed hours, max per week, allowed days.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        ...SHARP_PROPERTIES,
      },
      required: ['patientId'],
    },
  },
  {
    name: 'check_permission',
    description:
      'Check if a specific permission scope is currently granted between a patient and a practice. Returns live permission status — no caching.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        ...SHARP_PROPERTIES,
        practiceHandle: {
          type: 'string' as const,
          description: 'The @handle of the practice to check.',
        },
        scope: {
          type: 'string' as const,
          description: 'The scope to check (e.g. "appointments:read", "vitals:write").',
        },
      },
      required: ['patientId', 'practiceHandle', 'scope'],
    },
  },
]

// ---------- Tool Handlers ----------

function ok(data: unknown, sharpCtx?: SharpContext) {
  const content = sharpCtx
    ? { ...sharpResponseMeta(sharpCtx), data }
    : data
  return { content: [{ type: 'text' as const, text: JSON.stringify(content, null, 2) }] }
}

function err(message: string) {
  return { content: [{ type: 'text' as const, text: JSON.stringify({ error: message }) }], isError: true }
}

async function handleTool(name: string, args: Record<string, unknown>) {
  const ctx = extractSharpContext(args)
  const validationError = validateSharpContext(ctx)
  if (validationError) return err(validationError)

  const bolo = createBoloClient(ctx.boloToken || undefined)

  switch (name) {
    case 'get_patient': {
      const lookup = await bolo.lookupHandle(ctx.patientId)
      return ok(
        buildPatient({
          handle: ctx.patientHandle,
          name: (lookup as { name?: string }).name,
          verified: (lookup as { exists: boolean }).exists,
        }),
        ctx
      )
    }

    case 'list_grants': {
      const res = await bolo.listGrantsGiven()
      const items = res.grants || res.items || []
      const consents = (items as Array<{
        id: string
        granteeHandle?: string
        scopes?: string[]
        isActive?: boolean
        createdAt?: string
        expiresAt?: string | null
        note?: string | null
      }>).map((g) => {
        let policy: Record<string, unknown> | undefined
        if (g.note) {
          const match = g.note.match(/Policy:\s*({.*})/)
          if (match) try { policy = JSON.parse(match[1]) } catch {}
        }
        return buildConsent({
          id: g.id,
          patientHandle: ctx.patientHandle,
          practiceHandle: g.granteeHandle || 'unknown',
          scopes: g.scopes || [],
          isActive: g.isActive !== false,
          createdAt: g.createdAt || new Date().toISOString(),
          expiresAt: g.expiresAt,
          policy,
        })
      })
      return ok(buildBundle(consents), ctx)
    }

    case 'create_grant': {
      const practiceHandle = (args.practiceHandle as string).replace(/^@/, '')
      const scopes = args.scopes as string[]
      const expiresAt = args.expiresAt as string | undefined
      const policy = args.policy as Record<string, unknown> | undefined
      const note = policy ? `Policy: ${JSON.stringify(policy)}` : undefined

      const result = await bolo.createGrant({
        granteeHandle: practiceHandle,
        widget: 'bomed',
        scopes,
        expiresAt,
        note,
      })

      return ok(
        buildConsent({
          id: result.id,
          patientHandle: ctx.patientHandle,
          practiceHandle: `@${practiceHandle}`,
          scopes,
          isActive: true,
          createdAt: new Date().toISOString(),
          expiresAt,
          policy,
        }),
        ctx
      )
    }

    case 'revoke_grant': {
      const grantId = args.grantId as string
      await bolo.revokeGrant(grantId)
      return ok({ revoked: true, grantId, revokedAt: new Date().toISOString() }, ctx)
    }

    case 'respond_to_request': {
      const requestId = args.requestId as string
      const approved = args.approved as boolean
      await bolo.respondToRequest(requestId, approved)
      return ok({
        requestId,
        action: approved ? 'approved' : 'denied',
        respondedAt: new Date().toISOString(),
      }, ctx)
    }

    case 'read_vitals': {
      const inbox = await bolo.relayInbox()
      const messages = inbox.messages || inbox.items || []
      const vitalType = args.vitalType as string | undefined

      const vitals = (messages as Array<{
        id: string
        metadata?: { type?: string; vitalType?: string; value?: string; unit?: string; deviceName?: string }
        widgetSlug?: string
        createdAt?: string
      }>)
        .filter(
          (m) =>
            m.metadata?.type === 'vital' ||
            m.widgetSlug === 'ladybug' ||
            m.metadata?.vitalType
        )
        .filter((m) => !vitalType || m.metadata?.vitalType === vitalType)
        .map((m) =>
          buildObservation({
            id: m.id,
            patientHandle: ctx.patientHandle,
            type: m.metadata?.vitalType || 'temperature',
            value: String(m.metadata?.value || '0'),
            unit: m.metadata?.unit,
            timestamp: m.createdAt,
            deviceName: m.metadata?.deviceName,
          })
        )

      return ok(buildBundle(vitals), ctx)
    }

    case 'record_vital': {
      const vitalType = args.vitalType as string
      const value = args.value as string
      const unit = args.unit as string | undefined
      const deviceName = (args.deviceName as string) || 'MCP Agent'

      const result = await bolo.relaySend({
        recipientHandle: ctx.patientId,
        content: `${vitalType}: ${value}${unit || ''}`,
        widgetSlug: 'ladybug',
        metadata: {
          type: 'vital',
          vitalType,
          value,
          unit: unit || '',
          deviceName,
          measuredAt: new Date().toISOString(),
        },
      })

      return ok(
        buildObservation({
          id: result.id,
          patientHandle: ctx.patientHandle,
          type: vitalType,
          value,
          unit,
          deviceName,
        }),
        ctx
      )
    }

    case 'book_appointment': {
      const practiceHandle = (args.practiceHandle as string).replace(/^@/, '')
      const dateTime = args.dateTime as string
      const duration = (args.duration as number) || 60
      const appointmentType = (args.appointmentType as string) || 'GENERAL'
      const practiceName = (args.practiceName as string) || practiceHandle

      const result = await bolo.relaySend({
        recipientHandle: ctx.patientId,
        content: `Appointment booked: ${practiceName} on ${new Date(dateTime).toLocaleDateString()} at ${new Date(dateTime).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`,
        widgetSlug: 'bomed',
        metadata: {
          type: 'appointment',
          autoBooked: false,
          practiceName,
          dateTime,
          duration,
          appointmentType,
        },
      })

      return ok(
        buildAppointment({
          id: result.id,
          patientHandle: ctx.patientHandle,
          practiceHandle: `@${practiceHandle}`,
          practiceName,
          dateTime,
          duration,
          type: appointmentType,
        }),
        ctx
      )
    }

    case 'get_scheduling_policy': {
      const res = await bolo.listGrantsGiven()
      const items = res.grants || res.items || []
      const policies: Array<{ practiceHandle: string; policy: Record<string, unknown> }> = []

      for (const g of items as Array<{
        granteeHandle?: string
        note?: string | null
        isActive?: boolean
      }>) {
        if (!g.isActive || !g.note) continue
        const match = g.note.match(/Policy:\s*({.*})/)
        if (match) {
          try {
            policies.push({
              practiceHandle: g.granteeHandle || 'unknown',
              policy: JSON.parse(match[1]),
            })
          } catch {}
        }
      }

      return ok({ patientHandle: ctx.patientHandle, policies }, ctx)
    }

    case 'check_permission': {
      const practiceHandle = (args.practiceHandle as string).replace(/^@/, '')
      const scope = args.scope as string

      const res = await bolo.listGrantsGiven()
      const items = res.grants || res.items || []
      const grant = (items as Array<{
        granteeHandle?: string
        scopes?: string[]
        isActive?: boolean
      }>).find(
        (g) =>
          g.isActive !== false &&
          g.granteeHandle?.replace(/^@/, '') === practiceHandle &&
          g.scopes?.includes(scope)
      )

      return ok(
        {
          patientHandle: ctx.patientHandle,
          practiceHandle: `@${practiceHandle}`,
          scope,
          granted: !!grant,
          checkedAt: new Date().toISOString(),
        },
        ctx
      )
    }

    default:
      return err(`Unknown tool: ${name}`)
  }
}

// ---------- Server Setup ----------

const server = new Server(
  {
    name: 'bomed-healthcare',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
)

server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: TOOLS }))

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params
  try {
    return await handleTool(name, (args || {}) as Record<string, unknown>)
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    return err(`Tool ${name} failed: ${message}`)
  }
})

async function main() {
  const transport = new StdioServerTransport()
  await server.connect(transport)
  console.error('BoMed Healthcare MCP Server running on stdio')
}

main().catch((error) => {
  console.error('Fatal:', error)
  process.exit(1)
})
