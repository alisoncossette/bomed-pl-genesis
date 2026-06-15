// SHARP (SMART Health Application & Resource Protocol) context extraction
// Prompt Opinion's extension for propagating patient context through MCP tool chains
//
// SHARP context arrives as parameters in MCP tool calls, providing:
// - Patient identification (handle, FHIR patient ID)
// - FHIR server connection (base URL, access token)
// - Session metadata (launch context, user role)

export interface SharpContext {
  patientId: string
  patientHandle: string
  fhirServerUrl?: string
  fhirAccessToken?: string
  boloToken?: string
  userRole?: 'patient' | 'provider' | 'agent'
  launchContext?: string
  sessionId?: string
}

export function extractSharpContext(args: Record<string, unknown>): SharpContext {
  const sharpPrefix = 'sharp_'

  const patientId =
    (args[`${sharpPrefix}patient_id`] as string) ||
    (args.patientId as string) ||
    (args.patient_id as string) ||
    ''

  const patientHandle =
    (args[`${sharpPrefix}patient_handle`] as string) ||
    (args.patientHandle as string) ||
    (args.handle as string) ||
    patientId

  return {
    patientId: patientId.replace(/^@/, ''),
    patientHandle: patientHandle.startsWith('@') ? patientHandle : `@${patientHandle}`,
    fhirServerUrl:
      (args[`${sharpPrefix}fhir_server`] as string) ||
      (args.fhirServerUrl as string) ||
      undefined,
    fhirAccessToken:
      (args[`${sharpPrefix}fhir_token`] as string) ||
      (args.fhirAccessToken as string) ||
      undefined,
    boloToken:
      (args[`${sharpPrefix}bolo_token`] as string) ||
      (args.boloToken as string) ||
      undefined,
    userRole:
      ((args[`${sharpPrefix}user_role`] as string) ||
        (args.userRole as string) ||
        'patient') as SharpContext['userRole'],
    launchContext:
      (args[`${sharpPrefix}launch`] as string) ||
      (args.launchContext as string) ||
      undefined,
    sessionId:
      (args[`${sharpPrefix}session`] as string) ||
      (args.sessionId as string) ||
      undefined,
  }
}

export function validateSharpContext(ctx: SharpContext): string | null {
  if (!ctx.patientId) return 'Missing patient identifier (patientId or sharp_patient_id required)'
  return null
}

// Build SHARP-compliant response metadata
export function sharpResponseMeta(ctx: SharpContext) {
  return {
    sharp_patient_id: ctx.patientId,
    sharp_patient_handle: ctx.patientHandle,
    ...(ctx.fhirServerUrl ? { sharp_fhir_server: ctx.fhirServerUrl } : {}),
    ...(ctx.sessionId ? { sharp_session: ctx.sessionId } : {}),
  }
}
