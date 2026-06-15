// FHIR R4 resource builders for BoMed healthcare data

export interface FhirResource {
  resourceType: string
  id?: string
  meta?: { profile?: string[]; lastUpdated?: string }
  [key: string]: unknown
}

// --- FHIR Patient ---

export function buildPatient(params: {
  handle: string
  nullifierHash?: string
  name?: string
  verified?: boolean
}): FhirResource {
  return {
    resourceType: 'Patient',
    id: params.handle.replace(/^@/, ''),
    meta: {
      profile: ['http://hl7.org/fhir/us/core/StructureDefinition/us-core-patient'],
      lastUpdated: new Date().toISOString(),
    },
    identifier: [
      {
        system: 'https://bomed.ai/handle',
        value: params.handle.startsWith('@') ? params.handle : `@${params.handle}`,
      },
      ...(params.nullifierHash
        ? [{ system: 'https://worldcoin.org/nullifier', value: params.nullifierHash }]
        : []),
    ],
    active: true,
    name: params.name ? [{ text: params.name }] : [{ text: params.handle.replace(/^@/, '') }],
    extension: [
      {
        url: 'https://bomed.ai/fhir/StructureDefinition/world-id-verified',
        valueBoolean: params.verified ?? false,
      },
    ],
  }
}

// --- FHIR Observation (vital signs) ---

const VITAL_LOINC: Record<string, { code: string; display: string; unit: string; ucum: string }> = {
  temperature: { code: '8310-5', display: 'Body temperature', unit: '°F', ucum: '[degF]' },
  heart_rate: { code: '8867-4', display: 'Heart rate', unit: 'bpm', ucum: '/min' },
  oxygen: { code: '2708-6', display: 'Oxygen saturation', unit: '%', ucum: '%' },
  blood_pressure_systolic: {
    code: '8480-6',
    display: 'Systolic blood pressure',
    unit: 'mmHg',
    ucum: 'mm[Hg]',
  },
  blood_pressure_diastolic: {
    code: '8462-4',
    display: 'Diastolic blood pressure',
    unit: 'mmHg',
    ucum: 'mm[Hg]',
  },
}

export function buildObservation(params: {
  id: string
  patientHandle: string
  type: string
  value: string
  unit?: string
  timestamp?: string
  deviceName?: string
}): FhirResource {
  const loinc = VITAL_LOINC[params.type] || VITAL_LOINC.temperature
  const isBP = params.type === 'blood_pressure'

  const base: FhirResource = {
    resourceType: 'Observation',
    id: params.id,
    meta: {
      profile: ['http://hl7.org/fhir/us/core/StructureDefinition/us-core-vital-signs'],
    },
    status: 'final',
    category: [
      {
        coding: [
          {
            system: 'http://terminology.hl7.org/CodeSystem/observation-category',
            code: 'vital-signs',
            display: 'Vital Signs',
          },
        ],
      },
    ],
    subject: { reference: `Patient/${params.patientHandle.replace(/^@/, '')}` },
    effectiveDateTime: params.timestamp || new Date().toISOString(),
    device: params.deviceName
      ? { display: params.deviceName }
      : undefined,
  }

  if (isBP) {
    const parts = params.value.split('/')
    const systolic = parseFloat(parts[0]) || 120
    const diastolic = parseFloat(parts[1]) || 80
    base.code = {
      coding: [{ system: 'http://loinc.org', code: '85354-9', display: 'Blood pressure panel' }],
    }
    base.component = [
      {
        code: {
          coding: [
            { system: 'http://loinc.org', code: '8480-6', display: 'Systolic blood pressure' },
          ],
        },
        valueQuantity: {
          value: systolic,
          unit: 'mmHg',
          system: 'http://unitsofmeasure.org',
          code: 'mm[Hg]',
        },
      },
      {
        code: {
          coding: [
            { system: 'http://loinc.org', code: '8462-4', display: 'Diastolic blood pressure' },
          ],
        },
        valueQuantity: {
          value: diastolic,
          unit: 'mmHg',
          system: 'http://unitsofmeasure.org',
          code: 'mm[Hg]',
        },
      },
    ]
  } else {
    const numericValue = parseFloat(params.value)
    base.code = {
      coding: [{ system: 'http://loinc.org', code: loinc.code, display: loinc.display }],
    }
    base.valueQuantity = {
      value: isNaN(numericValue) ? 0 : numericValue,
      unit: params.unit || loinc.unit,
      system: 'http://unitsofmeasure.org',
      code: loinc.ucum,
    }
  }

  return base
}

