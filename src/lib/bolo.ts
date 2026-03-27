const API_KEY = process.env.BOLO_API_KEY || ''
const BASE_URL = process.env.BOLO_API_URL || 'https://api.bolospot.com'

export async function boloFetch<T>(endpoint: string, options?: { method?: string; body?: unknown }): Promise<T> {
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

export function getBoloClient() {
  return {
    lookupHandle: async (handle: string) => {
      try {
        const data = await boloFetch<{ exists: boolean }>(`/users/lookup?handle=${handle}`)
        return data
      } catch {
        return { exists: false }
      }
    },
    relayInbox: async () => {
      try {
        const data = await boloFetch<{ messages: any[] }>('/relay/inbox')
        return data
      } catch {
        return { messages: [] }
      }
    },
    relaySend: async (params: {
      recipientHandle: string
      content: string
      widgetSlug: string
      metadata?: Record<string, any>
    }) => {
      return boloFetch<{ id: string }>('/relay/send', {
        method: 'POST',
        body: params,
      })
    },
    requestAccess: async (params: {
      targetHandle: string
      widget: string
      scopes: string[]
      reason?: string
    }) => {
      return boloFetch<{ id: string }>('/access/request', {
        method: 'POST',
        body: params,
      })
    },
    createGrant: async (params: {
      granteeHandle: string
      widget: string
      scopes: string[]
      expiresAt?: string
      note?: string
    }) => {
      return boloFetch<{ id: string }>('/grants', {
        method: 'POST',
        body: params,
      })
    },
  }
}
