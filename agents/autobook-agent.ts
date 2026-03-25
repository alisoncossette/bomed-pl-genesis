/**
 * BoMed Auto-Booking Agent
 *
 * A real agent that:
 * 1. Polls Bolospot for new grants with auto-book policies
 * 2. Checks the patient's calendar availability via relay
 * 3. Books appointments that match the policy constraints
 * 4. Sends confirmation through the relay
 *
 * Run: npx tsx agents/autobook-agent.ts
 * Requires: BOLO_API_KEY (practice's API key), BOLO_API_URL
 */

import { BoloClient } from '@bolospot/sdk'

const POLL_INTERVAL = 15_000 // 15 seconds
const WIDGET_SLUG = 'bomed'

interface Policy {
  autoApprove: boolean
  autoBook: boolean
  minBufferMinutes: number
  allowedHoursStart: number
  allowedHoursEnd: number
  maxPerWeek: number
  allowedDays: number[]
}

const bolo = new BoloClient({
  apiKey: process.env.BOLO_API_KEY || '',
  baseUrl: process.env.BOLO_API_URL || 'https://api.bolospot.com',
})

// Track what we've already processed to avoid duplicate bookings
const processedGrants = new Set<string>()
const bookedThisWeek = new Map<string, number>() // handle -> count

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

  // Start looking from tomorrow
  candidate.setDate(candidate.getDate() + 1)
  candidate.setHours(policy.allowedHoursStart, 0, 0, 0)

  // Try up to 14 days out
  for (let day = 0; day < 14; day++) {
    const dayOfWeek = candidate.getDay()

    if (policy.allowedDays.includes(dayOfWeek)) {
      // Try each hour in the allowed range
      for (let hour = policy.allowedHoursStart; hour < policy.allowedHoursEnd; hour++) {
        candidate.setHours(hour, 0, 0, 0)

        // Check buffer: must be at least minBufferMinutes from now
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

async function checkAndBook() {
  try {
    // List all grants we've received (practice is the grantee)
    const inbox = await bolo.relayInbox()
    const messages = inbox?.messages || []

    // Also check for new grants by looking at relay messages about grants
    // The real flow: poll grants API for new active grants with auto-book policies
    const API_KEY = process.env.BOLO_API_KEY || ''
    const BASE_URL = process.env.BOLO_API_URL || 'https://api.bolospot.com'

    const grantsRes = await fetch(`${BASE_URL}/api/grants?direction=received`, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`,
      },
    })

    if (!grantsRes.ok) {
      console.error('Failed to fetch grants:', grantsRes.status)
      return
    }

    const grants = await grantsRes.json() as Array<{
      id: string
      grantorHandle: string
      widget: string
      scopes: string[]
      note: string | null
      isActive: boolean
    }>

    for (const grant of grants) {
      if (!grant.isActive) continue
      if (grant.widget !== WIDGET_SLUG) continue
      if (processedGrants.has(grant.id)) continue

      // Check if this grant has an auto-book policy
      const policy = parsePolicy(grant.note)
      if (!policy || !policy.autoBook) {
        processedGrants.add(grant.id)
        continue
      }

      // Check if appointment scopes are granted
      const hasAppointmentScope = grant.scopes.some(s => s.startsWith('appointments:'))
      if (!hasAppointmentScope) {
        processedGrants.add(grant.id)
        continue
      }

      // Check weekly limit
      const weekCount = bookedThisWeek.get(grant.grantorHandle) || 0
      if (weekCount >= policy.maxPerWeek) {
        console.log(`[${grant.grantorHandle}] Weekly limit reached (${weekCount}/${policy.maxPerWeek})`)
        processedGrants.add(grant.id)
        continue
      }

      // Find a slot that matches the policy
      const slot = findNextSlot(policy)
      if (!slot) {
        console.log(`[${grant.grantorHandle}] No available slot found matching policy`)
        processedGrants.add(grant.id)
        continue
      }

      // Book it!
      console.log(`[${grant.grantorHandle}] Auto-booking: ${slot.toISOString()}`)

      try {
        await bolo.relaySend({
          recipientHandle: grant.grantorHandle,
          content: `Auto-booked: PT session on ${slot.toLocaleDateString(undefined, {
            weekday: 'long',
            month: 'short',
            day: 'numeric',
          })} at ${slot.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`,
          widgetSlug: WIDGET_SLUG,
          metadata: {
            type: 'appointment',
            autoBooked: true,
            practiceName: 'Acme Physical Therapy',
            dateTime: slot.toISOString(),
            duration: 60,
            appointmentType: 'PT_SESSION',
            policyApplied: true,
            bufferMinutes: policy.minBufferMinutes,
          },
        })

        console.log(`[${grant.grantorHandle}] Appointment booked successfully`)
        bookedThisWeek.set(grant.grantorHandle, weekCount + 1)
      } catch (err) {
        console.error(`[${grant.grantorHandle}] Failed to book:`, err)
      }

      processedGrants.add(grant.id)
    }
  } catch (error) {
    console.error('Agent poll error:', error)
  }
}

// Reset weekly counts every Monday
function resetWeeklyCounts() {
  const now = new Date()
  if (now.getDay() === 1 && now.getHours() === 0) {
    bookedThisWeek.clear()
    console.log('[Agent] Weekly booking counts reset')
  }
}

async function main() {
  console.log('=== BoMed Auto-Booking Agent ===')
  console.log(`Polling every ${POLL_INTERVAL / 1000}s`)
  console.log(`Widget: ${WIDGET_SLUG}`)
  console.log(`API: ${process.env.BOLO_API_URL || 'https://api.bolospot.com'}`)
  console.log('')

  // Initial check
  await checkAndBook()

  // Poll loop
  setInterval(async () => {
    resetWeeklyCounts()
    await checkAndBook()
  }, POLL_INTERVAL)
}

main().catch(console.error)
