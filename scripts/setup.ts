/**
 * Setup script — registers widgets and verifies accounts
 *
 * Run: npx tsx scripts/setup.ts
 *
 * Uses BOLO_API_KEY from .env.local (patient's key)
 * Uses BOLO_PRACTICE_API_KEY from .env.local (practice's key)
 */

import { BoloClient } from '@bolospot/sdk'
import { config } from 'dotenv'
config({ path: '.env.local' })

const PATIENT_KEY = process.env.BOLO_API_KEY || ''
const PRACTICE_KEY = process.env.BOLO_PRACTICE_API_KEY || ''
const BASE_URL = process.env.BOLO_API_URL || 'https://api.bolospot.com'

async function setup() {
  console.log('=== BoMed World Setup ===\n')

  if (!PATIENT_KEY) {
    console.error('Missing BOLO_API_KEY in .env.local (patient account)')
    process.exit(1)
  }

  // --- Patient account setup ---
  const patient = new BoloClient({ apiKey: PATIENT_KEY, baseUrl: BASE_URL })

  console.log('1. Checking patient account...')
  try {
    const lookup = await patient.lookupHandle('me')
    console.log(`   Patient handle: @${lookup.handle || '(unknown)'}`)
  } catch (e: any) {
    console.log(`   Patient lookup: ${e.message}`)
  }

  // --- Practice account setup ---
  if (PRACTICE_KEY) {
    const practice = new BoloClient({ apiKey: PRACTICE_KEY, baseUrl: BASE_URL })

    console.log('\n2. Checking practice account...')
    try {
      const lookup = await practice.lookupHandle('me')
      console.log(`   Practice handle: @${lookup.handle || '(unknown)'}`)
    } catch (e: any) {
      console.log(`   Practice lookup: ${e.message}`)
    }

    // Register bomed widget (from practice account)
    console.log('\n3. Registering "bomed" widget...')
    try {
      const widget = await practice.registerWidget({
        slug: 'bomed',
        name: 'BoMed Patient Portal',
        scopes: [
          'appointments:read',
          'appointments:request',
          'insurance:read',
          'vitals:write',
          'vitals:read',
        ],
        description: 'Healthcare scheduling and vitals for PT practices',
        icon: '🏥',
      })
      console.log(`   Registered: ${widget.slug} — ${widget.scopes.join(', ')}`)
    } catch (e: any) {
      if (e.message?.includes('409') || e.message?.includes('already')) {
        console.log('   Already registered (updating...)')
        try {
          await practice.updateWidget('bomed', {
            name: 'BoMed Patient Portal',
            scopes: [
              'appointments:read',
              'appointments:request',
              'insurance:read',
              'vitals:write',
              'vitals:read',
            ],
            description: 'Healthcare scheduling and vitals for PT practices',
            icon: '🏥',
          })
          console.log('   Updated successfully')
        } catch (e2: any) {
          console.log(`   Update failed: ${e2.message}`)
        }
      } else {
        console.log(`   Failed: ${e.message}`)
      }
    }

    // Register ladybug widget (from practice or patient — patient owns the robot)
    console.log('\n4. Registering "ladybug" widget...')
    try {
      const widget = await patient.registerWidget({
        slug: 'ladybug',
        name: 'Ladybug.bot',
        scopes: ['vitals:write', 'vitals:read'],
        description: 'Reading robot for vital signs — temperature, heart rate, SpO2',
        icon: '🐞',
      })
      console.log(`   Registered: ${widget.slug} — ${widget.scopes.join(', ')}`)
    } catch (e: any) {
      if (e.message?.includes('409') || e.message?.includes('already')) {
        console.log('   Already registered (updating...)')
        try {
          await patient.updateWidget('ladybug', {
            name: 'Ladybug.bot',
            scopes: ['vitals:write', 'vitals:read'],
            description: 'Reading robot for vital signs — temperature, heart rate, SpO2',
            icon: '🐞',
          })
          console.log('   Updated successfully')
        } catch (e2: any) {
          console.log(`   Update failed: ${e2.message}`)
        }
      } else {
        console.log(`   Failed: ${e.message}`)
      }
    }

    // List all widgets to verify
    console.log('\n5. Listing all widgets...')
    try {
      const widgets = await practice.listWidgets()
      for (const w of widgets) {
        console.log(`   ${w.icon || '•'} ${w.slug}: ${w.scopes.join(', ')}`)
      }
    } catch (e: any) {
      console.log(`   Failed: ${e.message}`)
    }
  } else {
    console.log('\n⚠ No BOLO_PRACTICE_API_KEY — skipping practice setup')
    console.log('  Add it to .env.local to register widgets')
  }

  console.log('\n=== Setup complete ===')
  console.log('\nNext steps:')
  console.log('  npm run dev                           → Start Mini App')
  console.log('  BOLO_API_KEY=$PRACTICE_KEY npm run agent:autobook   → Start auto-booking agent')
  console.log('  npm run agent:ladybug -- --patient @handle --continuous → Start Ladybug.bot')
}

setup().catch(console.error)
