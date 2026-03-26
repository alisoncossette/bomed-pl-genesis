// Patient session state
export interface PatientSession {
  worldIdVerified: boolean
  nullifierHash: string | null
  handle: string | null
  verificationLevel: 'orb' | 'device' | null
}

// Grant display model
export interface GrantDisplay {
  id: string
  granteeHandle: string
  granteeName: string
  widget: string
  widgetName: string
  scopes: string[]
  isActive: boolean
  createdAt: string
  expiresAt: string | null
}

// Incoming bolo request
export interface BoloRequest {
  id: string
  fromHandle: string
  fromName: string
  widget: string
  widgetName: string
  scopes: string[]
  reason: string
  status: 'pending' | 'approved' | 'denied'
  createdAt: string
}

// Appointment from relay
export interface PatientAppointment {
  id: string
  practiceHandle: string
  practiceName: string
  dateTime: string
  duration: number
  type: string
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed'
  notes: string | null
}

// Scope metadata for display
export const SCOPE_LABELS: Record<string, { label: string; description: string; icon: string }> = {
  'appointments:read': {
    label: 'View Appointments',
    description: 'See your scheduled appointments',
    icon: '📅',
  },
  'appointments:request': {
    label: 'Request Appointments',
    description: 'Send you appointment requests',
    icon: '📋',
  },
  'insurance:read': {
    label: 'Insurance Info',
    description: 'View your insurance card details',
    icon: '🏥',
  },
  'insurance:transmit': {
    label: 'Transmit Insurance',
    description: 'Send your health insurance info to a third party',
    icon: '📤',
  },
  'demographics:read': {
    label: 'Demographics',
    description: 'View your name, contact info',
    icon: '👤',
  },
  'vitals:write': {
    label: 'Write Vitals',
    description: 'Record vital signs (e.g., from devices)',
    icon: '❤️',
  },
  'vitals:read': {
    label: 'Read Vitals',
    description: 'View your recorded vital signs',
    icon: '📊',
  },
  'records:read': {
    label: 'Medical Records',
    description: 'Access your full medical records',
    icon: '📁',
  },
}
