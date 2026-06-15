import { NextResponse } from 'next/server'
import agentCard from '../../../../agents/a2a-autobook/agent-card.json'

export async function GET() {
  return NextResponse.json(agentCard)
}
