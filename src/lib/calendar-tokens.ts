// In-memory token store — resets on server restart, fine for demo
export const calendarTokens = new Map<string, {
  access_token: string
  refresh_token?: string
  expiry_date?: number
}>()
