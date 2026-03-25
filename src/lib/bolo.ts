import { BoloClient } from '@bolospot/sdk'

const API_KEY = process.env.BOLO_API_KEY || ''
const BASE_URL = process.env.BOLO_API_URL || 'https://api.bolospot.com'

let _client: BoloClient | null = null

export function getBoloClient(): BoloClient {
  if (!_client) {
    _client = new BoloClient({
      apiKey: API_KEY,
      baseUrl: BASE_URL,
    })
  }
  return _client
}

// Direct API call helper for endpoints not yet in the SDK
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