// --- FHIR Appointment ---

const SERVICE_TYPE_SNOMED: Record<string, { code: string; display: string }> = {
  PT_SESSION: { code: '409073007', display: 'Education' },
  OT_SESSION: { code: '409073007', display: 'Education' },
  SLP_SESSION: { code: '409073007', display: 'Education' },
  GENERAL: { code: '394802001', display: 'General medicine' },
  FOLLOW_UP: { code: '394802001', display: 'General medicine' },
}

export function buildAppointment(params: {
  id: string
  patientHandle: string
  practiceHandle: string
  practiceName?: string
  dateTime: string
  duration: number
  type?: string
  status?: string
  autoBooked?: boolean
}): FhirResource {
  const serviceType = SERVICE_TYPE_SNOMED[params.type || 'GENERAL'] || SERVICE_TYPE_SNOMED.GENERAL
  const start = new Date(params.dateTime)
  const end = new Date(start.getTime() + params.duration * 60000)

  return {
    resourceType: 'Appointment',
    id: params.id,
    meta: { lastUpdated: new Date().toISOString() },
    status: params.status || 'booked',
    serviceType: [
      { coding: [{ system: 'http://snomed.info/sct', ...serviceType }] },
    ],
    start: start.toISOString(),
    end: end.toISOString(),
    minutesDuration: params.duration,
    participant: [
      {
        actor: {
          reference: `Patient/${params.patientHandle.replace(/^@/, '')}`,
          display: params.patientHandle,
        },
        status: 'accepted',
      },
      {
        actor: {
          reference: `Practitioner/${params.practiceHandle.replace(/^@/, '')}`,
          display: params.practiceName || params.practiceHandle,
        },
        status: 'accepted',
      },
    ],
    extension: params.autoBooked
      ? [
          {
            url: 'https://bomed.ai/fhir/StructureDefinition/auto-booked',
            valueBoolean: true,
          },
        ]
      : undefined,
  }
}

// --- FHIR Consent (permission grant) ---

const SCOPE_TO_FHIR_CLASS: Record<string, { system: string; code: string; display: string }> = {
  'appointments:read': {
    system: 'http://hl7.org/fhir/resource-types',
    code: 'Appointment',
    display: 'Appointment',
  },
  'appointments:request': {
    system: 'http://hl7.org/fhir/resource-types',
    code: 'Appointment',
    display: 'Appointment',
  },
  'insurance:read': {
    system: 'http://hl7.org/fhir/resource-types',
    code: 'Coverage',
    display: 'Coverage',
  },
  'insurance:transmit': {
    system: 'http://hl7.org/fhir/resource-types',
    code: 'Coverage',
    display: 'Coverage',
  },
  'demographics:read': {
    system: 'http://hl7.org/fhir/resource-types',
    code: 'Patient',
    display: 'Patient',
  },
  'vitals:write': {
    system: 'http://hl7.org/fhir/resource-types',
    code: 'Observation',
    display: 'Observation',
  },
  'vitals:read': {
    system: 'http://hl7.org/fhir/resource-types',
    code: 'Observation',
    display: 'Observation',
  },
  'records:read': {
    system: 'http://hl7.org/fhir/resource-types',
    code: 'DocumentReference',
    display: 'DocumentReference',
  },
}

