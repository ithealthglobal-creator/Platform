import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8100'

async function verifySession(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (!authHeader) return null

  const token = authHeader.replace('Bearer ', '')
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token)
  if (error || !user) return null

  return { user, token }
}

export async function GET(request: NextRequest) {
  const session = await verifySession(request)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const params = new URLSearchParams()
  if (searchParams.get('conversation_id')) params.set('conversation_id', searchParams.get('conversation_id')!)
  if (searchParams.get('status')) params.set('status', searchParams.get('status')!)

  const response = await fetch(`${AI_SERVICE_URL}/executions?${params}`, {
    headers: {
      'Authorization': `Bearer ${session.token}`,
    },
  })

  const data = await response.json()
  return NextResponse.json(data, { status: response.status })
}
