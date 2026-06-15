const API_KEY = process.env.BOLO_API_KEY || ''
const BASE_URL = process.env.BOLO_API_URL || 'https://api.bolospot.com'

export async function boloFetch<T>(
  endpoint: string,
  options?: { method?: string; body?: unknown; token?: string }
): Promise<T> {
  const { method = 'GET', body, token } = options || {}
  const url = `${BASE_URL}/api${endpoint}`
  const res = await fetch(url, {
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

export interface Grant {
  id: string
  grantorHandle?: string
  granteeHandle?: string
  widget: string
  widgetName?: string
  scopes: string[]
  note: string | null
  isActive: boolean
  createdAt: string
  expiresAt: string | null
}

export interface AccessRequest {
  id: string
  requesterHandle: string
  requesterName?: string
  widget: string
  widgetName?: string
  scopes: string[]
  reason?: string
  status: string
  createdAt: string
}

export interface RelayMessage {
  id: string
  senderHandle: string
  content: string
  widgetSlug: string
  metadata?: Record<string, unknown>
  createdAt: string
}

export function createBoloClient(token?: string) {
  const authToken = token || API_KEY

  return {
    listGrantsGiven: () =>
      boloFetch<{ grants?: Grant[]; items?: Grant[] }>('/grants/given', { token: authToken }),

    listGrantsReceived: () =>
      boloFetch<Grant[]>('/grants?direction=received', { token: authToken }),

    createGrant: (params: {
      granteeHandle: string
      widget: string
      scopes: string[]
      expiresAt?: string
      note?: string
    }) => boloFetch<{ id: string }>('/grants', { method: 'POST', body: params, token: authToken }),

    revokeGrant: (grantId: string) =>
      boloFetch<{ success: boolean }>(`/grants/${grantId}/revoke`, {
        method: 'POST',
        token: authToken,
      }),

    listRequests: () =>
      boloFetch<{ requests?: AccessRequest[]; items?: AccessRequest[] }>('/grants/requests', {
        token: authToken,
      }),

    respondToRequest: (requestId: string, approved: boolean) =>
      boloFetch<{ success: boolean }>(`/grants/requests/${requestId}`, {
        method: 'PATCH',
        body: { approve: approved },
        token: authToken,
      }),

    relayInbox: () =>
      boloFetch<{ messages?: RelayMessage[]; items?: RelayMessage[] }>('/relay/inbox', {
        token: authToken,
      }),

    relaySend: (params: {
      recipientHandle: string
      content: string
      widgetSlug: string
      metadata?: Record<string, unknown>
    }) =>
      boloFetch<{ id: string }>('/relay/send', { method: 'POST', body: params, token: authToken }),

    lookupHandle: async (handle: string) => {
      try {
        return await boloFetch<{ exists: boolean; name?: string }>(`/users/lookup?handle=${handle}`, {
          token: authToken,
        })
      } catch {
        return { exists: false }
      }
    },

    checkAccess: (handle: string) =>
      boloFetch<{ widgets?: Array<{ status: string; scopes?: string[] }> }>(
        `/access/check?handle=${handle.replace(/^@/, '')}`,
        { token: authToken }
      ),
  }
}