export function buildConsent(params: {
  id: string
  patientHandle: string
  practiceHandle: string
  scopes: string[]
  isActive: boolean
  createdAt: string
  expiresAt?: string | null
  policy?: Record<string, unknown>
}): FhirResource {
  const fhirClasses = params.scopes
    .map((s) => SCOPE_TO_FHIR_CLASS[s])
    .filter(Boolean)
    // Deduplicate by code
    .filter((v, i, arr) => arr.findIndex((x) => x.code === v.code) === i)

  return {
    resourceType: 'Consent',
    id: params.id,
    meta: { lastUpdated: new Date().toISOString() },
    status: params.isActive ? 'active' : 'inactive',
    scope: {
      coding: [
        {
          system: 'http://terminology.hl7.org/CodeSystem/consentscope',
          code: 'patient-privacy',
          display: 'Privacy Consent',
        },
      ],
    },
    category: [
      {
        coding: [
          {
            system: 'http://loinc.org',
            code: '59284-0',
            display: 'Consent Document',
          },
        ],
      },
    ],
    patient: { reference: `Patient/${params.patientHandle.replace(/^@/, '')}` },
    dateTime: params.createdAt,
    performer: [{ reference: `Patient/${params.patientHandle.replace(/^@/, '')}` }],
    organization: [
      {
        reference: `Organization/${params.practiceHandle.replace(/^@/, '')}`,
        display: params.practiceHandle,
      },
    ],
    provision: {
      type: 'permit',
      period: {
        start: params.createdAt,
        ...(params.expiresAt ? { end: params.expiresAt } : {}),
      },
      action: [
        {
          coding: [
            {
              system: 'http://terminology.hl7.org/CodeSystem/consentaction',
              code: 'access',
              display: 'Access',
            },
          ],
        },
      ],
      class: fhirClasses.map((c) => ({ coding: [c] })),
    },
    extension: [
      {
        url: 'https://bomed.ai/fhir/StructureDefinition/bomed-scopes',
        valueString: JSON.stringify(params.scopes),
      },
      ...(params.policy
        ? [
            {
              url: 'https://bomed.ai/fhir/StructureDefinition/scheduling-policy',
              valueString: JSON.stringify(params.policy),
            },
          ]
        : []),
    ],
  }
}

// --- FHIR Coverage (insurance) ---

export function buildCoverage(params: {
  patientHandle: string
  payorName?: string
  planName?: string
  memberId?: string
  groupNumber?: string
}): FhirResource {
  return {
    resourceType: 'Coverage',
    id: `coverage-${params.patientHandle.replace(/^@/, '')}`,
    meta: {
      profile: ['http://hl7.org/fhir/us/core/StructureDefinition/us-core-coverage'],
    },
    status: 'active',
    type: {
      coding: [
        {
          system: 'http://terminology.hl7.org/CodeSystem/v3-ActCode',
          code: 'HIP',
          display: 'health insurance plan policy',
        },
      ],
    },
    subscriber: { reference: `Patient/${params.patientHandle.replace(/^@/, '')}` },
    beneficiary: { reference: `Patient/${params.patientHandle.replace(/^@/, '')}` },
    payor: [{ display: params.payorName || 'Aetna' }],
    class: [
      {
        type: {
          coding: [
            { system: 'http://terminology.hl7.org/CodeSystem/coverage-class', code: 'plan' },
          ],
        },
        value: params.planName || 'PPO Gold',
        name: params.planName || 'PPO Gold',
      },
      ...(params.groupNumber
        ? [
            {
              type: {
                coding: [
                  {
                    system: 'http://terminology.hl7.org/CodeSystem/coverage-class',
                    code: 'group',
                  },
                ],
              },
              value: params.groupNumber,
            },
          ]
        : []),
    ],
    identifier: params.memberId
      ? [{ system: `https://${(params.payorName || 'aetna').toLowerCase()}.com/member`, value: params.memberId }]
      : [],
  }
}

// --- FHIR Bundle ---

export function buildBundle(
  resources: FhirResource[],
  type: 'searchset' | 'collection' = 'searchset'
): FhirResource {
  return {
    resourceType: 'Bundle',
    type,
    total: resources.length,
    timestamp: new Date().toISOString(),
    entry: resources.map((r) => ({
      resource: r,
      fullUrl: r.id ? `urn:uuid:${r.id}` : undefined,
    })),
  }
}
