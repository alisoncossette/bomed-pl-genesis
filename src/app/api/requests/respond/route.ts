import { NextRequest, NextResponse } from 'next/server'
import { getBoloClient } from '@/lib/bolo'
import { boloFetch } from '@/lib/bolo'

export async function POST(req: NextRequest) {
  try {
    const { requestId, approved, scopes, handle, policy } = await req.json()

    if (!requestId || !handle) {
      return NextResponse.json(
        { success: false, error: 'Request ID and handle required' },
        { status: 400 }
      )
    }

    if (approved && scopes && scopes.length > 0) {
      const bolo = getBoloClient()

      // Fetch the original request to get the requester's handle
      let granteeHandle = ''
      let widget = 'bomed'
      try {
        const request = await boloFetch<{
          id: string
          requesterHandle: string
          widget: string
        }>(`/access-requests/${requestId}`)
        granteeHandle = request.requesterHandle
        widget = request.widget || 'bomed'
      } catch {
        // If we can't fetch the request, fall back to the fromHandle passed from client
        console.warn('Could not fetch request details, using fallback')
      }

      if (!granteeHandle) {
        return NextResponse.json(
          { success: false, error: 'Could not determine requester handle' },
          { status: 400 }
        )
      }

      // Create the grant with the selected scopes and policy metadata
      const grantNote = policy
        ? `Approved via BoMed Patient Portal | Policy: ${JSON.stringify(policy)}`
        : 'Approved via BoMed Patient Portal'

      await bolo.createGrant({
        granteeHandle,
        widget,
        scopes,
        note: grantNote,
      })

      return NextResponse.json({ success: true, action: 'granted' })
    } else {
      // Deny — acknowledge the request without creating a grant
      // TODO: Bolospot API should support declining requests directly
      return NextResponse.json({ success: true, action: 'denied' })
    }
  } catch (error) {
    console.error('Respond error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to respond' },
      { status: 500 }
    )
  }
}
